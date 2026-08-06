# Tasks

Full track. The planner writes `plan/` before any of this is implemented.

## 1. Decide what is proposable, and write it down

- [x] 1.1 Done — DL-1. Seven: edit, rebind, archive agent, deploy, undeploy,
      retune rule, archive strategy
- [x] 1.2 Done — DL-1. **`applyPlan` is excluded**: `DescribeApplyRequest`
      takes a `CompiledPlan` carrying a five-minute `planToken`, so its
      consequence cannot be recomputed from stored intent. Refused by name
      rather than quietly omitted
- [x] 1.3 Done — DL-2. **72 hours.** Safety does not rest on it (the describe
      runs fresh), so it is a signal-to-noise choice: long enough to cover a
      weekend, short enough that a queue stays read. Stale is not deleted

## 2. The store

- [x] 2.1 Drizzle schema + migration: one table, no token column, no access
      token column
- [x] 2.2 A test asserts the schema carries neither, so a later migration
      cannot reintroduce one quietly
- [x] 2.3 Ownership enforced by PostgreSQL, exercised in `tests/db/` against a
      real database like confirmations and OAuth state
- [x] 2.4 A proposal is immutable once recorded

## 3. Recording (the MCP side)

- [x] 3.1 Seven `propose_*` tools, one per proposable operation, named for
      what an operator would ask for. They share one use-case: `ToolDefinition`
      already carries a per-tool `call` closure, so the operation is bound
      there rather than in a new table field
- [x] 3.2 Recording contacts BattleGrid not at all — asserted, not assumed
- [x] 3.3 The response carries a reference and a URL, and no token
- [x] 3.4 An operation the product does not offer is refused, naming it, and
      stores nothing
- [x] 3.5 The server's instructions tell a model that agreement happens in the
      web app and where

## 4. Agreeing (the web side)

- [x] 4.1 `/pending` lists them in three groups — waiting, went stale unread,
      already decided — with a nav entry. No row links yet: `/pending/[id]`
      does not exist, and `reachability.test.ts` refuses a link to a route the
      app does not serve
- [x] 4.2 "Nothing has been proposed" and "could not be read" are separate
      pages, and the second says it is not the same as having none
- [x] 4.3 `/pending/[id]` runs the real describe at open time and shows the
      product's own consequence sentence, unchanged. **Only `edit` is wired**:
      the other six decided operations are absent from the MCP surface until
      their describe lands here, because a proposal that cannot be opened is
      the unusable row `RecordProposalCommand` refuses to create
- [x] 4.4 Done, and built first. `reconcile` gives each proposed value one of
      three honest dispositions — will-change, already-true, refused — against
      the target read fresh. There is no before/after diff because no snapshot
      is stored; inventing one would be the staleness this design avoids
- [x] 4.5 A target that is gone or no longer eligible says so and offers no
      confirmation
- [x] 4.6 Agreeing runs the existing perform, and lands in the audit
- [x] 4.7 Declining closes the proposal permanently

## 5. The guard rewrite

- [x] 5.1 Done. `mcp-read-only.test.ts` derives reachability end to end:
      mutating tools from the surface record's own classification → the port
      methods that send them, read out of the adapters → the file implementing
      each use-case, read out of `composition.ts` → whether that file calls one
- [x] 5.2 Done. Nothing in the chain is hand-maintained, and each link asserts
      it is non-empty so the guard cannot pass vacuously
- [x] 5.3 Done, by injection. A tool named `stop_trading` wired to
      `updateAgent` fails with `stop_trading → updateAgent → updateAgent`; the
      old prefix rule matches none of it
- [x] 5.4 Done. `proposals-are-inert.test.ts` holds the absence three ways:
      nothing that touches proposals schedules (timer, interval, cron, worker,
      queue), the perform is reachable only from a `'use server'` route, and the
      close follows the write rather than preceding it. Proved by injecting a
      `setTimeout` into `resolve-proposal.command.ts` — it fails naming the file
      and the pattern
- [x] 5.5 Done, in the same file, asserted three ways so none of them is the
      only one: the recording use-case holds no confirmation store, no tool in
      `TOOLS` resolves to a `describe*` use-case, and no `propose_*` tool body
      names a token. Proved by injecting `confirmationToken: 'leaked'` into a
      propose tool. **`composition.ts` is not exempted**: it wires `updateAgent`
      without calling it, so the rule matches `.execute(` rather than the bare
      name — an allowlist there would sit in the file most likely to grow

## 6. Live

- [x] 6.1 **Done, live, once BattleGrid returned.** Propose → open → agree,
      end to end on a throwaway agent the probe created in `APPROVAL_REQUIRED`
      and archived in a `finally`:

      ```
      propose: r7 → /pending/r7
      inert:   mode=APPROVAL_REQUIRED r1 — unchanged
      open:    Replaces every trading limit this agent runs under. Sets trading to off.
      agree:   updated
      after:   mode=OFF dailyLoss=10 fields=23 r2
      audit:   update_intelligence_agent=succeeded
      replay:  threw ConfirmationRequiredError
      cleanup: archived
      ```

      Four separate claims, only jointly true and only observable here: the
      confirmation minted at open time spent at agree time; the digest survived
      the split into `changes` and `tradingConfigChanges`; **the merge sent 23
      fields where the model named one, and the $10 caps survived being
      stopped**; and the agreement is spent once
- [x] 6.2 Done, live. A proposal recorded against a real agent leaves its
      revision, mode and name exactly as they were — asserted by reading the
      agent before and after
- [x] 6.3 Done, live, three ways: the difference names the member against the
      value BattleGrid holds this second; a proposal the account already
      satisfies comes back `no-op` with no confirmation at all; a target that
      does not exist comes back `not-possible`
- [x] 6.4 Done. The write test is gated on `BATTLEGRID_LIVE_WRITES=1`; the
      read-only three need only a key, so the honest-difference path is
      exercised on every keyed CI run

## 7. Gates

- [x] 7.1 Done, both ways. Keyless green; **keyed green too**, all ten gates
      including `freshness`. The four probes that failed during the outage —
      preview, field, competitor, column-grammar — pass untouched, which
      settles that they were the platform and not this change
- [x] 7.2 Done. `openspec.py validate` — clean, no issues found
- [x] 7.3 Done. `docs/MCP_SERVER.md` rewritten: "It cannot change anything. It
      can propose." — what proposing is, why the consequence is computed at
      open time, what cannot be proposed and why, the six operations decided
      and not yet built, and the guard deriving reachability rather than
      matching a prefix
- [x] 7.4 Done. `the-assistant-cannot-be-trusted-with-a-write` closed as
      `done`, recording that **option 2** was taken, that elicitation was not
      established and therefore not chosen, and what would have to be answered
      before it could be
- [x] 7.5 Done. Scanned before each commit; no credential in the diff

## 8. Found while proving it

Four defects the walk turned up, each fixed with the test that would have
caught it.

- [x] 8.1 A proposed `tradingConfig` travelled inside `changes`, so agreeing
      sent a partial — which BattleGrid does not reject, it *resets what the
      send omits*. Stopping an agent would have cleared every loss cap it ran
      under. The split is now `editArguments`, shared with the edit form,
      which had always done it inline
- [x] 8.2 `reconcile` compared the partial against the whole config object, so
      the difference read "will change" even for an agent already off. It now
      compares member by member for the fields the write merges, named by the
      caller
- [x] 8.3 A proposal the account already satisfied arrived `ready`, so the page
      showed a button to agree above the words "nothing here would change the
      account". `changesAnything` existed for exactly this and was consulted
      only by the component
- [x] 8.4 `readOnlyHint: true` was served for every tool without exception,
      which stopped being true when a tool that records shipped. Now derived
      from the tool's `writes` declaration, checked against whether its
      use-case is a `Command` in `composition.ts`
