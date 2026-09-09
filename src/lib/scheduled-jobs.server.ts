export async function runScheduledJobs(): Promise<void> {
  let failed = false;
  // Run sequentially to avoid two background batches competing for Resend.
  if (process.env.ENABLE_EMAIL_QUEUES === "true") {
    try {
      const { dispatchEmailQueues } = await import("./email-queue.server");
      const result = await dispatchEmailQueues();
      console.log(JSON.stringify({ event: "email_queue_run", ...result }));
      failed ||= result.failed > 0 || result.deadLettered > 0;
      if (result.stopped === "rate_limited") return;
    } catch {
      console.error(JSON.stringify({ event: "email_queue_run_failed" }));
      throw new Error("Scheduled email queue failed; inspect delivery state");
    }
  }
  if (process.env.ENABLE_TRAINER_OUTBOX === "true") {
    try {
      const { processOutbox } = await import("./lms-outbox.server");
      const result = await processOutbox(10);
      console.log(JSON.stringify({ event: "trainer_outbox_run", ...result }));
      failed ||= result.failed > 0 || result.retried > 0;
    } catch {
      console.error(JSON.stringify({ event: "trainer_outbox_run_failed" }));
      failed = true;
    }
  }
  if (failed) throw new Error("Scheduled email job failed; inspect queue and outbox state");
}
