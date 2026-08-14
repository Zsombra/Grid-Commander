# Tasks

## 1. The two roads arrive

- [x] 1.1 `app/(app)/strategies/[id]/edit/page.tsx`: add `problem` to the
      `searchParams` type, read it, and mount `<CarriedProblem>` on every
      render branch (strategy-missing, strategy-unreadable, composer, and the
      compiled-review path). (→ scenario "The refusal lands where the
      operator was standing")
- [x] 1.2 `src/presentation/components/plan-review.tsx`: optional `tagline`
      and `sections` props rendered as hidden inputs in the apply form; the
      edit page passes what it composed from. (→ design decision: recompile)
- [x] 1.3 The `apply` action's `onRefused` redirect rebuilds
      `compile=1&tagline=…&sections=…&problem=…` from the form data, so a
      refused apply lands on a recompiled review with the refusal above it.
      (→ scenario "The four causes are told apart" — expired means review
      again)
- [x] 1.4 `app/(app)/agents/[id]/archive/page.tsx`: mount `<CarriedProblem>`
      on the non-proposal branch, satisfying the `<main` == `<CarriedProblem`
      count. (→ scenario "The refusal lands where the operator was standing")

## 2. The relation becomes a check

- [x] 2.1 `tests/architecture/a-problem-redirect-is-read-where-it-lands.test.ts`:
      derive every `problem=` mint from the UI roots, resolve each redirect
      template to the page serving its route, and report targets that do not
      read `problem` or do not mount `<CarriedProblem>` on every `<main`
      branch. Run twice: production roots expect zero, the fixture root
      expects exactly the plant. (→ scenario "The landing surface is a
      checked property, not a remembered one")
- [x] 2.2 `tests/architecture/fixtures/problem-redirects/`: a miniature app
      tree with one page minting `?problem=` to its own route and not reading
      it — comments describing, never spelling, the scanned idioms.
- [x] 2.3 Run the new check's first honest pass over production; fix or file
      (with evidence) anything it names beyond the two known instances, and
      record the outcome here.

### First honest pass — outcome

Three targets named beyond the two known instances, and one of them changed
the check itself:

- **`strategies/[id]/conditions/save`** — the count said 9 branches / 1
  carried, and that was the *check's* defect, not only the page's: the page
  factors its banner into a shared `const head` fragment rendered on seven
  branches, which a textual count cannot see. The property became per-branch
  with fragment resolution (design.md, revised decision). The page's real gap
  was its two early branches, reached before `problem` was read — **fixed**:
  read hoisted above the earliest branch, both branches mount.
- **`strategies/[id]/rules/[signalId]`** — six of eight branches bare, all
  genuinely: three reachable by a bounce whose strategy has since gone
  missing/unreadable/rule-less, three by stale links. **Fixed**: read
  hoisted, all six mount; the `Cannot retune` branch now renders both facts
  (the bounced reason and its own), per `/pending`'s doctrine.
- **`agents/[id]/edit`** — renders refusals its own way (`AgentEditForm`'s
  hand-rolled banner, which also evades the product-wide `HAND_ROLLED`
  matcher via the `&&` spelling); four branches drop a bounced reason, two
  overwrite it. Not a mechanical mount — **filed** as
  `the-agent-editor-reads-a-refusal-its-own-way` (#255) and carried as the
  scan's one `KNOWN_SILENT` ledger row, asserted in both directions so the
  row cannot outlive the defect.

## 3. The guard can fail

- [x] 3.1 Mutate the new scan at its real weak points — the mint matcher, the
      route resolution, and the branch count — confirm red, revert, confirm
      green; record each measurement below. (→ scenario "The landing surface
      is a checked property…", the planted-offender clause; requirement "A
      Gating Check Fails When Its Own Scan Goes Blind")

### Results

Four mutations via `tools/mutate-guard.mjs`, four **KILLED**, green on every
revert:

- **M1 — the inline mint arm killed** (`(?<!\w)problem=` → `problemX=` in the
  query test): the fixture's plant mints inline, so the plant went unreported
  and its test went red naming the fixture.
- **M2 — the URLSearchParams arm killed** (both the initialiser key pattern
  and the `.set`/`.append` literal): the `/agents/new` and fork-page pins
  derive only through that arm, and both fell out of the target set — red.
  Two substitutions, one per spelling the product writes.
- **M3 — dynamic route resolution killed** (`'[^/]+'` → `'ZZZ'`): every mint
  to a `[param]` route became "no page serves that route" — fail-closed and
  loud, which is the designed direction for resolution loss.
- **M4 — the branch matcher killed** (`<main[\s>]` → `<mainX[\s>]`): every
  target reported "no render branch was found — the scan cannot see this
  page" — fail-closed and loud.

## 4. Verification

- [x] 4.1 Quality gates, run 2026-08-14: typecheck green · lint green ·
      `npm test` **2393 passed** (2373 before the change; the new scan plus
      derived per-branch growth in the rendering suites) · build green ·
      `db:generate` no-op ("No schema changes") · `test:db` **skipped** — no
      local `DATABASE_URL`, and this change touches no db surface.
- [x] 4.2 Full architecture suite **352/352** with both fixture trees in
      place — no unrelated scan reports either plant. (→ design decision:
      fixture mechanics)
- [x] 4.3 All four fixed pages pass the new scan's per-branch property, and
      `refusals-reach-the-operator.test.ts` stays green unmodified —
      **49/49**.
