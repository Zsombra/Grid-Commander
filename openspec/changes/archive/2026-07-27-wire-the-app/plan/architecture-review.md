# Architecture Review: wire-the-app

Against `docs/specs/ARCHITECTURE_REVIEW_CHECKLIST.md`.

## Scope

Adds the session layer, the persistence the ports have always assumed, the
composition root, and 10 route files. No domain rule changes.

## Component Checklist Matrix

| Rule | Components | Evidence |
|---|---|---|
| Dependency direction inward only | `src/domain/session/**` | `boundaries.test.ts` domain scan covers it; `session.ts` imports nothing |
| Routes do not reach past the application layer | `app/**` | `boundaries.test.ts::no file under app/ imports infrastructure or the domain` — one declared exception, `@/domain/errors.js`, so a route can recognise a domain error to decide what to render |
| One composition root | `src/composition.ts` | `boundaries.test.ts::no route constructs an adapter of its own` |
| One decryption point | `resolve-authority.query.ts` | `boundaries.test.ts::only resolve-authority reads a stored token` |
| No dual runtime paths | `current-user.query.ts` | Every way of losing authority produces one result; four parameterised cases share one assertion |
| Repositories scoped by userId | both Drizzle repositories | Every query filters on `userId`; `listForUser` takes it as its first argument |
| Structured logging, never a token | all | No `console.*` in `src/` or `app/` |
| Fails at import when configuration is missing | `config.ts`, `composition.ts` | `required()` throws; `infrastructure()` calls `loadConfig()` |

## Findings

**F-1 — the session is a signed pointer, not a server-side record.** Design W-A
records why, and records the limitation it accepts: a leaked cookie stays valid
until it expires or the connection is revoked. Bounded because the authority it
points at is revocable at its source. **If this product ever holds anything not
gated by the BattleGrid connection, this decision needs revisiting** — that is
the trigger, and it is written down rather than remembered.

**F-2 — `audit-list.tsx` moved out of `app/`.** It was a component that change 1
placed under a route directory, and it imported a domain type — which the new
route boundary correctly flagged. Moved to `src/presentation/components/` beside
the others. The boundary rule found real drift on its first run.

**F-3 — a real defect in `DrizzleConfirmationStore.consume`, caught while
writing it.** The first version put the single-use and expiry checks *after* the
update and read them from `.returning()`. That row is the post-update row, so the
`consumedAt !== null` test could never fail — a spent confirmation token would
have been replayable. Every condition now lives in the `WHERE`, which also makes
the check atomic against two concurrent requests. Worth noting that this is the
guarantee the entire rebind confirmation design rests on, and it would have been
silently absent.

**F-4 — the `Randomness` interface now has two implementations.** `composition.ts`
builds one from `node:crypto`; tests use `SequentialRandom`. That is the point of
the port, not drift.

## Status

EVIDENCE RECORDED
