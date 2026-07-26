import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

/**
 * Integration guard for the append-only audit trail (Phase 0).
 *
 * Skipped unless integration credentials are present, so `bun run test:unit`
 * stays hermetic. Run with:
 *   INTEGRATION_SUPABASE_URL=... INTEGRATION_SUPABASE_ANON_KEY=... bun run test:integration
 */
const url = process.env.INTEGRATION_SUPABASE_URL;
const anonKey = process.env.INTEGRATION_SUPABASE_ANON_KEY;
const enabled = Boolean(url && anonKey);

describe.skipIf(!enabled)("lms_audit_events RLS", () => {
  const anon = () => createClient(url!, anonKey!, { auth: { persistSession: false } });

  it("does not expose audit events to anonymous callers", async () => {
    const { data, error } = await anon().from("lms_audit_events").select("id").limit(1);
    // Either a permission error, or an empty result — never rows.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("rejects anonymous inserts into the audit trail", async () => {
    const { error } = await anon()
      .from("lms_audit_events")
      .insert({ event_type: "authorization.denied", target_type: "test" });
    expect(error).not.toBeNull();
  });
});
