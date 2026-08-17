# Tasks

## 1. The probe

- [x] 1.1 **DONE** — `tests/live/residue-probe.test.ts`, opt-in on
      `BATTLEGRID_API_KEY` (`describe.skip` without one), with a header stating
      what it proves and, explicitly, that a green run means *unchanged* and
      never *fine* — nothing here can delete an agent.
- [x] 1.2 **DONE** — reads through `McpAgentAdapter.listAgents`, which already
      sends `statuses: ['ACTIVE','ARCHIVED']`. Hand-building the call is how
      #201's first version got the answer wrong (it guessed `includeArchived`,
      which the tool rejects, then read the ACTIVE-only default and concluded
      the rest was uncheckable); the file says so at the call site.
- [x] 1.3 **DONE** — classification is by exclusion against `OPERATORS_OWN`,
      with the reason written in the file: the nine residue agents known before
      today share the prefixes `GC probe` and `Grid-Commander probe`, and the
      tenth is `Probe 238 Dedupe`, which shares neither. **A prefix match would
      have missed exactly the create this check exists for.**
- [x] 1.4 **DONE** — fails above `RESIDUE_AT_LAST_COUNT`, and the message names
      the offending rows plus the order to follow: find what created it, record
      it in #201, *then* raise the constant. Never raise it first.
- [x] 1.5 **DONE** — vacuity guard asserts the roster answered `kind: 'agents'`
      and that the allowlist matched at least one row, with a message
      distinguishing "the allowlist has gone stale" from "the account gained a
      throwaway". Those are different findings and must not arrive alike.

## 2. Gates

- [x] 2.1 **DONE** — `npx tsc --noEmit` clean.
- [x] 2.2 **DONE** — `npm run lint` clean.
- [x] 2.3 **DONE** — `npm test`: **2710 passed / 1 failed across 212 files**.
      The failure is **not this change**: `tests/rendering/new-agent.test.ts`
      timed out at 5000 ms in the full run and passes alone in 512 ms. That is
      the signature of **#330**, and this is a *second* file showing it — the
      evidence is recorded on that item. This change adds a live probe, which
      the offline suite excludes by config (asserted in 2.4).
- [x] 2.4 **DONE** — `tests/architecture/live-writes.test.ts` (7) and
      `live-probes-are-named.test.ts` (10) both pass, including *"the live suite
      selects every probe file"* and *"the offline suite selects none of them"*,
      so the new file is correctly on the live side of that boundary and names
      no mutating tool.
- [x] 2.5 **DONE in substance, and stated precisely.** The probe file itself was
      **not executed** — that needs `BATTLEGRID_API_KEY`, and this session did
      not go looking for the operator's credential. What was validated instead
      is the thing the probe asserts, against the same live roster, read over
      the authenticated MCP connector at v19.2.0 on 2026-08-16:

      ```
      total agents 16 | operator's own 6 | residue 10
      Breakwater, Quadratorum, THE .0, Undertow, Vanguard, Volatilis   <- own
      GC probe 1315 / 1315b / renamed x3 / shape II
      Grid-Commander probe (off) x3 / Probe 238 Dedupe                  <- residue
      every residue row ARCHIVED, tradingMode OFF
      slotUsage limit 3, used 3, remaining 0
      ```

      So `RESIDUE_AT_LAST_COUNT = 10` is the measured figure, the allowlist
      matches exactly six rows, and the exclusion rule classifies
      `Probe 238 Dedupe` as residue where a prefix rule would not. Running the
      file with a key is the operator's to do and would add only the assertion
      wrapper around this same read.
- [x] 2.6 **DONE** — `validate --all` 0 errors, standing warning count.

## 3. Record

- [x] 3.1 **DONE** — `Probe 238 Dedupe` traced to `openspec/JOURNAL.md`: an
      operator-authorized hand walk for the #238 dedupe probe. Recorded on
      #201, which closes its open question — *"'widen the fixture' must name
      that path"* — with **there is no such path in code**.
- [x] 3.2 **DONE** — #201 stays open. It is the standing record of the ten rows,
      which nothing can remove. **Corrected 2026-08-16 by the operator**: this
      line said "which only the operator can remove in BattleGrid's own UI" —
      there is no delete on BattleGrid's platform either, so the count is
      permanent and the threshold is a floor, not a budget.
