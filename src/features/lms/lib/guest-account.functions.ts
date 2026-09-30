import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSiteUrl } from "@/lib/email/email-delivery.server";
import { PASSWORD_MIN } from "@/lib/auth/password-policy";

/*
 * A guest (a Supabase anonymous user) becomes a real account in one of two
 * ways, and keeps everything they did either way:
 * - creating an account converts the guest itself. The password is set at
 *   once, the email when they open the link we send (while the site requires
 *   email confirmation), then lms_finish_guest_upgrade makes it an ordinary
 *   learner and issues the certificates it was waiting for;
 * - signing in to an existing account merges the guest into it
 *   (lms_merge_guest). The guest's own access token proves the guest is theirs.
 */

type Lang = "ar" | "en";
type NewCertificate = { course_id: string; certificate_id: string };

const ARABIC_NAME_RE = /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;
const CONFIRM_HOURS = 24;
const langSchema = z.enum(["ar", "en"]);

const admin = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};
// The guest tables and functions are not in the generated types.
const untyped = async () => (await admin()) as unknown as SupabaseClient;
const authEmail = () => import("@/features/lms/lib/auth-email.server");

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** The caller must still be a guest. */
async function assertGuest(userId: string) {
  const db = await admin();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) throw new Error("SIGNUP_FAILED");
  if (!data.user.is_anonymous) throw new Error("NOT_A_GUEST");
  return data.user;
}

async function emailTaken(email: string) {
  const db = await untyped();
  const { data, error } = await db.rpc("lms_auth_email_taken", { _email: email });
  if (error) {
    console.error("email check failed", { message: error.message });
    throw new Error("SIGNUP_FAILED");
  }
  return data === true;
}

function failAuth(error: { code?: string; status?: number; message: string }): never {
  if (error.code === "email_exists" || /already.*registered/i.test(error.message)) {
    throw new Error("EMAIL_ALREADY_REGISTERED");
  }
  if (error.code === "weak_password")
    throw Object.assign(new Error(error.message), { code: "weak_password" });
  console.error("guest upgrade failed", {
    code: error.code,
    status: error.status,
    message: error.message,
  });
  throw new Error("SIGNUP_FAILED");
}

async function emailCertificates(userId: string, certificates: NewCertificate[], lang: Lang) {
  if (!certificates.length) return;
  const { deliverCertificateEmail } =
    await import("@/features/lms/certificates/lib/certificate-email.server");
  for (const c of certificates) {
    try {
      await deliverCertificateEmail({ studentId: userId, courseId: c.course_id, lang });
    } catch (e) {
      console.error("certificate email failed", {
        courseId: c.course_id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

type Upgrade = { email: string; fullName: string; asInstructor: boolean; lang: Lang };

/** Gives the guest its confirmed email and makes it an ordinary learner. */
async function completeUpgrade(userId: string, u: Upgrade) {
  const db = await admin();
  const { error } = await db.auth.admin.updateUserById(userId, {
    email: u.email,
    email_confirm: true,
    user_metadata: { full_name: u.fullName, lang: u.lang },
  });
  if (error) failAuth(error);

  const { data, error: finishError } = await (
    await untyped()
  ).rpc("lms_finish_guest_upgrade", {
    _uid: userId,
    _full_name: u.fullName,
  });
  if (finishError) {
    console.error("finishing the guest upgrade failed", { message: finishError.message });
    throw new Error("SIGNUP_FAILED");
  }

  if (u.asInstructor) {
    const { error: instructorError } = await db
      .from("lms_instructors")
      .upsert(
        { user_id: userId, full_name: u.fullName, approved: false },
        { onConflict: "user_id" },
      );
    if (instructorError)
      console.error("Failed to create LMS instructor request", {
        error: instructorError.message,
        userId,
      });
  }

  const certificates = (data as { certificates?: NewCertificate[] } | null)?.certificates ?? [];
  await emailCertificates(userId, certificates, u.lang);
  return certificates.length;
}

const confirmUrl = (token: string) =>
  `${getSiteUrl()}/learning-management-system/confirm-account?token=${encodeURIComponent(token)}`;

async function sendUpgradeLink(userId: string, u: Upgrade) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await (await untyped()).from("lms_guest_upgrades").upsert(
    {
      user_id: userId,
      email: u.email,
      full_name: u.fullName,
      as_instructor: u.asInstructor,
      lang: u.lang,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + CONFIRM_HOURS * 3600_000).toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("saving the guest upgrade failed", { message: error.message });
    throw new Error("SIGNUP_FAILED");
  }
  const { sendAccountConfirmationEmail } = await authEmail();
  try {
    await sendAccountConfirmationEmail({
      email: u.email,
      confirmationUrl: confirmUrl(token),
      lang: u.lang,
    });
  } catch (e) {
    // Running locally without email keys: the link goes to the server log.
    if (!getSiteUrl().startsWith("http://localhost")) throw e;
    console.info("[local] guest account confirmation link:", confirmUrl(token));
  }
}

const upgradeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(5)
    .max(120)
    .refine(
      (v) => ARABIC_NAME_RE.test(v) && v.split(/\s+/).filter((p) => p.length >= 2).length >= 3,
      {
        message: "Full name must be three Arabic words",
      },
    ),
  email: z.string().trim().email().max(255),
  password: z.string().min(PASSWORD_MIN).max(72),
  asInstructor: z.boolean(),
  lang: langSchema,
});

/**
 * A guest creates their account. Returns whether they still have to open the
 * link in their email; without confirmation the account is ready at once.
 */
export const startGuestUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof upgradeSchema>) => upgradeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = (context as { userId: string }).userId;
    await assertGuest(userId);
    const email = data.email.trim().toLowerCase();
    const { enforceRateLimit, isEmailConfirmationRequired } = await authEmail();
    await enforceRateLimit("signup", email, 6, 900);
    if (await emailTaken(email)) throw new Error("EMAIL_ALREADY_REGISTERED");

    // The password now: with no email yet, nobody can sign in with it.
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(userId, {
      password: data.password,
      user_metadata: { full_name: data.fullName, lang: data.lang },
    });
    if (error) failAuth(error);

    const upgrade: Upgrade = {
      email,
      fullName: data.fullName,
      asInstructor: data.asInstructor,
      lang: data.lang,
    };
    if (!(await isEmailConfirmationRequired())) {
      const certificates = await completeUpgrade(userId, upgrade);
      return { email, confirmationRequired: false as const, certificates };
    }
    await sendUpgradeLink(userId, upgrade);
    return { email, confirmationRequired: true as const, certificates: 0 };
  });

/** Sends the confirmation link again, with the same limits as signup. */
export const resendGuestUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { lang: Lang }) => z.object({ lang: langSchema }).parse(d))
  .handler(async ({ context }) => {
    const userId = (context as { userId: string }).userId;
    await assertGuest(userId);
    const { data: row } = await (await untyped())
      .from("lms_guest_upgrades")
      .select("email, full_name, as_instructor, lang")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return { sent: false as const, retryAfter: 0 };
    const { enforceRateLimit, RateLimitedError } = await authEmail();
    try {
      await enforceRateLimit("resend", row.email, 1, 60, "resend-gap");
      await enforceRateLimit("resend", row.email, 3, 900);
    } catch (err) {
      const retryAfter = err instanceof RateLimitedError ? err.retryAfterSeconds : 60;
      return { sent: false as const, retryAfter };
    }
    await sendUpgradeLink(userId, {
      email: row.email,
      fullName: row.full_name,
      asInstructor: row.as_instructor,
      lang: row.lang,
    });
    return { sent: true as const, retryAfter: 0 };
  });

/**
 * The link from the email. The token is the proof, so this needs no session:
 * the link may be opened on another device.
 */
export const confirmGuestUpgrade = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(20).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row } = await (await untyped())
      .from("lms_guest_upgrades")
      .select("user_id, email, full_name, as_instructor, lang, expires_at")
      .eq("token_hash", hashToken(data.token))
      .maybeSingle();
    if (!row) return { status: "invalid" as const };
    if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" as const };

    // Someone may have registered the email in the meantime. A half-finished
    // earlier attempt already gave it to this account, which is fine.
    const { data: current } = await (await admin()).auth.admin.getUserById(row.user_id);
    if (current.user?.email !== row.email && (await emailTaken(row.email))) {
      return { status: "email_taken" as const, email: row.email as string };
    }
    const certificates = await completeUpgrade(row.user_id, {
      email: row.email,
      fullName: row.full_name,
      asInstructor: row.as_instructor,
      lang: row.lang,
    });
    return { status: "confirmed" as const, email: row.email as string, certificates };
  });

/**
 * The guest signed in to an existing account in this browser: move what the
 * guest did into it and delete the guest.
 */
export const mergeGuestIntoAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { guestAccessToken: string; lang: Lang }) =>
    z.object({ guestAccessToken: z.string().min(20).max(4096), lang: langSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const targetId = (context as { userId: string }).userId;
    const db = await admin();
    const { data: guest, error } = await db.auth.getUser(data.guestAccessToken);
    if (error || !guest.user) throw new Error("GUEST_SESSION_EXPIRED");
    if (!guest.user.is_anonymous || guest.user.id === targetId) throw new Error("NOT_A_GUEST");
    const { data: target } = await db.auth.admin.getUserById(targetId);
    if (!target.user || target.user.is_anonymous) throw new Error("NOT_A_GUEST");

    const { data: res, error: mergeError } = await (
      await untyped()
    ).rpc("lms_merge_guest", {
      _guest: guest.user.id,
      _target: targetId,
    });
    if (mergeError) {
      console.error("guest merge failed", { message: mergeError.message });
      throw new Error("MERGE_FAILED");
    }
    const result = res as { courses: number; certificates: NewCertificate[] };
    await emailCertificates(targetId, result.certificates ?? [], data.lang);
    return { courses: result.courses ?? 0, certificates: result.certificates?.length ?? 0 };
  });
