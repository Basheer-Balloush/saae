# Verification harness

Introduced in Phase 0 of the LMS audit remediation program.

## Layout

| Path | Scope | Command |
|---|---|---|
| `tests/unit` | Pure domain/authorization logic. Hermetic, always runs. | `bun run test:unit` |
| `tests/integration` | RPC + RLS behaviour against a real database. Auto-skipped without credentials. | `bun run test:integration` |
| `tests/e2e` | Critical AR/EN user journeys via Playwright. Opt-in. | `bun run test:e2e` |

## Integration tests

They self-skip unless both variables are set:

```
INTEGRATION_SUPABASE_URL=...
INTEGRATION_SUPABASE_ANON_KEY=...
```

Never point them at production data. Tests must assert on authorization
outcomes (denied / allowed / filtered), not on incidental row contents.

## Rules for later phases

1. Every phase that changes an authorization boundary adds a test that fails
   against the pre-phase behaviour.
2. Never assert "no error" as proof of authorization — assert the persisted
   state and the identity that owns it.
3. Keep tests free of secrets; read them from the environment only.
