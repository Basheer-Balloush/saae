import { describe, it, expect } from "vitest";
import {
  buildAuditEvent,
  redactMetadata,
  newCorrelationId,
  AUDIT_SCHEMA_VERSION,
} from "@/lib/audit-events";

describe("audit event contract", () => {
  it("redacts secret-bearing keys at any depth", () => {
    const out = redactMetadata({
      email: "a@b.com",
      access_token: "abc.def.ghi",
      nested: { refresh_token: "x", signed_url: "https://…", keep: 1 },
    }) as Record<string, unknown>;

    expect(out.email).toBe("a@b.com");
    expect(out.access_token).toBe("[redacted]");
    const nested = out.nested as Record<string, unknown>;
    expect(nested.refresh_token).toBe("[redacted]");
    expect(nested.signed_url).toBe("[redacted]");
    expect(nested.keep).toBe(1);
  });

  it("caps long strings and deep nesting", () => {
    const long = "x".repeat(900);
    expect(String(redactMetadata(long))).toHaveLength(501);
    expect(redactMetadata({ a: { b: { c: { d: { e: { f: 1 } } } } } })).toBeTruthy();
  });

  it("builds a validated event with defaults", () => {
    const evt = buildAuditEvent({
      event_type: "certificate.issued",
      schema_version: AUDIT_SCHEMA_VERSION,
      target_type: "lms_certificate",
      target_id: "cert-1",
      actor_role: "service",
      metadata: { password: "nope", course_id: "c1" },
    });

    expect(evt.schema_version).toBe(AUDIT_SCHEMA_VERSION);
    expect((evt.metadata as Record<string, unknown>).password).toBe("[redacted]");
    expect((evt.metadata as Record<string, unknown>).course_id).toBe("c1");
  });

  it("rejects unknown event types", () => {
    expect(() =>
      buildAuditEvent({
        // @ts-expect-error deliberate invalid type
        event_type: "not.a.real.event",
        schema_version: 1,
        target_type: "x",
        actor_role: "service",
        metadata: {},
      }),
    ).toThrow();
  });

  it("generates distinct correlation ids", () => {
    expect(newCorrelationId()).not.toBe(newCorrelationId());
  });
});
