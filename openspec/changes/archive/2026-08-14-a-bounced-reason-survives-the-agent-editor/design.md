# Design: A bounced reason survives the agent editor

## Technical Approach

The page mounts `<CarriedProblem problem={query['problem']} />` directly in
each of its seven `<main>` regions, and the form component's hand-rolled
banner becomes a `<CarriedProblem>` of its own. The two mounts carry two
different facts — the bounced reason from the URL at page level, the branch's
own refusal beside the fields — and the page stops forwarding the bounced
reason into the form, which is what makes mounting page-wide safe.

## Decisions

### Decision: Direct per-branch mounts, not a Shell
Chosen because the seven branches carry three different layout shapes
(`max-w-2xl`/`max-w-3xl`, `space-y-4`/`space-y-6`) and a Shell would either
grow a class prop or flatten those differences — a bigger diff carrying a
restyling risk this change does not need. `CarriedProblem` renders null
without a problem, so an unconditional mount per branch is the smallest
honest form of "every branch carries it". Rejected: `/pending/[id]`'s local
`Shell` (one `<main>`, banner inside) because that page's branches genuinely
share one layout and this page's do not. The derived scan counts per
`<main>` region either way.

### Decision: The form's `problem` prop narrows to branch-local refusals
Chosen because the item's own notes name the trap: mounting `CarriedProblem`
page-wide while the compose branch still forwards `query['problem']` into the
form double-renders the same sentence. The page owns the bounced reason; the
form owns the refusal formed while composing (unresolvable preset, refused
describe). Those are different facts (`/pending/[id]` renders both), so the
split is semantic, not cosmetic. Rejected: dropping the form's `problem` prop
entirely and hoisting branch-local refusals to page level — that moves the
refusal away from the fields it refuses, and the describe-refused sentence
names fields.

### Decision: Widen `HAND_ROLLED` in this change, both copies
Chosen because the ledger row's recorded verdict says the `&&` spelling
evades the guard — widening the guard first would fail against
`agent-edit.tsx` while the row still stands, and widening it never leaves the
one-spelling hole open (2026-08-14 roads journal, Watch out). Both the
product-wide matcher and the per-page copy in `CARRY_PROBLEM`'s second test
widen to `\{problem (?:\?|&&)\s*[(<]`, because they assert the same property
and a spelling split between them recreates the defect one matcher over.
Verified before choosing: `agent-edit.tsx:125` is the only `&&` instance in
the tree.

### Decision: The domain boundary is untouched
The page keeps calling use cases only; `agent-edit.tsx` (presentation) keeps
owning the domain-predicate gate. `CarriedProblem` imports nothing. No new
import crosses `app/` → `@/domain` or domain → MCP.

## File Changes

- `app/(app)/agents/[id]/edit/page.tsx` (modified) — seven CarriedProblem
  mounts; compose branch stops passing `problem`; import added.
- `src/presentation/components/agent-edit.tsx` (modified) — banner replaced,
  prop doc rewritten; import added.
- `tests/agent/refusals-reach-the-operator.test.ts` (modified) — matcher
  widened twice, edit page added to `CARRY_PROBLEM`.
- `tests/architecture/a-problem-redirect-is-read-where-it-lands.test.ts`
  (modified) — `KNOWN_SILENT` emptied.
- `tests/rendering/binding.test.ts` (modified) — both-facts rendering test
  added beside the existing refused-edit suite.
