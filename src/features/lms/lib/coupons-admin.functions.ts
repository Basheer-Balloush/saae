import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { couponOffer, phoneKey } from "@/features/lms/lib/coupons";

/*
 * Personal coupons need two things the browser cannot do: find a learner by
 * email or phone (accounts live in Supabase Auth), and email them the code.
 * Only the LMS admin roles may call these.
 */

const admin = async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
};

async function assertLmsAdmin(userId: string) {
  const db = await admin();
  const { data, error } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["lms_admin", "admin"]);
  if (error) throw new Error("Could not check your role");
  if (!data?.length) throw new Error("Forbidden: admin role required");
}

export type Learner = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  is_anonymous?: boolean;
  user_metadata?: Record<string, unknown> | null;
};

/** Every account, a thousand at a time (at most 20,000). */
async function eachUser(visit: (u: AuthUser) => boolean | void) {
  const db = await admin();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not list accounts");
    for (const u of data.users) if (visit(u as AuthUser) === false) return;
    if (data.users.length < 1000) return;
  }
}

const metaText = (u: AuthUser, key: string) => {
  const v = u.user_metadata?.[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/** Finds up to ten learners whose email contains the text, or whose phone
    number (in their profile or account) matches. */
export const findLearners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().trim().min(3).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId);
    const db = await admin();
    // Anything but digits and phone punctuation is an email, or a part of one.
    const byEmail = /[^\d\s+().-]/.test(data.query);
    const needle = byEmail ? data.query.toLowerCase() : phoneKey(data.query);
    if (!byEmail && needle.length < 6) return { learners: [] as Learner[] };

    const { data: profiles } = await db
      .from("lms_user_profiles")
      .select("user_id, full_name, phone")
      .not("phone", "is", null);
    const profileOf = new Map(
      (
        (profiles ?? []) as { user_id: string; full_name: string | null; phone: string | null }[]
      ).map((p) => [p.user_id, p]),
    );

    const found: Learner[] = [];
    await eachUser((u) => {
      // Guests cannot hold coupons.
      if (u.is_anonymous) return true;
      const profile = profileOf.get(u.id);
      const phone = profile?.phone ?? metaText(u, "phone");
      const hit = byEmail
        ? (u.email ?? "").toLowerCase().includes(needle)
        : !!phone && phoneKey(phone).endsWith(needle);
      if (hit) {
        found.push({
          id: u.id,
          email: u.email ?? null,
          name: profile?.full_name || metaText(u, "full_name") || metaText(u, "name"),
          phone,
        });
      }
      return found.length < 10;
    });
    return { learners: found };
  });

const couponInput = z.object({ couponId: z.string().uuid() });

async function personalCoupon(couponId: string) {
  const db = await admin();
  // lms_coupons is not in the generated types yet.
  const { data: c } = await (db as unknown as SupabaseClient)
    .from("lms_coupons")
    .select(
      "id, code, scope, user_id, percent_off, min_discount, max_discount, max_uses, expires_at, active",
    )
    .eq("id", couponId)
    .maybeSingle();
  const coupon = c as {
    id: string;
    code: string;
    scope: string;
    user_id: string | null;
    percent_off: number | null;
    min_discount: number | null;
    max_discount: number | null;
    max_uses: number | null;
    expires_at: string | null;
    active: boolean;
  } | null;
  if (!coupon || coupon.scope !== "personal" || !coupon.user_id)
    throw new Error("coupon_not_personal");
  const { data: userRow } = await db.auth.admin.getUserById(coupon.user_id);
  const user = userRow.user as AuthUser | null;
  const { data: profile } = await db
    .from("lms_user_profiles")
    .select("full_name, phone")
    .eq("user_id", coupon.user_id)
    .maybeSingle();
  return {
    coupon,
    learner: {
      id: coupon.user_id,
      email: user?.email ?? null,
      name:
        profile?.full_name || (user ? metaText(user, "full_name") || metaText(user, "name") : null),
      phone: profile?.phone ?? (user ? metaText(user, "phone") : null),
    } satisfies Learner,
  };
}

/** Who a personal coupon is for, to open a WhatsApp message to them. */
export const getCouponLearner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => couponInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId);
    return (await personalCoupon(data.couponId)).learner;
  });

/** Emails a personal coupon to its learner. */
export const sendPersonalCouponEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    couponInput.extend({ lang: z.enum(["ar", "en"]).default("ar") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertLmsAdmin(context.userId);
    const { coupon, learner } = await personalCoupon(data.couponId);
    if (!coupon.active) throw new Error("coupon_inactive");
    if (!learner.email) throw new Error("learner_has_no_email");
    const ar = data.lang === "ar";
    const { getSiteUrl, sendTransactionalEmail } =
      await import("@/lib/email/email-delivery.server");
    const React = await import("react");
    const { render } = await import("@react-email/components");
    const { PersonalCouponEmail } = await import("@/lib/email/templates/personal-coupon");
    const { offer, limits } = couponOffer(coupon, ar);
    const siteName = ar
      ? "الجمعية السورية للذكاء الاصطناعي وريادة الأعمال"
      : "Syrian Association for AI & Entrepreneurship";
    const element = React.createElement(PersonalCouponEmail, {
      siteName,
      catalogUrl: `${getSiteUrl()}/learning-management-system/catalog`,
      fullName: learner.name || learner.email.split("@")[0],
      code: coupon.code,
      offer,
      limits,
      lang: data.lang,
    });
    await sendTransactionalEmail({
      to: learner.email,
      subject: ar ? `كوبون خاص بك: ${offer}` : `A coupon for you: ${offer}`,
      html: await render(element),
      text: await render(element, { plainText: true }),
    });
    return { sentTo: learner.email };
  });
