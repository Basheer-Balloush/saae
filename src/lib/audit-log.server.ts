import { buildAuditEvent, newCorrelationId, type AuditEvent } from "@/lib/audit-events";

/**
 * Server-only audit sink (Phase 0, CF-07).
 *
 * Writes the durable append-only row and emits a structured console line so
 * log-based alerting works even when the database write fails. Never throws:
 * audit failure must not roll back a legitimate business command, but it is
 * always visible in logs.
 */
export async function logAuditEvent(event: AuditEvent): Promise<{ ok: boolean; correlation_id: string }> {
  const built = buildAuditEvent(event);
  const correlationId = built.correlation_id ?? newCorrelationId();

  // Structured, redacted operational line for log queries/alerts.
  console.log(
    `audit: ${JSON.stringify({
      ...built,
      correlation_id: correlationId,
      at: new Date().toISOString(),
    })}`,
  );

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("lms_audit_events").insert({
      event_type: built.event_type,
      schema_version: built.schema_version,
      actor_id: built.actor_id ?? null,
      actor_role: built.actor_role,
      target_type: built.target_type,
      target_id: built.target_id ?? null,
      prior_state: built.prior_state ?? null,
      next_state: built.next_state ?? null,
      correlation_id: correlationId,
      reason: built.reason ?? null,
      metadata: built.metadata,
    });
    if (error) {
      console.error(`audit_write_failed: ${error.message}`);
      return { ok: false, correlation_id: correlationId };
    }
    return { ok: true, correlation_id: correlationId };
  } catch (err) {
    console.error(`audit_write_failed: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, correlation_id: correlationId };
  }
}

/** Convenience wrapper for rejected authorization attempts. */
export function logAuthorizationDenied(params: {
  actor_id?: string | null;
  actor_role?: AuditEvent["actor_role"];
  target_type: string;
  target_id?: string | null;
  reason: string;
  correlation_id?: string;
}) {
  return logAuditEvent({
    event_type: "authorization.denied",
    schema_version: 1,
    actor_id: params.actor_id ?? null,
    actor_role: params.actor_role ?? "anonymous",
    target_type: params.target_type,
    target_id: params.target_id ?? null,
    reason: params.reason,
    correlation_id: params.correlation_id,
    metadata: {},
  });
}
