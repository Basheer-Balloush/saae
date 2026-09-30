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
 * - creating an account converts the guest itself. The guest gives a name and
 *   an email, opens the link we send (while the site requires email
 *   confirmation) and chooses a password there. Only then does the guest get
 *   its email and password, in one call, and lms_finish_guest_upgrade makes it
 *   an ordinary learner and issues the certificates it was waiting for.
 *   Nothing about the guest changes before that: setting a password through
 *   the Auth admin API ends every session of the user, which would sign a
 *   guest out of an account that cannot be signed in to yet;
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

/**
 * Gives the guest its confirmed email and its password and makes it an
 * ordinary learner. Returns null when Auth refuses the password as too weak.
 */
async function completeUpgrade(userId: string, u: Upgrade, password: string) {
  const db = await admin();
  const { error } = await db.auth.admin.updateUserById(userId, {
    email: u.email,
    email_confirm: true,
    password,
    user_metadata: { full_name: u.fullName, lang: u.lang },
  });
  if (error?.code === "weak_password") return null;
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

const confirmPath = (token: string) =>
  `/learning-management-system/confirm-account?token=${encodeURIComponent(token)}`;

/** Records what the guest asked for and returns the token that finishes it. */
async function saveUpgrade(userId: string, u: Upgrade) {
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
  return token;
}

async function sendUpgradeLink(u: Upgrade, token: string) {
  const confirmationUrl = getSiteUrl() + confirmPath(token);
  const { sendAccountConfirmationEmail } = await authEmail();
  try {
    await sendAccountConfirmationEmail({ email: u.email, confirmationUrl, lang: u.lang });
  } catch (e) {
    // Running locally without email keys: the link goes to the server log.
    if (!getSiteUrl().startsWith("http://localhost")) throw e;
    console.info("[local] guest account confirmation link:", confirmationUrl);
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
  asInstructor: z.boolean(),
  lang: langSchema,
});

/**
 * A guest asks for an account. While the site confirms emails, the link that
 * finishes it goes to their email; otherwise `next` is the page that finishes
 * it now. Either way the guest stays a guest until they choose a password.
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

    const upgrade: Upgrade = {
      email,
      fullName: data.fullName,
      asInstructor: data.asInstructor,
      lang: data.lang,
    };
    const token = await saveUpgrade(userId, upgrade);
    if (!(await isEmailConfirmationRequired())) {
      return { email, confirmationRequired: false as const, next: confirmPath(token) };
    }
    await sendUpgradeLink(upgrade, token);
    return { email, confirmationRequired: true as const, next: null };
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
    const upgrade: Upgrade = {
      email: row.email,
      fullName: row.full_name,
      asInstructor: row.as_instructor,
      lang: row.lang,
    };
    // A new link replaces the one sent before.
    await sendUpgradeLink(upgrade, await saveUpgrade(userId, upgrade));
    return { sent: true as const, retryAfter: 0 };
  });

type PendingUpgrade =
  | { status: "invalid" | "expired" }
  | { status: "email_taken"; email: string }
  | { status: "ready"; email: string; userId: string; upgrade: Upgrade };

/** What a confirmation token stands for right now. */
async function findUpgrade(token: string): Promise<PendingUpgrade> {
  const { data: row } = await (await untyped())
    .from("lms_guest_upgrades")
    .select("user_id, email, full_name, as_instructor, lang, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!row) return { status: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" };

  const { data: current } = await (await admin()).auth.admin.getUserById(row.user_id);
  if (!current.user) return { status: "invalid" };
  // Already an account under another email: this link is not for it.
  if (!current.user.is_anonymous && current.user.email !== row.email) return { status: "invalid" };
  // Someone may have registered the email in the meantime. A half-finished
  // earlier attempt already gave it to this account, which is fine.
  if (current.user.email !== row.email && (await emailTaken(row.email))) {
    return { status: "email_taken", email: row.email };
  }
  return {
    status: "ready",
    email: row.email,
    userId: row.user_id,
    upgrade: {
      email: row.email,
      fullName: row.full_name,
      asInstructor: row.as_instructor,
      lang: row.lang,
    },
  };
}

const tokenSchema = z.string().min(20).max(200);

/**
 * The link from the email, when its page opens. The token is the proof, so
 * this needs no session: the link may be opened on another device.
 */
export const checkGuestUpgrade = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const found = await findUpgrade(data.token);
    if (found.status === "ready") return { status: "ready" as const, email: found.email };
    return found;
  });

/**
 * The guest chose a password: the account gets its email and password now.
 * Setting the password ends the guest's sessions, so the page signs in with
 * the new email and password straight after.
 */
export const confirmGuestUpgrade = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; password: string }) =>
    z.object({ token: tokenSchema, password: z.string().min(PASSWORD_MIN).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    const found = await findUpgrade(data.token);
    if (found.status !== "ready") return found;
    const certificates = await completeUpgrade(found.userId, found.upgrade, data.password);
    if (certificates === null) return { status: "weak_password" as const };
    return { status: "confirmed" as const, email: found.email, certificates };
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
