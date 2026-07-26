import { z } from "zod";

/**
 * Shared audit-event contract for sensitive LMS actions (Phase 0, CF-07).
 *
 * One shape for every sensitive mutation so that alerting, export, and review
 * do not need per-feature parsing. Never put tokens, passwords, raw private
 * documents, or unnecessary PII into `metadata`.
 */

export const AUDIT_SCHEMA_VERSION = 1;

export const AUDIT_EVENT_TYPES = [
  // Phase 1 — applicant authorization & evidence
  "trainer_application.draft_saved",
  "trainer_application.submitted",
  "trainer_application.evidence_attached",
  "trainer_application.evidence_replaced",
  "trainer_application.evidence_removed",
  // Phase 2 — accreditation & provisioning
  "trainer_application.evaluator_assigned",
  "trainer_application.score_submitted",
  "trainer_application.transitioned",
  "instructor.activated",
  "instructor.provisioning_failed",
  // Phase 3 — cleanup lifecycle
  "cleanup.batch_previewed",
  "cleanup.archived",
  "cleanup.restored",
  "cleanup.purged",
  // Phase 4 — enrollment, files, assignments
  "enrollment.request_submitted",
  "file.finalized",
  "file.replaced",
  "file.cleanup",
  "assignment.submitted",
  "assignment.graded",
  // Phase 5 — quizzes & certificates
  "quiz.attempt_started",
  "quiz.attempt_submitted",
  "certificate.issued",
  "certificate.eligibility_evaluated",
  // Phase 6 — video
  "video.processing_state_changed",
  // Phase 7 — auth & sessions
  "auth.signup_provisioned",
  "auth.password_reset_requested",
  "session.registered",
  "session.revoked",
  // Phase 8 — payments
  "payment.quoted",
  "payment.confirmed",
  "payment.failed",
  "payment.refunded",
  // Cross-cutting
  "authorization.denied",
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export const AuditEventSchema = z.object({
  event_type: z.enum(AUDIT_EVENT_TYPES),
  schema_version: z.number().int().positive().default(AUDIT_SCHEMA_VERSION),
  actor_id: z.string().uuid().nullable().optional(),
  actor_role: z
    .enum([
      "anonymous",
      "student",
      "applicant",
      "instructor",
      "co_instructor",
      "evaluator",
      "lms_admin",
      "admin",
      "service",
    ])
    .default("service"),
  target_type: z.string().trim().min(1).max(80),
  target_id: z.string().trim().max(120).nullable().optional(),
  prior_state: z.string().trim().max(80).nullable().optional(),
  next_state: z.string().trim().max(80).nullable().optional(),
  correlation_id: z.string().trim().max(80).nullable().optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

/** Keys that must never reach the audit store, at any nesting level. */
const REDACTED_KEYS = [
  "password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "signed_url",
  "signedurl",
  "cookie",
  "otp",
  "national_id",
  "card",
  "iban",
];

function isRedactedKey(key: string): boolean {
  const k = key.toLowerCase();
  return REDACTED_KEYS.some((r) => k.includes(r));
}

/**
 * Strip secret-bearing keys and cap size so audit rows stay reviewable.
 * Pure function — unit tested, safe to import on client or server.
 */
export function redactMetadata(input: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (input === null || input === undefined) return null;
  if (Array.isArray(input)) {
    return input.slice(0, 50).map((v) => redactMetadata(v, depth + 1));
  }
  if (typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = isRedactedKey(key) ? "[redacted]" : redactMetadata(value, depth + 1);
    }
    return out;
  }
  if (typeof input === "string") {
    return input.length > 500 ? `${input.slice(0, 500)}…` : input;
  }
  return input;
}

/** Build a validated, redacted event payload ready for persistence. */
export function buildAuditEvent(event: AuditEvent): AuditEvent {
  const parsed = AuditEventSchema.parse(event);
  return {
    ...parsed,
    schema_version: parsed.schema_version ?? AUDIT_SCHEMA_VERSION,
    metadata: (redactMetadata(parsed.metadata) ?? {}) as Record<string, unknown>,
  };
}

/** Correlation id for grouping one logical command across services. */
export function newCorrelationId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `cid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
