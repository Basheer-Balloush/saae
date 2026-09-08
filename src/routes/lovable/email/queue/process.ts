import { createFileRoute } from '@tanstack/react-router';
import { processEmailQueues } from '@/lib/email-queue.server';
export const Route = createFileRoute('/lovable/email/queue/process')({
  server: { handlers: { POST: ({ request }) => processEmailQueues(request) } },
});
