import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { guestLabel, isGuestUser } from "@/lib/guest";
import { couponErrorMessage } from "@/lib/coupons";

const user = (extra: Partial<User>) => ({ id: "u", ...extra }) as User;

describe("guests", () => {
  it("is a guest only when Supabase says the user is anonymous", () => {
    expect(isGuestUser(user({ is_anonymous: true }))).toBe(true);
    expect(isGuestUser(user({ is_anonymous: false, email: "a@b.co" }))).toBe(false);
    expect(isGuestUser(user({}))).toBe(false);
    expect(isGuestUser(null)).toBe(false);
  });

  it("labels a guest with a short, stable reference", () => {
    const id = "6f1c2d3e-0000-4000-8000-00000000ab9f";
    expect(guestLabel(id, true)).toBe("زائر · AB9F");
    expect(guestLabel(id, false)).toBe("Guest · AB9F");
  });

  it("explains why a guest's coupon is refused", () => {
    expect(couponErrorMessage("coupon_needs_account", false)).toMatch(/accounts only/);
    expect(couponErrorMessage("coupon_needs_account", true)).toMatch(/للحسابات فقط/);
    expect(couponErrorMessage("account_required", false)).toMatch(/not to guests/);
  });
});
