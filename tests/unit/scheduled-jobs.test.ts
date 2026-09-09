import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ queue: vi.fn(), outbox: vi.fn() }));
vi.mock("@/lib/email-queue.server", () => ({ dispatchEmailQueues: state.queue }));
vi.mock("@/lib/lms-outbox.server", () => ({ processOutbox: state.outbox }));
import { runScheduledJobs } from "@/lib/scheduled-jobs.server";
beforeEach(() => {
  vi.stubEnv("ENABLE_EMAIL_QUEUES", "true");
  vi.stubEnv("ENABLE_TRAINER_OUTBOX", "true");
  vi.stubEnv("QUEUE_PROCESS_SECRET", "");
  state.queue
    .mockReset()
    .mockResolvedValue({ processed: 0, failed: 0, deadLettered: 0, skipped: 0 });
  state.outbox.mockReset().mockResolvedValue({ picked: 0, done: 0, failed: 0, retried: 0 });
});
afterEach(() => vi.unstubAllEnvs());
it("runs both processors sequentially without needing a public dispatcher secret", async () => {
  await runScheduledJobs();
  expect(state.queue).toHaveBeenCalledOnce();
  expect(state.outbox).toHaveBeenCalledWith(10);
  expect(state.queue.mock.invocationCallOrder[0]).toBeLessThan(
    state.outbox.mock.invocationCallOrder[0],
  );
});
it("stops all background sends on a provider cooldown", async () => {
  state.queue.mockResolvedValue({ stopped: "rate_limited" });
  await runScheduledJobs();
  expect(state.outbox).not.toHaveBeenCalled();
});
it("marks failed deliveries and trainer retries as failed cron runs", async () => {
  state.outbox.mockResolvedValue({ retried: 1 });
  await expect(runScheduledJobs()).rejects.toThrow("failed");
});
it("does no work with both feature switches disabled", async () => {
  vi.stubEnv("ENABLE_EMAIL_QUEUES", "false");
  vi.stubEnv("ENABLE_TRAINER_OUTBOX", "false");
  await runScheduledJobs();
  expect(state.queue).not.toHaveBeenCalled();
  expect(state.outbox).not.toHaveBeenCalled();
});
