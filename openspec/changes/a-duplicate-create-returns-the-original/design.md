# Design: A duplicate create returns the original, not a crash

## Technical Approach

The invariant becomes: **at most one non-failed audit entry per
`(user_id, idempotency_key)`**, enforced by Postgres itself. The existing
unique index turns partial — `WHERE outcome != 'failed'` — so a failed
attempt's row keeps its key for the audit record while no longer blocking a
retry. `begin` stays a bare INSERT; when the insert collides, the repository
converts the unique violation (Postgres `23505` on that index) into a typed
`DuplicateIdempotencyKeyError` carrying the live entry's outcome. The command
catches exactly that error and returns a `duplicate` result; the action turns
it into a `?problem=` bounce the page renders with `CarriedProblem`.

Separately, `createAgent` in the adapter puts the key into the tool's
`arguments`, so BattleGrid's declared retry contract is offered on the wire.

## Decisions

### Decision: only a `succeeded` create dedupes
Chosen because a failed create must be retryable from the same still-open form
— that retry is the situation the key exists for (operator decision, endorsed
this session, per the #239 body and the 2026-08-14 close journal entry).
Rejected: any-attempt-dedupes, because it makes the safety feature refuse the
one press it was built to protect. An `attempted` (undecided) entry also holds
the key — deduping the unknown is the honest reading, since the attempt may
have landed.

### Decision: a partial unique index, not key release and not upsert
Chosen because it preserves audit history untouched (the failed row keeps the
key it carried), makes retry-after-failure automatic with zero extra writes,
and keeps the invariant in the database where a race cannot slip past it.
Rejected: nulling the key on the failed row before re-insert, because it edits
an audit record to enable a workflow — the row would no longer say which key
its attempt carried. Rejected: `onConflictDoUpdate` on `begin`, because
overwriting the prior attempt's row erases that it happened, and DL-6 exists
precisely because the audit row must survive everything.

### Decision: catch the violation; do not pre-read
Chosen because catch-and-convert is one code path with no time-of-check gap:
two racing presses both INSERT, the loser gets `23505`, and both outcomes are
legible. A pre-read (`findByIdempotencyKey` then branch) would still need the
catch for the race, so it would be a second path guarding the same thing.
`beginGuardedCall` and its deps are untouched — the conversion lives in the
repository, which is the layer that knows what `23505` is. Domain gets the
error type; infrastructure imports domain, which is the allowed direction. The
domain never sees the MCP client, and the MCP adapter never sees Postgres —
each converts its own failures at its own boundary.

### Decision: the key goes into `arguments` in `createAgent`, not generically in `call()`
Chosen because BattleGrid declares `idempotencyKey` on
`create_intelligence_agent` specifically, and this product has already been
burned by sending an operation a key it does not accept
(`additionalProperties: false` rejected every `update_intelligence_agent` for
the life of the product — see "A Value Read Back Is Not Therefore A Value That
May Be Sent"). Rejected: spreading the key into every tool's args from the
shared `call()` helper. The guard-level `extras.idempotencyKey` keeps carrying
it to the audit record for any tool; the wire argument is per-tool.

### Decision: the typed error carries fields, not a composed message
`DuplicateIdempotencyKeyError` exposes `originalOutcome` (`'succeeded' |
'attempted'`) as data. The operator-facing sentences live where they are
rendered. Chosen because `spending()` forwarding `err.message` is how the last
change delivered four careful sentences behind a contradicting preamble — the
same class of defect, recorded in the 2026-08-14 review entry.

## Data Flow

1. `/agents/new` renders `AgentForm` with a per-render `randomUUID()` key
   (unchanged, #231).
2. Submit → `create` action → `CreateAgentCommand.execute` → validation →
   `agents.createAgent` → adapter `call()` → `callTool` → `beginGuardedCall`
   → `audit.begin` INSERT.
   - **No collision**: proceeds exactly as today; key also rides in the tool
     `arguments`.
   - **Collision (`23505` on the partial index)**: repository reads the live
     entry, throws `DuplicateIdempotencyKeyError(originalOutcome)`. It
     propagates raw — `beginGuardedCall` throws before `callTool`'s try, so no
     audit entry is written for the refused repeat (a refused operation was
     never attempted).
3. The command catches only `DuplicateIdempotencyKeyError` around
   `createAgent` and returns `{ kind: 'duplicate', originalOutcome }`.
4. The action redirects to `/agents/new?problem=<sentence for the outcome>`;
   the page mounts `CarriedProblem` on **every** branch (#240's lesson: a
   bounce must not land on a branch that drops it). The re-rendered form
   mints a fresh key, so a deliberate second agent stays one press away.

## File Changes

- `src/infrastructure/db/schema/index.ts` (modified) — partial unique index
- `drizzle/migrations/<generated>` (new) — drop + recreate index with WHERE
- `src/domain/errors.ts` (modified) — `DuplicateIdempotencyKeyError`
- `src/infrastructure/db/repositories/drizzle-audit-repository.ts` (modified)
  — `begin` converts `23505`; `findByIdempotencyKey` narrows to non-failed
- `src/infrastructure/battlegrid/agent-adapter.ts` (modified) — key into args
- `src/application/use-cases/create-agent.command.ts` (modified) — `duplicate`
  result kind
- `app/(app)/agents/new/page.tsx` (modified) — branch + `?problem=` +
  `CarriedProblem` on every branch
- `tests/support/fakes.ts` (modified) — fake audit repo mirrors the invariant
- new tests under `tests/db/`, `tests/agent/` (or nearest fit), and
  `tests/rendering/`
