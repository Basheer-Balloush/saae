import { createHash, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  sendTransactionalEmail,
  assertEmailRecipientAllowed,
  getSiteUrl,
} from "./email-delivery.server";
import {
  renderQueuedEmail,
  InvalidQueuedEmail,
  isBackgroundRecipientAllowed,
} from "./queued-email.server";

type Message = {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  message: Record<string, unknown>;
};
type Summary = {
  processed: number;
  failed: number;
  deadLettered: number;
  skipped: number;
  stopped?: string;
};
const QUEUES = ["auth_emails", "transactional_emails"] as const;
const MAX_RETRIES = 5;

/** Internal cron entry point. No public HTTP request or dispatcher secret needed. */
export async function dispatchEmailQueues(): Promise<Summary> {
  const result: Summary = { processed: 0, failed: 0, deadLettered: 0, skipped: 0 };
  if (process.env.ENABLE_EMAIL_QUEUES !== "true") return result;
  // Fail before leasing jobs if delivery configuration is incomplete.
  if (
    !["test", "live"].includes(process.env.EMAIL_DELIVERY_MODE ?? "") ||
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    throw new Error("Background email configuration is incomplete");
  }
  getSiteUrl();
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: state, error: stateError } = await db
    .from("email_send_state")
    .select("*")
    .eq("id", 1)
    .single();
  if (stateError || !state) throw new Error("Could not read email dispatcher state");
  if (state.retry_after_until && new Date(state.retry_after_until).getTime() > Date.now())
    return { ...result, stopped: "rate_limited" };
  const batchSize = Math.max(1, Math.min(10, state.batch_size ?? 10));
  const delay = Math.max(600, Math.min(1000, state.send_delay_ms ?? 600));

  for (const queue of QUEUES) {
    const { data, error } = await db.rpc("read_email_batch_with_metadata", {
      queue_name: queue,
      batch_size: batchSize,
      vt: 600,
    });
    if (error) throw new Error(`Could not read email queue: ${queue}`);
    for (const msg of (data ?? []) as Message[]) {
      const payload = msg.message ?? {};
      if (!isBackgroundRecipientAllowed(payload.to)) {
        result.skipped++;
        continue;
      }
      if (typeof payload.to === "string") {
        try {
          assertEmailRecipientAllowed(payload.to);
        } catch {
          result.skipped++;
          continue;
        }
      }
      // SQL-produced messages lack message_id: persist a stable queue identity
      // for failure counts and deduplication, rather than counting queue reads.
      const messageId =
        typeof payload.message_id === "string" && payload.message_id
          ? payload.message_id
          : `pgmq-${queue}-${msg.msg_id}`;
      const template =
        typeof payload.template_name === "string"
          ? payload.template_name
          : typeof payload.label === "string"
            ? payload.label
            : queue;
      const log = async (status: string, reason?: string) => {
        const { error: logError } = await db.from("email_send_log").insert({
          message_id: messageId,
          template_name: template,
          recipient_email: typeof payload.to === "string" ? payload.to : "",
          status,
          error_message: reason,
        });
        if (logError) throw new Error("Could not record email delivery state");
      };
      const remove = async () => {
        const { data: deleted, error: deleteError } = await db.rpc("delete_email", {
          queue_name: queue,
          message_id: msg.msg_id,
        });
        if (deleteError || !deleted) throw new Error("Could not acknowledge queued email");
      };
      const deadLetter = async (reason: string) => {
        await log("dlq", reason);
        const { error: moveError } = await db.rpc("move_to_dlq", {
          source_queue: queue,
          dlq_name: `${queue}_dlq`,
          message_id: msg.msg_id,
          payload,
        });
        if (moveError) throw new Error("Could not preserve email in dead-letter queue");
        result.deadLettered++;
      };
      const { data: logs, error: logsError } = await db
        .from("email_send_log")
        .select("status")
        .eq("message_id", messageId);
      if (logsError) throw new Error("Could not check prior email attempts");
      if (logs?.some((row) => row.status === "sent")) {
        await remove();
        continue;
      }
      const failures = logs?.filter((row) => row.status === "failed").length ?? 0;
      const ttl =
        queue === "auth_emails"
          ? (state.auth_email_ttl_minutes ?? 15)
          : (state.transactional_email_ttl_minutes ?? 60);
      const enqueued = Date.parse(msg.enqueued_at);
      if (!Number.isFinite(enqueued)) {
        await deadLetter("Missing queue timestamp");
        continue;
      }
      if (Date.now() - enqueued > ttl * 60_000) {
        await deadLetter("Email delivery deadline exceeded");
        continue;
      }
      if (failures >= MAX_RETRIES) {
        await deadLetter("Maximum send attempts exceeded");
        continue;
      }

      let email;
      try {
        email = renderQueuedEmail(payload);
      } catch (error) {
        if (!(error instanceof InvalidQueuedEmail)) throw error;
        await deadLetter(error.message);
        continue;
      }
      try {
        await sendTransactionalEmail({ ...email, idempotencyKey: `pgmq-${queue}-${msg.msg_id}` });
      } catch (error) {
        const status =
          error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
        // Never store provider payloads or claim links in diagnostic errors.
        const reason = status ? `Email provider error (${status})` : "Email delivery failed";
        if (status === 429) {
          const retry =
            error && typeof error === "object" && "retryAfterSeconds" in error
              ? Number(error.retryAfterSeconds)
              : 60;
          const seconds = Number.isFinite(retry) && retry > 0 ? Math.min(retry, 3600) : 60;
          const { error: cooldownError } = await db
            .from("email_send_state")
            .update({
              retry_after_until: new Date(Date.now() + seconds * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);
          if (cooldownError) throw new Error("Could not record provider cooldown");
          // Throttling does not consume the failed-send budget.
          return { ...result, stopped: "rate_limited" };
        }
        if (status === 401 || status === 403)
          throw new Error(`Email provider authorization failed (${status})`);
        await log("failed", reason);
        result.failed++;
        if (failures + 1 >= MAX_RETRIES) await deadLetter("Maximum send attempts exceeded");
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      // Never delete without durable success logging. On retry, Resend receives
      // the same idempotency key even when the completion write failed.
      await log("sent");
      await remove();
      result.processed++;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return result;
}

/** Optional manual endpoint: closed unless a dedicated secret is configured. */
export async function processEmailQueues(request: Request): Promise<Response> {
  const secret = process.env.QUEUE_PROCESS_SECRET;
  if (!secret) return Response.json({ error: "Manual dispatcher disabled" }, { status: 503 });
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer "))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(header.slice(7).trim()), hash(secret)))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  if (process.env.ENABLE_EMAIL_QUEUES !== "true")
    return Response.json({ skipped: true }, { status: 503 });
  return Response.json(await dispatchEmailQueues());
}
