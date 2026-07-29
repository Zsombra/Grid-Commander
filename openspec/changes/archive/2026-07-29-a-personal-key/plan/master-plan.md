# Master Plan: a-personal-key

## Goal

Let the owner run Grid-Commander against their own BattleGrid account with their
own key, without registering an OAuth client to talk to themselves — and without
disturbing the delegated path.

## File & Responsibility Inventory

| File | Responsibility | Status |
|---|---|---|
| `src/domain/connection/held-scopes.ts` | The scope seam; `DeclaredScopes` | added |
| `src/infrastructure/battlegrid/connection-scopes.ts` | The delegated answer | added |
| `src/application/use-cases/owner-only-user.ts` | `OwnerOnlyUser`, `OWNER_USER_ID` | added |
| `src/presentation/components/personal-mode-notice.tsx` | The disclosure | added |
| `src/application/use-cases/current-user.query.ts` | `ActingUser` interface | modified |
| `src/infrastructure/battlegrid/mcp-adapter.ts` | Takes `HeldScopes` | modified |
| `src/config.ts` | `personal`, conditional OAuth requirements | modified |
| `src/composition.ts` | Picks both implementations | modified |
| `app/(app)/layout.tsx` | Renders the disclosure | modified |
| `.env.example` | Documents both modes | modified |
| `tests/connection/personal-key.test.ts` | 19 tests | added |
| 3 existing test harnesses | `heldScopes` instead of `connections` | modified |

## Constraints

- The delegated path must be untouched behaviourally (spec requirement).
- No runtime dual-path (architecture review).
- Nothing may present a declared scope as an enforced one (spec requirement).

## Coverage Matrix

| Requirement | Implementation | Test |
|---|---|---|
| A Deployment May Hold The Owner's Own Credential | `OwnerOnlyUser`, `config.personal` | `personal-key.test.ts`, and served with no OAuth client |
| A Declared Scope Is Not A Granted One | `HeldScopes`, `DeclaredScopes`, the notice | `personal-key.test.ts` ×7 |
| A Deployment Without A Login Says So | `PersonalModeNotice`, the layout | `personal-key.test.ts` ×4, rendered both schemes |

## Risks

| Risk | Handling |
|---|---|
| The guard refuses everything in personal mode | Found by reading `scopesFor` before writing anything; the seam exists because of it |
| A declared scope read as enforced | Disclosed in the product on every page, and asserted |
| Personal mode reachable from elsewhere | Disclosed; not prevented. Stated as out of scope — disclosure is not authentication |
| The delegated path silently broken | `check-serving.sh` run on it unchanged; 511 tests pass |

EXECUTION READY FOR PRODUCTION GATE
