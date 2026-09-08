import { createFileRoute } from '@tanstack/react-router';
// Supabase Auth uses native SMTP in the organization deployment. Do not configure
// this obsolete Lovable payload/signature contract as a Supabase Auth hook.
export const Route = createFileRoute('/lovable/email/auth/webhook')({
  server: { handlers: { POST: async () => Response.json({ error: 'Email hook is not configured' }, { status: 410 }) } },
});
