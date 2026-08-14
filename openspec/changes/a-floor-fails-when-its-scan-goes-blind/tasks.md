# Tasks

## 1. Inventory

- [x] 1.1 Walk every file in `tests/architecture/` and classify each vacuity
      guard: **(a)** floor computed from the rule's own machinery, **(b)**
      floor counting an independent pattern, **(c)** offender scan with no
      floor. Record the table here (file · rule mechanism · guard mechanism ·
      class · action). Pinned-list guards are noted as out of scope, per the
      proposal. (→ requirement, all scenarios — the table is what scopes them)

### The table

All 28 files read in full. One (b). No (c). Classes: **(a)** floor/guard from
the rule's own machinery · **(b)** independent pattern · **pinned** positive
assertions on named files/artifacts that fail loudly on blindness, so they
cannot go vacuous by the found-nothing route (out of scope per the proposal) ·
**n/s** not a scan at all.

| file | rule mechanism | guard mechanism | class | action |
|---|---|---|---|---|
| a-create-carries-a-dedupe-key | regex pins on two named files | negatives paired with positives on the same extraction | pinned | none |
| a-form-sends-what-its-action-reads | action→form resolver, missing-field diff | `pairs ≥ 8` + unresolved-form loudness, both from the pair machinery; two-way ledger | (a) | none |
| a-refusal-reaches-the-person | `SPENDS` selector + protection checks | `spenders() ≥ 11` pinned at true count, from the rule's own selector (PR #235 fix) | (a) | none |
| boundaries | import/pattern scans over `src` | matcher proofs both directions, temp-file fixtures, corpus-resolution pins (#87) | (a) | none |
| confirmation-binds-values | `targets()` vs `isAcceptable` | `built ≥ 10` + spread from `targets()`; `isAcceptable` fed accept/reject | (a) | none |
| confirmation-is-human | `serverActions()` + MINTS/PERFORMS | `actions > 8` + both matchers shown live on the real tree | (a) | none |
| controls | `controlTags`/`buttonTags`/`labelBlocks` | floors counted through the same scanners; matcher proofs both directions (#87) | (a) | none |
| db-suite-refuses-a-live-database | behavior tests of `assertDisposable` | accept + reject cases | n/s | none |
| deploy-doc | must-match pins on `docs/DEPLOYING.md` | positive matches fail loudly | pinned | none |
| deployable | must-match pins on Dockerfile/entrypoint | negatives paired with positives on the same `stripComments` output | pinned | none |
| **every-perform-says-it-is-working** | `inAction` line walk; `<PerformButton` tag matcher | **was**: count of files containing the literal `<PerformButton` (≥ 10) — independent of both rules | **(b)** | **converted** — both scanners are functions of their roots, run twice: production roots expect zero, `fixtures/every-perform/` expects exactly the two plants; walk floored via its own `filesUnder` |
| failure-is-explained | `unreadableBranches()` + `explains` | floors from the branch machinery; unparsed-branch loudness; subject-matcher proofs; exemptions checked both ways | (a) | none |
| granted-scopes | `suppliers()` scan | pass state is positive equality with the one named supplier — blindness fails loudly; corpus pins | (a) | none |
| identifiers | `nullishFallbacks`/`ternaryFallbacks` | corpus pin + PG-301 replayed against the live matchers (#87 fix) | (a) | none |
| live-probes-are-named | vitest/tsc asked for their own resolution | positive set-equality against the on-disk denominator | (a) | none |
| live-writes | `reachIn` (tools + commands + helpers) | `MUTATING > 20` from the surface record; `reachIn` fed offender + clean; `commandCanWrite` pinned both ways | (a) | none |
| mcp-conformance | `argsAt` + `sends` vs the surface record | `sends` fed accept/reject; `argsAt` throws on unfound; classification-field reality pins | (a) | none |
| mcp-read-only | reachability chain over four derivations | per-link floors from the chain's own intermediates; positive pins both directions; unresolved fails | (a) | none |
| no-population-constants | `transcribedFloors` sweep | corpus floor from the sweep's own loop; matcher fed four violations + clean | (a) | none |
| oauth-conformance | equality against recorded metadata | artifact-content guard; the one negative paired with positive extractions on the same source | pinned | none |
| one-destination | `outboundHosts()` + `isVendorClient` | host rule is positive equality (exactly BattleGrid); predicate fed catch/leave (#87 fix) | (a) | none |
| payload-conformance | `violations()` vs record | the historical defect replayed and required to be found (exactly 8); gutted payload; no-variant refusal | (a) | none |
| proposals-are-inert | SCHEDULES + perform/mint matchers | every matcher fed catch/leave; positive controls for the `not.toContain` literals (#87 fix) | (a) | none |
| reachability | form/action/href matchers, walks | floors through the shared matchers; matcher proofs; live-tree matcher-reachability pin (#87) | (a) | none |
| surface-freshness | version agreement across records | refusal driven by temp-dir fixtures (#198 fix) | (a) | none |
| tools-write-lf | `textWrites` + newline/encoding predicates | `writes > 4` computed via `textWrites`, the rule's own selector; wb/w cases | (a) | none — remark: the inline `newline=`/`encoding=` predicates are themselves unproven; the floor covers the selector, not the predicate. Trivial regexes, left alone; a sweep item if it ever bites |
| wire-values | payload leaves vs `input_constants` | sentinel path list from the walk's own output; the two known-bad values pinned in the record | (a) | none |
| write-results | `executeSites()` + ledger | `sites ≥ 30` from `executeSites()`; unreadable-wrapper loudness; positive production pin | (a) | none — the named day-one (a) |

Pinned-list ledgers (`KNOWN_DROPPED`, `KNOWN_UNSENDABLE`, `EXEMPT`,
`CALL_SITES`, `READS`) are out of scope per the proposal: asserted in both
directions, a stale row fails loudly.

## 2. Conversion

- [x] 2.1 `every-perform-says-it-is-working.test.ts` — the named (b): extract
      the `inAction` walk into a function of its root, add
      `tests/architecture/fixtures/every-perform/` carrying a bare
      `BUTTON_SECONDARY` submit inside a `<form action=`, assert the fixture
      offender is found while the production tree stays clean.
      (→ scenario "A planted offender goes unreported")
- [x] 2.2 Convert every other (b) and (c) from the 1.1 table — **the table
      found none**. The one file with two (b)-guarded rules was the named one;
      its second rule (the empty `pendingLabel` scan, guarded by the same
      independent count) was converted in the same pass: a second plant in the
      same fixture, run twice the same way. The independent
      `<PerformButton`-count floor was removed with both its dependents
      converted; the production walk is floored through the scan's own
      `filesUnder` instead (the one blindness a fixture run cannot see: a root
      dropped from the production list). (→ scenario "The scanner breaks while
      the sources stand")
- [x] 2.3 Leave every (a) untouched, and say so in the table — done; 24 rows
      say none. A working guard rewritten for uniformity is churn, not
      hardening.

## 3. The guards can fail

- [x] 3.1 For each converted guard, mutate the scanner at its real weak point,
      confirm the guard goes red, revert, confirm green. Recorded in Results.
      (→ scenario "The guard can itself fail")

### Results

Four planned measurements, all **KILLED**; and one unplanned finding the
red-run requirement itself surfaced (M0), which is the section's real yield.

- **M0 — the fixture's own comment latched the walk.** The first fixture
  header quoted the form-open idiom verbatim in prose. The scanner reads
  comments (a property of the rule, unchanged by this change), so the walk
  latched on the *documentation*, and the plant was "found" through a form the
  comment had opened: the M4 mutation below stayed **green** on its first run.
  A mutation that fails to go red indicts the fixture, not the scanner. Header
  rewritten to describe both idioms without spelling either; M4 re-run red.
  Lesson: a fixture must not spell the idiom it plants anywhere outside the
  plant itself.
- **M1 — the `inAction` latch killed** (`mutate-guard.mjs`:
  `ln.includes('<form action=')` → `'<form  action='`): **KILLED** — the
  production rule passed vacuously, exactly the historical blindness, and the
  fixture test went red naming the lost plant.
- **M2 — the tag matcher killed** (`/<PerformButton\b[\s\S]*?>/g` →
  `/<PerformButtonX\b…/g`): **KILLED** — the planted empty label went
  unreported and its guard went red.
- **M3 — the submit matcher loosened** (`type="submit"` → `type="submitted"`,
  2 substitutions — one live regex, one inert comment): **KILLED**.
- **M4 — the design-named weak point, measured** (fixture's first form open
  tag broken across two lines, by hand): "reports the planted bare submit"
  went **red** (plant lost) while the other four stayed green; reverted, 5/5
  green. This is the walk's real boundary: a multi-line open tag is invisible
  to a line walk. Prettier keeps production tags on one line; the fixture
  header now pins the shape and names this measurement.

## 4. Verification

- [x] 4.1 Quality gates, run 2026-08-14: `npm run typecheck` green ·
      `npm run lint` green · `npm test` **2373 passed / 185 files** (net +2:
      the converted file carries 5 tests where it carried 3) ·
      `npm run build` green · `npm run db:generate && git diff --quiet
      drizzle/` no-op ("No schema changes") · `npm run test:db` **skipped** —
      no local `DATABASE_URL`, and this change touches no db surface (tests
      only, no production code).
- [x] 4.2 Confirm no fixture offender is reported by any scan other than its
      own — full architecture suite run after the conversion: **347/347**, no
      unrelated test red on the fixture tree. (→ design decision: fixtures
      outside every production scan root)
