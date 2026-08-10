# Tasks

Ordered by blast radius — how much goes unchecked while the matcher is dead.

**Every repair is verified the same way**: run the mutation runner against the
matcher before the repair (expect `SURVIVED`) and after (expect `KILLED`). A
repair that has not been measured in both states has not been done. Record the
before/after in the commit or the journal, not only here.

## 1. The runner — everything below depends on it

- [ ] Commit the mutation runner as `scripts/mutate-guard.mjs`
      → *Whether A Guard Can Fail Is Answerable On Demand*
      - takes a guard file and one or more literal find/replace pairs
      - backs the file up, applies them, runs vitest on that file alone,
        restores in a `finally` so an error or an interrupt cannot leave the
        working tree altered
      - prints `SURVIVED` (guard passed with the matcher broken — no evidence) or
        `KILLED` (guard failed — evidence)
      - refuses when a find string is absent, rather than silently applying zero
        substitutions and reporting `SURVIVED`
- [ ] Prove the runner in both directions before trusting it against anything
      → *Whether A Guard Can Fail Is Answerable On Demand*
      - `no-population-constants.test.ts` with its alternation killed → `KILLED`
      - the same file untouched → passes
- [ ] Document invocation where someone will find it — a line in
      `docs/checklists/ARCHITECTURE_REVIEW_CHECKLIST.md` beside the guard rules
      → infrastructure

## 2. `boundaries.test.ts` — 11 rules behind one helper

- [ ] Pin `imports()` in both directions: a source fragment whose import it must
      find, and one with no import it must not invent
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Feed the forbidden-import rules a violation each — a domain file importing
      `drizzle-orm`, an `app/` file importing `@/infrastructure`, a `src/` file
      importing `@modelcontextprotocol` outside the two permitted directories
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Pin the console rule against a real `console.log(` and against `logger.log(`,
      which it must not report
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Confirm the helper is shared, not retyped, by the tests that exercise it
      → *A Guard's Proof Exercises The Rule The Product Is Checked With*
- [ ] Measure: helper dead → `KILLED` (was `SURVIVED`, 13/13 green)

## 3. `identifiers.test.ts` — the reference repair

- [ ] Delete the re-declared regexes in `check()` and have it call the same
      expressions the live scan uses
      → *A Guard's Proof Exercises The Rule The Product Is Checked With*
- [ ] Keep every existing PG-301 case passing through the shared rule — the four
      violations and the two permitted forms
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Measure: both live matchers dead → `KILLED` (was `SURVIVED`)

## 4. `mcp-conformance.test.ts` — one predicate, 13 tests

- [ ] Feed `sends()` a call block that supplies an argument and one that does not
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Pin `argsAt()` against a method whose body it must reach past the signature
      — the defect it was written for is a type annotation satisfying the scan
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Measure: `sends()` → `() => true` → `KILLED` (was `SURVIVED`)

## 5. `controls.test.ts` — silenced in both directions

- [ ] Feed the control scan a bare `<input className="…">` it must report and a
      `className={CONTROL}` one it must not
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Make the counting checks consume the same expression as the scan, not a
      duplicate literal
      → *A Guard's Proof Exercises The Rule The Product Is Checked With*
- [ ] Measure both directions: scan dead → `KILLED`; exclusions widened to match
      everything → `KILLED` (both were `SURVIVED`)

## 6. `failure-is-explained.test.ts` — two extractors, corpus floors that miss them

- [ ] Feed both subject extractors a subject that completes the sentence and one
      that does not
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Measure: both extractors dead → `KILLED` (was `SURVIVED`)

## 7. `one-destination.test.ts` — a list nothing exercises

- [ ] Pin the vendor predicate against a scoped package, an exact name, a scoped
      package's subpath, and a BattleGrid model id string it must not report
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Measure: `VENDOR_CLIENTS` emptied → `KILLED` (was `SURVIVED`)

## 8. `proposals-are-inert.test.ts` — the two that remain

- [ ] Pin the describe-use-case rule: a `describe*` name it must report, an
      ordinary read use-case it must not
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Pin the propose-block token rule against a block naming a confirmation and
      one that does not
      → *An Architecture Guard Is Proven By A Violation It Catches*
- [ ] Measure both → `KILLED` (both were `SURVIVED`)

## 9. Close out

- [ ] `./scripts/ci.sh` green
- [ ] Re-run every mutation in this file end to end and record the table
      → *Whether A Guard Can Fail Is Answerable On Demand*
- [ ] Update GitHub #87 with the result and close it if nothing in scope remains
      blind; file what is deliberately left (reachability residuals,
      `confirmation-is-human` narrowing) as its own backlog item **with a mirrored
      issue**, per the tracking doctrine
