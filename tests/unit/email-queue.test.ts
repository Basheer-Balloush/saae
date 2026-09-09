import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  queues: {} as Record<string, any[]>,
  logs: [] as any[],
  dlq: [] as any[],
  config: {} as Record<string, any>,
  rpc: vi.fn(),
  from: vi.fn(),
  logError: false,
  deleteError: false,
  readError: false,
  lookupError: false,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: state.rpc, from: state.from }),
}));
import { dispatchEmailQueues, processEmailQueues } from "@/lib/email-queue.server";
import { renderQueuedEmail } from "@/lib/queued-email.server";

const address = "tester@example.test";
const token = "a".repeat(48);
const payload = () => ({
  template_name: "initiative-seat-claim",
  to: address,
  template_data: { full_name: "<b>Test</b>", claim_token: token },
});
const message = (body: any = payload()) => ({
  msg_id: 42,
  read_ct: 1,
  enqueued_at: new Date().toISOString(),
  message: body,
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  for (const [key, value] of Object.entries({
    ENABLE_EMAIL_QUEUES: "true",
    EMAIL_DELIVERY_MODE: "test",
    TEST_EMAIL_ALLOWLIST: address,
    BACKGROUND_EMAIL_TEST_ALLOWLIST: address,
    RESEND_API_KEY: "test",
    EMAIL_FROM: "test@example.test",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test",
    SITE_URL: "https://staging.example.test",
    QUEUE_PROCESS_SECRET: "",
  }))
    vi.stubEnv(key, value);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  state.queues = { auth_emails: [], transactional_emails: [message()] };
  state.logs = [];
  state.dlq = [];
  state.config = {};
  state.logError = false;
  state.deleteError = false;
  state.readError = false;
  state.lookupError = false;
  state.rpc.mockReset().mockImplementation(async (name, args) => {
    if (name === "read_email_batch_with_metadata") {
      if (state.readError) return { data: null, error: {} };
      const messages = state.queues[args.queue_name]
        .filter((m) => !m.leased)
        .slice(0, args.batch_size);
      messages.forEach((m) => {
        m.leased = true;
      });
      return { data: messages, error: null };
    }
    if (name === "delete_email") {
      if (state.deleteError) return { data: false, error: {} };
      state.queues[args.queue_name] = state.queues[args.queue_name].filter(
        (m) => m.msg_id !== args.message_id,
      );
      return { data: true, error: null };
    }
    if (name === "move_to_dlq") {
      state.dlq.push(args.payload);
      state.queues[args.source_queue] = state.queues[args.source_queue].filter(
        (m) => m.msg_id !== args.message_id,
      );
      return { data: 1, error: null };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
  state.from.mockReset().mockImplementation((table) => {
    let id: string | undefined;
    let inserted: any;
    let patch: any;
    const execute = () => {
      if (table === "email_send_state") {
        Object.assign(state.config, patch ?? {});
        return { data: state.config, error: null };
      }
      if (inserted) {
        if (state.logError) return { data: null, error: {} };
        state.logs.push(inserted);
        return { data: null, error: null };
      }
      return {
        data: state.logs.filter((l) => l.message_id === id),
        error: state.lookupError ? {} : null,
      };
    };
    const chain: any = {
      select: () => chain,
      eq: (key: string, value: string) => {
        if (key === "message_id") id = value;
        return chain;
      },
      insert: (row: any) => {
        inserted = row;
        return chain;
      },
      update: (row: any) => {
        patch = row;
        return chain;
      },
      single: async () => execute(),
      then: (resolve: any, reject: any) => Promise.resolve(execute()).then(resolve, reject),
    };
    return chain;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("renders SQL initiative payloads, escapes names, and uses the configured site", () => {
  const email = renderQueuedEmail(payload());
  expect(email.html).toContain("&lt;b&gt;Test&lt;/b&gt;");
  expect(email.text).toContain(`https://staging.example.test/initiative/claim?token=${token}`);
  expect(email.subject).toBeTruthy();
});
it("supports legacy pre-rendered emails and rejects missing bodies and unknown templates", () => {
  expect(renderQueuedEmail({ to: address, subject: "Hello", text: "Body" }).text).toBe("Body");
  expect(() => renderQueuedEmail({ to: address, subject: "Hello" })).toThrow();
  expect(() => renderQueuedEmail({ ...payload(), template_name: "unknown" })).toThrow();
  expect(() =>
    renderQueuedEmail({ ...payload(), template_data: { claim_token: "https://evil.test" } }),
  ).toThrow();
});
it("sends through Resend and logs a stable identity for SQL messages without message_id", async () => {
  expect(await dispatchEmailQueues()).toMatchObject({ processed: 1, failed: 0 });
  const [url, request] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("https://api.resend.com/emails");
  expect(JSON.parse(request!.body as string)).toMatchObject({
    to: [address],
    subject: expect.any(String),
  });
  expect(request!.headers).toMatchObject({
    "Idempotency-Key": "saae-example.supabase.co-pgmq-transactional_emails-42",
  });
  expect(state.logs[0]).toMatchObject({
    message_id: "pgmq-transactional_emails-42",
    template_name: "initiative-seat-claim",
    status: "sent",
  });
  expect(state.queues.transactional_emails).toHaveLength(0);
});
it("leases a queued email only once across overlapping runs", async () => {
  await Promise.all([dispatchEmailQueues(), dispatchEmailQueues()]);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("leaves non-test recipients queued without spending retry budget", async () => {
  state.queues.transactional_emails[0].message.to = "real@example.test";
  expect(await dispatchEmailQueues()).toMatchObject({ skipped: 1, processed: 0 });
  expect(fetch).not.toHaveBeenCalled();
  expect(state.logs).toHaveLength(0);
  expect(state.dlq).toHaveLength(0);
});
it("uses enqueue metadata to preserve expired emails in DLQ without sending", async () => {
  state.queues.transactional_emails[0].enqueued_at = new Date(
    Date.now() - 61 * 60_000,
  ).toISOString();
  expect(await dispatchEmailQueues()).toMatchObject({ deadLettered: 1 });
  expect(fetch).not.toHaveBeenCalled();
  expect(state.dlq).toHaveLength(1);
});
it("moves malformed templates to DLQ instead of sending broken messages", async () => {
  state.queues.transactional_emails[0].message.template_data = {};
  expect(await dispatchEmailQueues()).toMatchObject({ deadLettered: 1 });
  expect(fetch).not.toHaveBeenCalled();
});
it("does not resend messages already durably recorded as sent", async () => {
  state.logs.push({ message_id: "pgmq-transactional_emails-42", status: "sent" });
  await dispatchEmailQueues();
  expect(fetch).not.toHaveBeenCalled();
  expect(state.queues.transactional_emails).toHaveLength(0);
});
it("does not acknowledge an email when success logging fails; retries with the same provider key", async () => {
  state.logError = true;
  await expect(dispatchEmailQueues()).rejects.toThrow("record");
  expect(state.queues.transactional_emails).toHaveLength(1);
  state.logError = false;
  state.queues.transactional_emails[0].leased = false;
  await dispatchEmailQueues();
  expect(vi.mocked(fetch).mock.calls[0][1]!.headers).toEqual(
    vi.mocked(fetch).mock.calls[1][1]!.headers,
  );
});
it("records sent status before acknowledgement and never resends after delete failure", async () => {
  state.deleteError = true;
  await expect(dispatchEmailQueues()).rejects.toThrow("acknowledge");
  state.deleteError = false;
  state.queues.transactional_emails[0].leased = false;
  await dispatchEmailQueues();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("rate limits pause processing without spending retry attempts", async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response("", { status: 429, headers: { "retry-after": "120" } }),
  );
  expect(await dispatchEmailQueues()).toMatchObject({ stopped: "rate_limited", failed: 0 });
  expect(state.logs).toHaveLength(0);
  expect(state.config.retry_after_until).toBeTruthy();
  await dispatchEmailQueues();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("retains messages and fails visibly when provider authorization fails", async () => {
  vi.mocked(fetch).mockResolvedValue(new Response("", { status: 403 }));
  await expect(dispatchEmailQueues()).rejects.toThrow("authorization");
  expect(state.dlq).toHaveLength(0);
  expect(state.queues.transactional_emails).toHaveLength(1);
});
it("counts actual failures, not queue reads, and stops after five failed sends", async () => {
  state.queues.transactional_emails[0].read_ct = 99;
  vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));
  for (let i = 0; i < 5; i++) {
    state.queues.transactional_emails[0].leased = false;
    await dispatchEmailQueues();
  }
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(state.dlq).toHaveLength(1);
});
it("fails closed when queue or prior-attempt reads fail", async () => {
  state.readError = true;
  await expect(dispatchEmailQueues()).rejects.toThrow("read");
  state.readError = false;
  state.lookupError = true;
  await expect(dispatchEmailQueues()).rejects.toThrow("prior");
  expect(fetch).not.toHaveBeenCalled();
});
it("leaves disabled queues untouched and keeps the optional HTTP endpoint closed", async () => {
  vi.stubEnv("ENABLE_EMAIL_QUEUES", "false");
  await dispatchEmailQueues();
  expect(state.rpc).not.toHaveBeenCalled();
  expect((await processEmailQueues(new Request("https://example.test"))).status).toBe(503);
  vi.stubEnv("QUEUE_PROCESS_SECRET", "dedicated-secret");
  expect((await processEmailQueues(new Request("https://example.test"))).status).toBe(401);
  expect(
    (
      await processEmailQueues(
        new Request("https://example.test", { headers: { Authorization: "Bearer test" } }),
      )
    ).status,
  ).toBe(403);
});
