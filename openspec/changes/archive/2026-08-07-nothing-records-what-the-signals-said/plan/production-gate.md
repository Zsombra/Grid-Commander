# Production Gate — nothing-records-what-the-signals-said

- Gate decision: **PASS**
- Decided: 2026-08-07 08:35 UTC
- Auditor: production-gate audit, this session (same agent as executor — the
  scans below were run mechanically against the tree, not recalled)
- Evidence window: `84ea2dd..c1ee554` (two execution commits, one verifier
  remediation commit, one audit remediation commit)
- Touched paths: 58 files per `git diff --name-only` over the window,
  matching the master plan inventory as reconciled (no drift found)

## Handoff Integrity

| Check | Result |
|---|---|
| Master plan final line `EXECUTION READY FOR PRODUCTION GATE` | VALID |
| Execution TODO fully checked or tracked | VALID — 31/32 tasks checked; 8.2 open, annotated, tracked as `the-recorder-is-unproven-against-live` |
| Review artifacts on disk with path-level evidence | VALID — data / architecture / uiux, all `EXECUTION EVIDENCE COMPLETE` |
| Decision log has planner + executor entries | VALID — DL-001..006 planning, DL-007..012 execution |
| Inventory vs `git diff --name-status` | VALID — execution additions recorded in the inventory (`added in execution` rows) |

## Spec Parity — every requirement, a verdict

`openspec.py validate --strict`: clean. 9/9 ADDED requirements delivered;
0 MODIFIED/REMOVED/RENAMED in this change. 21/21 scenarios test-covered
(`verification.md` maps each; the one previously-uncovered error scenario
was closed by the verifier round, `tests/recording/cli-spawn.test.ts`).

| Requirement (capability) | Verdict | Evidence |
|---|---|---|
| A Capture Records What Every Signal Said (`signal-recording`) | DELIVERED | `capture-signals.command.ts` (per-coin loop, clock stamps, version once per run); `signal-preview-mapper.ts`; `market-adapter.ts` `coinSignalPreview`; `tests/recording/capture.test.ts`, key-gated live probe |
| The Platform's Answer Is Kept Whole (`signal-recording`) | DELIVERED | `signal_captures.raw` jsonb; `appendCapture`/`appendFailure` store it; `rawAnswer` retrieves it; `tests/db/signal-record.test.ts` proves unmapped keys round-trip |
| A Failed Read Is A Recorded Gap, Not Silence (`signal-recording`) | DELIVERED | per-coin isolation incl. thrown-read belt; failed rows with reasons; `capture.test.ts` three failure tests |
| The Record States Its Own Coverage (`signal-recording`) | DELIVERED | `deriveSeriesCoverage` (one gap definition); `read-record-coverage.query.ts` (never-recorded / unreadable / neverCaptured kept apart); `coverage.test.ts`, `rendering/recorder.test.ts` |
| Recorded History Is Readable By Coin And By Signal (`signal-recording`) | DELIVERED | `read-signal-history.query.ts`; `/recorder/[ticker]`; capture-time on every rendered reading (stamp-count asserted) |
| A Capture Runs Unattended And Refuses Without Authority (`signal-recording`) | DELIVERED | `bin/grid-commander-record.ts`; `exitCodeFor` pure; both refusal paths spawn-tested on the real process |
| The Coins Captured And Why Are Recorded (`signal-recording`) | DELIVERED | `resolveSubjects` (named / deployments / covered-nothing with reasons); provenance persisted on runs, rendered by `ProvenanceLine` |
| The Record Belongs To The Account That Captured It (`signal-recording`) | DELIVERED | ownership in the WHERE on every store read; cross-account db test |
| The Recorded Signal History Is Readable By A Model (`mcp-control`) | DELIVERED | two table entries → same queries; gap/never-recorded/unreadable crossings tested; read-only + annotation + no-count guards green |

Regression: `mcp-control`'s standing requirements re-verified against the
merged tree (`mcp-read-only` 12/12, `annotations`, description rules);
`app-access` reachability derivations updated and green — the new section is
reachable from the one nav. No existing requirement weakened.

Unspecified behavior: none found in runtime code. The guard refinement
(DL-008) is test infrastructure; the section-nav row satisfies existing
reachability requirements.

Scope adherence: diff checked against the proposal's Out of Scope — no
analysis layer, no evaluation persistence, no weighted capture, no
scheduler, no retention controls. The two deviations beyond the Impact
estimate (third table; guard refinement) are decision-logged (DL-008/009),
in service of declared scope.

Task honesty: spot-checked six `[x]` rows against code (2.1 migration, 3.1
mapper keep-rate print, 6.4 provenance rendered, 7.1 tool entries, 9.1
surface map counts, 10.2 scenario walk) — all real.

## Checklist Parity

- **Data pipeline**: layer matrix in `data-review.md` verified — the Iron
  Rule holds (derivations only in domain/use-case; components format only;
  no `??` masking absence in touched paths — see scan notes), snapshot
  honesty (every reading timestamped).
- **Architecture**: dependency direction (`boundaries` green), P1–P6
  (capture goes through the guarded call path; no audit row per DL-004;
  one way in preserved — the CLI reaches BattleGrid only through `app()`).
- **UI**: read-only surfaces; state coverage asserted per-state in rendering
  tests; tokens only.

## Technical Debt Scans

| Scan | Result |
|---|---|
| Conflict markers (repo-wide) | clean |
| `TODO\|FIXME\|HACK\|XXX\|deprecated\|legacy` on touched paths | clean |
| Dual-path / fallback hints on touched paths | clean (one comment match in a neighbour file, prose) |
| `??` fallback masking on touched paths | no masking: hits are explicit-absence sentences (`?? 'no reason was recorded'`, `?? 'unknown'` rendered as the word), the documented null-on-unknown version contract, and pre-existing lines. Recorded, not violations |
| NUL/binary in source | **PG-001, found and fixed this round** |
| Stale exports | every new export has active call sites; `SignalRecordStore.rawAnswer` noted (PG-002) |

## Quality Gates (rerun after remediation, 2026-08-07 08:34 UTC)

| Gate | Result |
|---|---|
| harness + spec validation | PASS |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` (vitest, 1878) | PASS |
| drizzle-check (`db:generate` diff clean) | PASS |
| migrate + `npm run test:db` (80) | PASS |
| `npm run build` | PASS |
| freshness | named skip — no `BATTLEGRID_API_KEY` in this environment |
| serving | named skip — opt-in |

## Violations

| ID | Severity | Category | Requirement | Evidence | Impact | Required fix | Status | Owner | Verification note |
|---|---|---|---|---|---|---|---|---|---|
| PG-001 | MAJOR | OTHER | — | `rg` reported `drizzle-signal-record-store.ts` as *binary*: a literal `\0` in the `recordedSeries` grouping key (offset 7696), found by the audit's fallback scan refusing to read the file | Every future text scan silently skips the file — the guard-evasion shape this repo's checks exist to prevent; also a typo'd separator diverging from the fake's key format | Replace `\0` with the space the in-memory fake uses | FIXED | executor | Commit `c1ee554`; `rg '\?\?' <file> -n` now returns text matches; full CI green after fix |
| PG-002 | MINOR | STALE_CODE | The Platform's Answer Is Kept Whole | `SignalRecordStore.rawAnswer` has no production call site — only `tests/db/signal-record.test.ts` retrieves | An unread retrieval path can rot unnoticed once the analysis layer arrives wanting it | None now: the method *is* the requirement's retrieval guarantee and is db-proven; the first product consumer belongs to the analysis layer | WONTFIX (tracked) | — | Noted in `recorded-signals-are-not-yet-evidence` (the analysis item that will consume it); db test keeps the contract exercised meanwhile |

Open violations: **0** (1 FIXED, 1 MINOR tracked-by-item per the backlog
handoff rule).

## Decision

**PASS** — zero open violations; all quality gates pass; spec parity 9/9
with every scenario covered; the one deferred proof (first live capture) is
a tracked item whose absence was declared from the proposal onward, not
discovered here.

Next: **archiver**. A PASS that never archives leaves `openspec/specs/`
stale — the deltas must merge so the next change measures against the truth
this one made.
