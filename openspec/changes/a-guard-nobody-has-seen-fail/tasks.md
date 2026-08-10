# Tasks: A Guard Nobody Has Seen Fail

Every repair is finished when the **same mutation that survived** is re-run and
comes back KILLED. Recording the mutation beside the fix is the point — a repair
nobody has seen catch anything is the defect this change is about.

## 1. The method, first — so every repair below can be verified

- [x] 1.1 Add the mutation runner as a repository command. It takes a test file
      and one or more literal find/replace pairs, backs the file up, applies
      them, runs that file through vitest, restores the file, and prints KILLED
      or SURVIVED.
      *Requirement: The Mutation Check Is A Command In The Repository*
- [x] 1.2 Restore in a `finally`, so a crash mid-run cannot leave a mutated file
      on disk. An earlier session left a stray `__mutant.test.ts` behind and it
      was swept into a commit by `git add -A`.
      *Scenario: The run ends*
- [x] 1.3 Refuse when the find text is absent, with a non-zero exit. Silently
      running an unmutated file and printing KILLED would make the tool lie in
      the one direction that matters.
      *Scenario: The text to alter is absent*
- [x] 1.4 Prove the runner against the control: `no-population-constants` with
      its alternation killed must report KILLED, and a no-op substitution on the
      same file must report SURVIVED. A runner that only ever says KILLED is as
      useless as a guard that only ever says pass.

## 2. `boundaries.test.ts` — the dependency rule, blind from one line

- [x] 2.1 Prove `imports()` directly: real import shapes it must find
      (`from '@/ports/x.js'`, double and single quoted, `export … from`,
      multi-line), and content it must not report.
      *Scenario: The matcher stops matching*
- [x] 2.2 Assert it resolves known-true imports from **real source** — the
      `confirmation-is-human` pattern, which is stronger than a corpus floor and
      is the one thing in this directory that survived its mutation.
- [x] 2.3 Prove the rules that do not go through `imports()` in the same file:
      the `console.*` scan and the `REQUESTED_SCOPES` extraction.
- [x] 2.4 Verify: `imports()` → returns `[]` must now FAIL. Re-run the exact
      mutation from the proposal.

## 3. `identifiers.test.ts` — repair the reference implementation

- [ ] 3.1 Hoist the two patterns so the live scan and the proof call the same
      thing. `check()` currently re-declares both verbatim.
      *Scenario: The proof re-states the rule instead of calling it*
- [ ] 3.2 Keep every existing PG-301 / PG-003 case working through the shared
      matcher, including the two permitted forms.
- [ ] 3.3 Verify: killing both live `matchAll` call sites must now FAIL.

## 4. `mcp-conformance.test.ts` — the permissive direction

- [ ] 4.1 Prove `sends()` in both directions: an argument genuinely built at the
      call site, and one absent from it.
      *Scenario: The matcher matches everything*
- [ ] 4.2 Prove `argsAt()` returns the call block rather than the type
      signature — the miss the file's own comment records.
- [ ] 4.3 Prove the unclassified-tool arm, which matches nothing today and so
      would not notice its own death.
      *Scenario: The rule has nothing to find today*
- [ ] 4.4 Verify: `sends()` → `() => true` must now FAIL.

## 5. `controls.test.ts` — silenceable in both directions

- [ ] 5.1 Prove the control-tag scan against real markup: a bare
      `<input className="…">` must be reported, `className={CONTROL}` and a
      hidden input must not.
- [ ] 5.2 Make the counting check use the same matcher as the scan rather than
      its duplicate literal, so widening one cannot leave the other satisfied.
- [ ] 5.3 Verify both mutations: scan → matches nothing must FAIL; exclusions
      widened to match everything must FAIL.

## 6. `failure-is-explained.test.ts` — two extractors, one floor that misses both

- [ ] 6.1 Prove both subject extractors: a subject that completes the sentence
      and one that does not, in each of the two shapes (`subject="…"` literal
      and the wrapper prop).
- [ ] 6.2 Verify: both extractors → match nothing must now FAIL.

## 7. `one-destination.test.ts` — a rule with nothing to find

- [ ] 7.1 Prove the vendor-client predicate against names it must catch
      (`@anthropic-ai/sdk`, `openai`, `groq-sdk`) and names it must not (`next`,
      `postgres`, and a BattleGrid model id, which is a string and not a
      package).
      *Scenario: The rule has nothing to find today*
- [ ] 7.2 Verify: emptying the vendor list must now FAIL.

## 8. `proposals-are-inert.test.ts` — the last two matchers

- [ ] 8.1 Prove the describe-use-case matcher: a use-case name that mints a
      confirmation must be caught, an ordinary read must not.
- [ ] 8.2 Prove the propose-token matcher against a block that names a token and
      one that does not.
- [ ] 8.3 Give the `record-proposal` checks a positive control — the literals
      they forbid must be shown to appear in a file that genuinely mints a
      confirmation, or the rule is asserting the absence of a spelling nothing
      uses.
- [ ] 8.4 Verify: both mutations must now FAIL.

## 9. Close out

- [ ] 9.1 Re-run every mutation in the proposal's table and record the result.
      Seven SURVIVED must become seven KILLED; the control must stay KILLED.
- [ ] 9.2 `./scripts/ci.sh` green. No guard may change what it forbids — a
      repair that alters a rule's meaning is a bug in the repair.
- [ ] 9.3 Update #87 with the closing measurement, and close it if nothing is
      left but the stated `confirmation-is-human` residual. If that residual
      stays open, it gets its own backlog item and issue rather than keeping a
      closed finding open.
