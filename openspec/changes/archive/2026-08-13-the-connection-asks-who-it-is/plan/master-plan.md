# The Connection Asks Who It Is — Implementation Plan (Master Handoff Document)

## Status

- Change ID: `the-connection-asks-who-it-is`
- Change folder: `openspec/changes/the-connection-asks-who-it-is/`
- Track: `full`
- Current phase: `Ready for Production Gate`
- Base ref for diffs: `origin/main`
- Last updated: `2026-08-13` (execution complete)

## Objective

Make a delegated BattleGrid connection establish its account identity by an
authenticated read performed with the newly granted authority, instead of reading
a `sub` claim that BattleGrid — plain OAuth 2.1, no OIDC — has never sent. A
connection whose account cannot be identified is refused, stores nothing, and
releases the grant it was just given.

## Requirement Coverage Matrix

| Requirement | Capability | Delta op | Implementing file(s) | Scenario → verification |
|---|---|---|---|---|
| A Grant Carries Authority, Not Identity | `battlegrid-connection` | ADDED | `src/ports/battlegrid.ts` (modify: drop `TokenGrant.subject`), `src/infrastructure/battlegrid/mcp-adapter.ts` (modify: `tokenRequest`), `src/ports/account.ts` (modify: result type), `src/infrastructure/battlegrid/account-adapter.ts` (modify), `src/application/use-cases/connect.commands.ts` (modify) | "The grant carries no subject" → `tests/connection/connect.test.ts` (grant fixture with no `sub` completes, keyed on the read's answer); "A returning user" → `tests/connection/connect.test.ts` (second authorization resolves to the same `users.id`, asserted against the store); "Two different users connect" → `tests/connection/connect.test.ts` (two subjects, two rows, no crossover) |
| A Connection Whose Account Cannot Be Identified Is Refused, And Its Grant Released | `battlegrid-connection` | ADDED | `src/application/use-cases/connect.commands.ts` (modify), `src/domain/errors.ts` (modify: new refusal), `app/api/auth/battlegrid/callback/route.ts` (modify), `app/connect/page.tsx` (modify) | "The identity read cannot answer" → `tests/connection/connect.test.ts` (no row written, no session issued, `revoke` called **with the access token from the exchange**); "The grant cannot be released either" → `tests/connection/connect.test.ts` (revoke throws → still nothing stored, distinct outcome raised); "A refusal is never a crash" → `tests/rendering/connect.test.ts` or equivalent (every refusal branch returns a redirect) |
| The Coverage Around Consent Is Stated Where It Is Read | `battlegrid-connection` | ADDED | `scripts/ci.sh` (modify), `tests/live/oauth-live.test.ts` (modify) | "Reading what the checks cover" → `tests/architecture/*` or a literal assertion that the boundary sentence is present beside the gate; at minimum, reviewed in the architecture review with the diff quoted |
| The Connection Is The Identity | `battlegrid-connection` | MODIFIED | `src/ports/account.ts` (modify), `src/application/use-cases/owner-only-user.ts` (modify), `src/application/use-cases/connect.commands.ts` (modify) | "Acting under a delegated connection" → `tests/access/authority.test.ts` (the authority carries the read's subject); "Acting under the owner's own credential" → `tests/connection/personal-key.test.ts` (unreadable account read leaves the deployment working, `null` still cached); "The two identifiers are not interchangeable" → existing type-level guarantee, unchanged and re-asserted |

Out of scope (from the proposal — do not implement):

- The keep-or-delete decision for the delegated path — `oauth-path-may-be-dead-weight` (#91)
- Identity re-verification on refresh — `a-refresh-is-trusted-to-be-the-same-account` (#206)
- Any change to personal-mode observable behaviour
- Multi-tenant session hardening beyond identity establishment
- Automating the consent step

## Non-Negotiable Constraints

From `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` (Quick Reference Card):

- **Dependencies**: domain interfaces and ports only; never import infrastructure
  in a use case. `CompleteConnectionCommand` gains `AccountPort`, an interface —
  not the adapter.
- **BattleGrid**: always through the port; the MCP client exists only at the
  composition root. The identity read is `AccountPort.subjectFor`, already
  behind a port; `src/domain/` gains no import in this change and loses one
  field.
- **Scope**: never a safety signal. The identity read is a read-annotated tool
  and the classification still decides.
- **Unknown tools**: fail closed. Unchanged here.
- **Audit**: written before the attempt, updated with the outcome. This change
  makes **no BattleGrid write** — except `revoke`, which already runs through the
  audited path in `DisconnectCommand` and must reach BattleGrid the same way here
  (see decision log D3).
- **Concurrency**: `expectedRevision` always. Not applicable — no mutation of a
  revisioned entity. The existing `upsert` race tolerance is preserved verbatim.
- **Logging**: structured, contextual, **never a token**. The refusal path
  handles a live access token; it must never appear in a log line or in the
  redirect's query string.
- **Queries**: Drizzle builder only, always scoped by `userId`. Unchanged.
- **Quality gate** (`openspec/config.yaml`): `npm run typecheck` · `npm run lint`
  · `npm test` · `npm run build` · `npm run db:generate && git diff --quiet
  drizzle/` · `npm run test:db`

## Architectural Boundaries (Design Slice)

- **Packages/areas touched**: `src/ports/`, `src/domain/errors.ts`,
  `src/application/use-cases/`, `src/infrastructure/battlegrid/`, `app/connect/`,
  `app/api/auth/battlegrid/callback/`, `tests/`, `scripts/`, `src/config.ts`
- **Layers touched**: Presentation (`app/`), Application
  (`src/application/use-cases/`), Domain (`src/domain/errors.ts`, `src/ports/`),
  Infrastructure (`src/infrastructure/battlegrid/`)
- **Contracts impacted**: `TokenGrant` loses `subject` (**breaking**);
  `AccountPort.subjectFor` changes return type (**breaking**);
  `CompleteConnectionCommand`'s constructor gains one port. No DTO reaching a
  page changes shape. **No database schema change** —
  `users.battlegrid_subject` already holds exactly this fact, and only the
  provenance of what is written into it changes.

## File & Responsibility Inventory (SOLID)

| File | Action | Layer | Responsibility (one sentence) |
|---|---|---|---|
| `src/ports/battlegrid.ts` | modify | Domain/port | `TokenGrant` describes what a token response contains — and it contains no identity |
| `src/ports/account.ts` | modify | Domain/port | `subjectFor` answers *which account*, or says why it could not, with the tolerance note moved to name its caller |
| `src/domain/errors.ts` | modify | Domain | A connection refused for want of an identity is a named domain outcome, carrying whether the grant was released |
| `src/infrastructure/battlegrid/mcp-adapter.ts` | modify | Infrastructure | `tokenRequest` maps a token response and stops requiring a claim it never receives |
| `src/infrastructure/battlegrid/account-adapter.ts` | modify | Infrastructure | Report *why* the account could not be named, rather than flattening three outcomes into one |
| `src/application/use-cases/owner-only-user.ts` | modify | Application | Collapse an unnameable account to unknown, because a personal deployment must keep working — the tolerance, stated where it applies |
| `src/application/use-cases/connect.commands.ts` | modify | Application | Ask who the grant acts as; refuse and release when there is no answer |
| `src/composition.ts` | modify | Composition root | One `McpAccountAdapter` built once and handed to both callers, so two readers of the same tool cannot drift apart (named in task C4; the inventory row was missing) |
| `app/api/auth/battlegrid/callback/route.ts` | modify | Presentation | Render every refusal as a redirect; nothing on this path throws past the `catch` |
| `app/connect/page.tsx` | modify | Presentation | Name the new refusal reasons, including where authority can be withdrawn when the release failed |
| `src/config.ts` | modify | Config | The registration comment agrees with `docs/battlegrid-oauth-metadata.json` |
| `scripts/ci.sh` | modify | Tooling | The gate list states that no gate exercises a token exchange, and why |
| `tests/live/oauth-metadata.test.ts` | modify | Tests | The probe states the boundary it does not cross (planned as `oauth-live.test.ts`; that is the gate name, not a file — DL-1) |
| `tests/connection/connect.test.ts` | modify | Tests | The delegated path's new branches, including the mutation-checked pair |
| `tests/connection/personal-key.test.ts` | modify | Tests | Personal mode did not move |
| `tests/rendering/connect.test.ts` | modify | Tests | Both refusal reasons render, hedge accurately, and keep the retry (named in the requirement matrix; the inventory row was missing) |
| `tests/architecture/granted-scopes.test.ts` | **create** | Tests | Exactly one call site may declare its own authority — DL-11 |
| `tests/live/identity-probe.test.ts` | **create** | Tests | The rewritten account read, against the real platform — personal path, with its boundary stated (DL-10) |
| `tools/oauth_walk.py` | **create** | Tooling | The delegated walk, automated except for consent — see DL-8 |
| `tests/architecture/oauth-conformance.test.ts` | modify | Tests | **Remediation — see DL-7.** The requirement that the consent-coverage boundary be stated is verified rather than trusted |
| `tests/architecture/one-destination.test.ts` | modify | Tests | **Unplanned — see DL-2.** The host guard names each file once, however many times the file spells the host |
| ~~`tests/access/authority.test.ts`~~ | **not modified** | Tests | Compiles and passes unchanged against the new contracts — it drives `Authority` directly and never constructs an `AccountPort`. Left alone rather than edited to look busy |

### Proposed contract shapes (executor may refine names, not semantics)

```ts
// src/ports/account.ts — three outcomes kept as three, per decision D2.
export type AccountIdentityResult =
  | { readonly kind: 'subject'; readonly subject: BattlegridSubject }
  // The call did not produce a usable answer.
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause }
  // The call answered, and the answer named no account.
  | { readonly kind: 'unnamed'; readonly reason: string };
```

`unreadable` mirrors `AccountStateResult`'s existing shape, including its
`FailureCause`, so the two reads in this file stay legible side by side.
`unnamed` is separate because a platform that answers *without* an id is a
different situation from one that does not answer, and collapsing them is how
the original bug read as an outage.

## Dependency / Call-Tree Sketch

```text
GET /api/auth/battlegrid/callback
  └─ CompleteConnectionCommand.execute
       ├─ OAuthTransactionStore.consume(state)         (unchanged)
       ├─ BattleGridPort.exchangeCode                   (grant: no subject)
       ├─ AccountPort.subjectFor(grant.accessToken)     ← NEW
       │    └─ McpAccountAdapter → list_user_active_positions → userId
       ├─ on 'unreadable' | 'unnamed':
       │    ├─ store nothing, issue nothing
       │    ├─ BattleGridPort.revoke(grant.accessToken) ← NEW
       │    └─ throw UnidentifiedAccountError(released: boolean)
       └─ on 'subject':
            ├─ ConnectionReader.findUserIdBySubject     (unchanged)
            └─ ConnectionWriter.upsert                  (unchanged, race-tolerant)

OwnerOnlyUser.battlegridSubject
  └─ AccountPort.subjectFor(apiKey) → collapse to null  ← MOVED HERE
```

## Checklist Coverage Matrices

### Data pipeline (`docs/checklists/DATA_PIPELINE_REVIEW_CHECKLIST.md`)

| Layer | Touched | Note |
|---|:--:|---|
| 0 BattleGrid | ● | One added read (`list_user_active_positions`) and one conditional `revoke` on the connect path |
| 1 Database | ○ | No schema change; `users.battlegrid_subject` already holds this fact |
| 2 Schema definitions | ○ | — |
| 3 Queries | ○ | `findUserIdBySubject` / `upsert` unchanged |
| 4 Mappers | ● | `tokenRequest` stops mapping a field; `account-adapter` maps a cause instead of swallowing it |
| 5 Use case | ● | `CompleteConnectionCommand` gains the ask-refuse-release branch; `OwnerOnlyUser` gains the collapse |
| 6 Route handlers | ● | The callback renders two new refusal outcomes |
| 7 Client state | ○ | — |
| 8 Client components | ● | `/connect` names the new reasons |
| 9 Pipeline completeness | ● | Iron Rule: BattleGrid remains the source of truth for account identity; the product stores its answer and never computes one |

**Anti-pattern watch — Silent Default.** This change exists because a missing
field was required rather than defaulted; the opposite failure is equally
available here. Nothing may substitute a placeholder identity, and an unnameable
account must not silently become a new workspace.

### Architecture (`docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md`)

| Rule | Applies to | How it is kept |
|---|---|---|
| Domain imports no infrastructure | `connect.commands.ts`, `owner-only-user.ts` | Both take `AccountPort`, an interface; the adapter is wired at the composition root only |
| BattleGrid through the port | the identity read, the release | `AccountPort.subjectFor`, `BattleGridPort.revoke` |
| Never log a token | the refusal path | The access token is passed to `revoke` and to nothing else; no token in a log line, an error message, or a redirect query string |
| Audit before the attempt | `revoke` on refusal | Runs the same audited path `DisconnectCommand` uses |
| Fail closed | the new refusal | The default outcome of an unanswered identity read is refusal, not admission |

### UI/UX (`docs/checklists/UI_COMPONENT_REVIEW_CHECKLIST.md`)

In scope, narrowly: `/connect` gains copy for two refusal reasons. No new
component, no new layout, no token change. See `plan/uiux-review.md`.

## Phase-by-Phase Tasks

Ordering is load-bearing: the port changes break compilation until their callers
follow, and `npm run typecheck` is the guide through phases A–C. Do not run the
full gate until C is complete.

### Phase A — Contracts

- **A1** `src/ports/battlegrid.ts` — remove `subject` from `TokenGrant`.
- **A2** `src/ports/account.ts` — introduce `AccountIdentityResult`; change
  `subjectFor`'s return type. Rewrite the contract note: state that
  `OwnerOnlyUser` tolerates an unknown and why, and that a connection being
  established cannot.
- **A3** `src/domain/errors.ts` — add the refusal, extending `DomainError`,
  carrying whether the grant was released. It must not carry the token.

### Phase B — Adapters

- **B1** `mcp-adapter.ts` `tokenRequest` — delete the `sub` read, the throw, and
  the mapped field. **Move the reasoning, do not delete it**: the sentence about
  an empty default colliding every connection on one key belongs in
  `connect.commands.ts` beside the refusal it now justifies.
- **B2** `account-adapter.ts` `subjectFor` — return the three outcomes. The
  `catch` becomes `unreadable` with a `FailureCause`; a payload with no `userId`
  becomes `unnamed`. `asSubject` is still called only on a value BattleGrid sent.
- **B3** Confirm `refresh` compiles and returns a usable grant with no subject —
  it shares `tokenRequest`. It must **not** acquire an identity read (#206).

### Phase C — Callers

- **C1** `owner-only-user.ts` — collapse the result to `null`, carrying the
  "unknown must never become a refusal" reasoning to this call site. Preserve the
  caching of a `null` answer exactly.
- **C2** `connect.commands.ts` — take `AccountPort`; ask after the exchange; key
  the lookup and upsert on the answer.
- **C3** `connect.commands.ts` — the refusal branch: store nothing, issue
  nothing, `revoke(grant.accessToken)`, throw the named error with `released`
  set from whether the revoke succeeded.
- **C4** Composition root — wire the existing account adapter into
  `CompleteConnectionCommand`. No new adapter instance if one is already built.

### Phase D — Surface

- **D1** `callback/route.ts` — catch the new error; redirect to `/connect` with a
  reason, and a distinct one when `released` is false. Nothing throws past the
  `catch`.
- **D2** `app/connect/page.tsx` — name both reasons. The un-released case must
  say authority may still stand at BattleGrid and where to withdraw it.

### Phase E — The record stops misleading

- **E1** `scripts/ci.sh` — beside `oauth-live`, state that it verifies the
  authorization server's published description and that **no gate exercises a
  token exchange**, because an authorization code needs a person at a consent
  screen.
- **E2** `tests/live/oauth-live.test.ts` — the same boundary, in the file
  someone reads when the gate is green.
- **E3** `src/config.ts:95` — correct the registration comment against
  `docs/battlegrid-oauth-metadata.json`. Keep the original claim visible as what
  was believed, per the tracking convention on corrected findings.

### Phase F — Verification

- **F1**–**F6** the six behavioural checks in `tasks.md` §5.
- **F7** **Mutation check, mandatory.** Restore the `sub` requirement and
  re-run F1; drop the `revoke` call and re-run F3. A check that passes both ways
  is not a check. Record the failed versions in the test files rather than
  quietly replacing them — three checks written in the 2026-08-12 session needed
  exactly this.
- **F8** Quality gate, all six commands.
- **F9** **The live walk.** Not optional; see the gate below.

## Phase 1 Review Checklist (Planner) — complete

- [x] Every requirement in the delta maps to at least one file and one check
- [x] Constraints extracted from the checklists, not invented
- [x] Contract changes named as breaking, with their callers enumerated
- [x] Execution ordering states why it is ordered
- [x] Out-of-scope items are filed, not merely listed (#91, #206)
- [x] The one thing that cannot be proven offline is named as a gate, not a wish

## Phase 2 Review Checklist (Executor)

- [x] Phases A–F complete, in order
- [x] `plan/architecture-review.md` filled with evidence (not "looks fine")
- [x] `plan/data-review.md` filled with evidence, including the contract map
- [x] `plan/uiux-review.md` filled — in scope, not N/A
- [x] `plan/decision-log.md` carries five EXECUTION entries, including two plan
      corrections (DL-1, DL-2) and one unsatisfied gate (DL-3)
- [~] `npm run typecheck` PASS · `npm run lint` PASS · `npm test` PASS (2248 in
      171 files) · `npm run build` PASS · `npm run db:generate && git diff
      --quiet drizzle/` PASS (no schema change) · **`npm run test:db` NOT RUN —
      DL-3**
- [x] Mutation check F7 performed — three mutations (M1, M2, M3), each confirmed
      failing; M1 and M2 recorded in the test files
- [x] No token appears in any log line, error message, or redirect — asserted,
      not assumed (`connect.test.ts`, "never puts the credential in the message a
      user could see")

## Phase 3 Review Checklist (Auditor — production gate)

- [ ] Every delta requirement is implemented, not merely tested around
- [ ] `TokenGrant.subject` has no remaining reader anywhere, including tests and
      fakes — a fake that still supplies one hides the change
- [ ] `subjectFor`'s three outcomes are all reachable, and all three are asserted
- [ ] The refusal path calls `revoke` **with the exchanged token** — assert the
      argument, not the call. `FakeAgentsPort`-style recording without checking
      is a known vacuous-pass shape in this repo
- [ ] Personal mode is byte-for-byte unchanged in behaviour, including `null`
      caching
- [ ] The callback has no throwing branch
- [ ] **The live walk is done, or the change is BLOCKED.** One delegated
      connection: consent, exchange, identity read, session, and a second
      authorization recognising the same account; tokens revoked afterwards and
      confirmed dead. Without it the central premise — that
      `list_user_active_positions` answers for a delegated access token — rests
      on the same kind of inference that produced the bug

## Artifacts

- `openspec/changes/the-connection-asks-who-it-is/proposal.md`
- `openspec/changes/the-connection-asks-who-it-is/specs/battlegrid-connection/spec.md`
- `openspec/changes/the-connection-asks-who-it-is/design.md`
- `openspec/changes/the-connection-asks-who-it-is/tasks.md`
- `openspec/changes/the-connection-asks-who-it-is/plan/master-plan.md` (this file)
- `openspec/changes/the-connection-asks-who-it-is/plan/architecture-review.md`
- `openspec/changes/the-connection-asks-who-it-is/plan/data-review.md`
- `openspec/changes/the-connection-asks-who-it-is/plan/uiux-review.md`
- `openspec/changes/the-connection-asks-who-it-is/plan/decision-log.md`
- `openspec/changes/the-connection-asks-who-it-is/plan/production-gate.md` (auditor)

EXECUTION READY FOR PRODUCTION GATE
