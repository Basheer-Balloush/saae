export async function runScheduledJobs(): Promise<void> {
  const results = await Promise.allSettled([
    process.env.ENABLE_TRAINER_OUTBOX === 'true'
      ? import('./lms-outbox.server').then(m => m.processOutbox(10)) : Promise.resolve(),
    process.env.ENABLE_EMAIL_QUEUES === 'true' ? (async () => {
      const secret = process.env.QUEUE_PROCESS_SECRET;
      if (!secret) throw new Error('QUEUE_PROCESS_SECRET is not configured');
      const { processEmailQueues } = await import('./email-queue.server');
      const response = await processEmailQueues(new Request('https://dispatcher.invalid/lovable/email/queue/process', {
        method: 'POST', headers: { Authorization: `Bearer ${secret}` },
      }));
      if (!response.ok) throw new Error(`Email queue dispatcher failed (${response.status})`);
    })() : Promise.resolve(),
  ]);
  if (results.some(result => result.status === 'rejected')) throw new Error('Scheduled email job failed; inspect queue and outbox state');
}
