# Master Plan: a-plan-is-checked-against-the-account-that-compiled-it

## Goal

Give the plan-token account check BattleGrid's identity instead of a locally-minted
one, so applying a compiled plan can succeed — and make the two identifiers
non-interchangeable by type so it cannot regress.

## What is already true

Verified before writing anything, and the previous change's inventory drift is why
each line names how:

- `users.id` and `users.battlegrid_subject` are **separate columns**
  (`src/infrastructure/db/schema/index.ts:12-13`), with the subject commented as
  the natural key.
- Delegated mode mints the local id randomly:
  `const proposedUserId = existingUserId ?? this.random.token(16)`
  (`connect.commands.ts:117`), and stores `grant.subject` separately.
- Personal mode uses the literal `'owner'` (`owner-only-user.ts:19`).
- A live plan token carries `userId = bb334a1e-2ac2-4956-8dea-7c7cf01097b9`,
  decoded from a real `compile_strategy_plan` response on 2026-07-30.
- `list_user_active_positions` returns `userId` at the top level, per the **probed**
  section of `docs/battlegrid-mcp-surface.json`. `get_account_state` does not.
- `tests/strategy/plan-token.test.ts:34` uses one constant for both sides of the
  comparison, which is why no test could see this.

## File & Responsibility Inventory

| File | Responsibility | Status |
|---|---|---|
| `src/application/use-cases/resolve-authority.query.ts` | `Authority.battlegridSubject` | modified |
| `src/domain/strategy/plan-token.ts` | `refuseLocally` takes the remote identity | modified |
| `src/application/use-cases/apply-plan.command.ts` | Passes it through | modified |
| `src/application/use-cases/owner-only-user.ts` | Discovers the subject, or `null` | modified |
| ~~`src/application/use-cases/current-user.query.ts`~~ | **Not touched.** It returns the authority `ResolveAuthorityQuery` produced, so the new field passes through untouched. The plan listed it from expectation | — |
| `src/ports/account.ts` | `AccountPort` — one question, one port. Not a method on `AgentsPort`: neither roster is about who we are | added |
| `src/infrastructure/battlegrid/account-adapter.ts` | `list_user_active_positions`, read for one field | added |
| `src/domain/connection/subject.ts` | `BattlegridSubject`, branded. **Not in the first plan** — added after re-injection showed a rename does not enforce the property (DL-2) | added |
| `tests/access/authority.test.ts` | The delegated path carries the subject. Not in the first plan; that half was uncovered | modified |
| `tests/access/subject-brand.test.ts` | Guards the brand with `@ts-expect-error`. Added by the verifier: the type was the guard and nothing guarded the type | added |
| `src/composition.ts` | Wires the discovery | modified |
| `tests/strategy/plan-token.test.ts` | Stop equating the two sides | modified |
| `tests/strategy/pipeline.test.ts` | The apply is reachable end to end | modified |
| `tests/connection/personal-key.test.ts` | Discovery, and its failure | modified |

**Reconciled against `git status` before the gate**, which is how the previous
change's CRITICAL was found. Three divergences, all recorded above rather than left
to the auditor: one file listed and not needed, two touched and not listed. The
branded-subject module is the interesting one — it exists because a re-injection
disproved a claim this plan made.

## Constraints

- **The type must forbid the local id**, not a scan. See design.
- **`null` skips, never refuses.** Unknown is not mismatched.
- **Nothing stored changes.** No migration, no relabelled rows.
- Discovery failure must not disable applying.
- The delegated path must keep working — it stores the subject already, so this is
  a wiring change there, not a new fact.

## Coverage Matrix

| Requirement | Implementation | Test |
|---|---|---|
| An Unusable Plan Is Refused Before It Is Sent — *compiled with this deployment's credential* | `refuseLocally` given `battlegridSubject` | `pipeline.test.ts`, apply reachable |
| — *the acting account is not known* | `null` skips the check | `plan-token.test.ts` |
| — *the plan belongs to someone else* (unchanged) | same check, correct input | `plan-token.test.ts`, distinct subjects |
| The Connection Is The Identity — *not interchangeable* | the context type | `npm run typecheck` fails on the local id |
| — *owner's own credential* | discovery, or `null` | `personal-key.test.ts` |

## Risks

| Risk | Handling |
|---|---|
| **The fixture keeps hiding it** | The two sides must be different constants, asserted. This is the specific thing that let it ship |
| Discovery failure disables applying | `null` skips; asserted directly |
| A second identity field is confused for the first | The type makes it impossible at the check; naming (`battlegridSubject`) matches the column |
| Inventory drift, as last time | Reconcile against `git diff --name-status` before the gate |
| The apply still fails at BattleGrid | Out of scope and stated; this removes the *local* refusal only |

EXECUTION READY FOR PRODUCTION GATE
