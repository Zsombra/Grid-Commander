# Tasks

## 1. The page carries the bounced reason on every branch

- [x] 1.1 `app/(app)/agents/[id]/edit/page.tsx`: import `CarriedProblem`;
      mount `<CarriedProblem problem={query['problem']} />` in all seven
      `<main>` regions (roster-unreadable, no-such-agent, no-catalog,
      compose, unresolvable-preset, describe-refused, confirm).
- [x] 1.2 Compose branch: stop passing `problem={query['problem']}` into
      `AgentEditForm` — the page-level mount now owns the bounced reason
      (double-render guard; design decision 2).

## 2. The form joins the one shared treatment

- [x] 2.1 `src/presentation/components/agent-edit.tsx`: replace
      `{problem && <p role="alert" …>}` with
      `<CarriedProblem problem={problem} />`; import the component.
- [x] 2.2 Re-document the `problem` prop: it carries a refusal formed on the
      rendering branch (unresolvable preset, refused describe), never the
      bounced `?problem=` — that one is the page's to render.

## 3. The guards move with the fix, not before it

- [x] 3.1 `tests/architecture/a-problem-redirect-is-read-where-it-lands.test.ts`:
      delete the `KNOWN_SILENT` row (the ledger only shrinks; the stale-row
      direction enforces this once the page carries).
- [x] 3.2 `tests/agent/refusals-reach-the-operator.test.ts`: widen
      `HAND_ROLLED` and the per-page copy (line ~170) to
      `\{problem (?:\?|&&)\s*[(<]`.
- [x] 3.3 Same file: add `app/(app)/agents/[id]/edit/page.tsx` to
      `CARRY_PROBLEM` (7 mains, 7 mounts; second test now also holds the
      widened spelling against it).

## 4. Verification

- [x] 4.1 New rendering test (beside `a refused edit keeps what was entered`
      in `tests/rendering/binding.test.ts`): with
      `review=1&pmPreset=NOT_A_PRESET&problem=<bounced>` both sentences
      render — the bounced reason and the unresolvable-preset refusal — as
      two facts (scenario: a fresher refusal does not replace a carried one).
      Passing.
- [x] 4.2 `npm test` — the derived scan passes with an empty ledger in both
      directions, the widened guard passes product-wide, and the refused-edit
      rendering pins stay green. **Mutation-tested red-then-green**: M1
      (hand-rolled `&&` banner restored in `agent-edit.tsx`) killed by the
      widened `HAND_ROLLED`; M2 (one page mount removed) killed by BOTH the
      derived scan (no exemption row left to hide behind) and the pinned
      per-branch count. Both reverted; suites green after.
- [x] 4.3 Full gates: typecheck 0, lint 0, **2404 vitest / 188 files**,
      build 0, drizzle no-op ("No schema changes"); `npm run test:db`
      skipped — no local `DATABASE_URL`.
