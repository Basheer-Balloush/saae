import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  completionFailure: false, jobs: [] as Record<string, any>[], sends: vi.fn(), from: vi.fn(), audit: vi.fn(),
}));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: state.from } }));
vi.mock('@/lib/audit-log.server', () => ({ logAuditEvent: state.audit }));
vi.mock('@/lib/trainer-approved-email.server', () => ({ sendTrainerApprovedEmail: state.sends }));
import '@/integrations/supabase/client.server';
import '@/lib/audit-log.server';
import '@/lib/trainer-approved-email.server';
import { processOutbox } from '@/lib/lms-outbox.server';

beforeEach(() => {
  vi.stubEnv('ENABLE_TRAINER_OUTBOX', 'true'); vi.stubEnv('EMAIL_DELIVERY_MODE', 'test');
  vi.stubEnv('TEST_EMAIL_ALLOWLIST', 'tester@example.test'); vi.stubEnv('RESEND_API_KEY', 'test'); vi.stubEnv('EMAIL_FROM', 'test');
  state.completionFailure = false;
  state.sends.mockReset().mockResolvedValue(true); state.from.mockReset();
  state.jobs = [{ id: 'job-1', job_type: 'trainer_approved_email', payload: { email: 'tester@example.test' }, attempts: 0, correlation_id: null, status: 'pending', next_attempt_at: '2020-01-01T00:00:00.000Z' }];
  state.from.mockImplementation(() => {
    const filters: ((row: Record<string, any>) => boolean)[] = [];
    let patch: Record<string, any> | undefined;
    function execute() {
      if (patch?.status === 'done' && state.completionFailure) { state.completionFailure = false; return { data: [], error: new Error('state write failed') }; }
      const rows = state.jobs.filter(row => filters.every(filter => filter(row)));
      if (patch) rows.forEach(row => Object.assign(row, patch));
      return { data: rows.map(row => ({ ...row })), error: null };
    }
    const chain: any = {
      select: () => chain, update: (value: any) => { patch = value; return chain; },
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return chain; },
      lte: (key: string, value: string) => { filters.push(row => row[key] <= value); return chain; },
      order: () => chain, limit: () => Promise.resolve(execute()),
      maybeSingle: () => { const result = execute(); return Promise.resolve({ data: result.data[0] ?? null, error: result.error }); },
      then: (resolve: any, reject: any) => Promise.resolve(execute()).then(resolve, reject),
    };
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());
it('claims once when two processors read the same pending job', async () => {
  await Promise.all([processOutbox(), processOutbox()]);
  expect(state.sends).toHaveBeenCalledTimes(1);
  expect(state.sends).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'outbox-job-1' }));
  expect(state.jobs[0].status).toBe('done');
});
it('preserves queued jobs and retry budget for non-test recipients', async () => {
  state.jobs[0].payload.email = 'real-user@example.test';
  await processOutbox();
  expect(state.sends).not.toHaveBeenCalled(); expect(state.jobs[0].attempts).toBe(0);
  expect(state.jobs[0].next_attempt_at).toBe('2020-01-01T00:00:00.000Z');
});
it('records retry state on a provider failure', async () => {
  state.sends.mockRejectedValue(new Error('provider unavailable'));
  await processOutbox();
  expect(state.jobs[0]).toMatchObject({ status: 'pending', attempts: 1, last_error: 'provider unavailable' });
});
it('does not touch the database when disabled', async () => {
  vi.stubEnv('ENABLE_TRAINER_OUTBOX', 'false');
  await processOutbox(); expect(state.from).not.toHaveBeenCalled();
});

it('keeps the same retry identity after send succeeds but recording completion fails', async () => {
  state.completionFailure = true;
  await processOutbox();
  expect(state.jobs[0]).toMatchObject({ status: 'pending', attempts: 1 });
  state.jobs[0].next_attempt_at = '2020-01-01T00:00:00.000Z';
  await processOutbox();
  expect(state.sends).toHaveBeenCalledTimes(2);
  expect(state.sends.mock.calls[0][0].idempotencyKey).toBe(state.sends.mock.calls[1][0].idempotencyKey);
  expect(state.jobs[0].status).toBe('done');
});
