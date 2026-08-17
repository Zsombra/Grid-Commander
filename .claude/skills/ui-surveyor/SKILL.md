---
name: ui-surveyor
description: Developer-side half of the design handoff. Reads the actual UI code and emits or refreshes a UISurface manifest — components, states, data, actions, and the constraints a design must not break. Use after building or changing a UI, before handing it to the design agent, or when a surface is reported stale.
---

# UI Surveyor

## Lane

This skill owns the **dev → design** direction of the DTO.

It reads code and writes `openspec/design/surfaces/<surface-id>.json`.

It does NOT:
- Write or modify production code.
- Make any visual decision. It reports what exists; it does not say what should exist.
- Write design tickets — that is the `design-director`.

## Read First

`.claude/references/design-contract.md` §4 — the `UISurface` shape. It is the
contract; do not improvise fields.

---

## Why the quality of this file decides everything downstream

The design agent cannot see your code. This manifest is the entire world it
gets to design against. Two failure modes, both expensive:

- **A missed state** produces a design that looks broken exactly when users
  notice — the empty list, the failed request, the slow network.
- **A missed constraint** produces a beautiful design the developer then has to
  reject, wasting a full round trip.

Survey the code, not your memory of it.

---

## Workflow

### Step 1: Scope the surface

A surface is a route, screen, or major panel — something a user would name.
`/checkout/payment`, not `PaymentForm.tsx`. If a page has two independent
regions that would be designed separately, they can be two surfaces.

Derive a kebab-case `id`. Existing manifest? Refresh it in place, keeping the
`id`, rather than creating a second one.

### Step 2: Read the code

Actually read it — the route component, its children, its hooks, its styles.
Do not infer a component tree from filenames.

For every component that a designer would treat as a unit, capture:

| Field | Where it comes from |
|---|---|
| `id` | kebab-case, stable, survives a rename of the file |
| `role` | `container`/`input`/`display`/`action`/`navigation`/`feedback`/`media`/`layout` |
| `purpose` | one sentence, in user terms, not implementation terms |
| `states` | **every** branch that renders differently — see below |
| `data` | what it reads |
| `actions` | what the user can do, and the effect of each |
| `current_implementation` | one line — honest about how plain it is |
| `constraints` | what a design must not break |
| `children` | ids of nested components |

### Step 3: Enumerate states exhaustively

This is the step that matters most. Walk the code for every conditional render,
not just the ones with obvious names. Check for:

- `loading` — is there an async boundary, a suspense, a pending flag?
- `empty` — what renders when the list has zero items?
- `error` — request failure, validation failure. Are they different states?
- `disabled`, `readonly`, `focused`, `selected`, `hover`
- `partial` / `stale` — cached or optimistic data showing while refetching
- Permission or role variants that change what renders
- Overflow — long strings, large numbers, many items

If the code does not currently handle a state that clearly exists (no empty
state for a list that can be empty), list it anyway and note it in
`current_implementation`. That is a real gap, and the design agent surfacing it
is the system working. File a backlog item for it too.

### Step 4: Write the constraints

`constraints` is the developer's veto, declared before the design exists rather
than discovered in review. Include anything that a design change could
plausibly break:

- Accessibility guarantees already relied on (keyboard nav, focus order, live regions)
- Data that must stay masked, truncated, or formatted a specific way
- Performance budgets — virtualized lists, image sizes, animation cost
- Behavior the spec requires (quote the requirement)
- Platform limits — safe areas, minimum tap targets, offline rendering

Be specific. "Keep it accessible" constrains nothing. "Arrow keys move between
cards; the roving tabindex must survive" constrains something.

### Step 5: Record provenance

```json
"generated_at_commit": "<git rev-parse --short HEAD>",
"source_files": ["every file you read to build this"],
"source_digest": { "<each source file>": "sha256:<of its content>" }
```

`source_digest` is what staleness compares — one hash per file, over its
content with line endings normalised. The commit is provenance and decides
nothing: it only ever worked while the history it named survived, and
squash-merge discards it (#192). The tool computes the digest; record what it
gives you rather than composing one by hand.

`source_files` must be complete — it is what the staleness check runs against.
An incomplete list means the tool reports a stale surface as fresh, and the
design agent designs against fiction.

Do not assemble it from memory. Validation cross-checks it against the actual
import graph:

```bash
python3 .claude/tools/openspec.py validate --all
```

`design_surface_incomplete_sources` lists UI files the surface imports that you
did not record. It reports one layer at a time, so add what it names and run it
again until it is quiet — each pass walks a level deeper into the component
tree. Leave a file out only when it has no bearing on what renders, and know
that you are making that call.

`design_component_not_found` means a component id you wrote appears in none of
the source files. Either it was renamed, or you described something that does
not exist and the design agent would write tickets against nothing.

### Step 6: Set status and validate

`functional` (works, unstyled) · `in-design` (tickets open) · `designed` ·
`needs-redesign` (behavior changed under an existing design).

```bash
python3 .claude/tools/openspec.py design surfaces
python3 .claude/tools/openspec.py validate --all
```

Fix every error before handing off.

---

## Refreshing a stale surface

`design_surface_stale` means source files changed since the manifest was
generated. Re-read the code and update in place. Then check the open tickets
against it:

- A ticket targeting a component that no longer exists → tell the design agent;
  do not silently delete the ticket.
- A component that gained a state → tickets covering it are now incomplete.
  Flag them; `design_state_not_covered` will confirm.
- Behavior changed under a `designed` surface → set `needs-redesign`.

### Two reasons a surface goes stale, and only one is a surprise

**Something else changed the code.** The manifest is fiction and a design agent
reading it would aim at the wrong target. Refresh before designing.

**A design round landed.** Not a surprise — an obligation. The round edited the
very files the manifest describes, so it stales them on commit, every time.
The refresh is that round's *last* task, not evidence anybody was careless.

This means `/surface` runs twice in a round: once as input to the design, once
as bookkeeping after implementation. Do not close a staleness item on the first
one — it reopens the moment the round commits. See design-contract §8.

### Refresh what is committed, never the working tree

`generated_at_commit` is a claim that the manifest describes the source *at that
hash*. Re-pinning against uncommitted edits makes the claim false while making
the warning disappear, which is strictly worse than the warning: the check
exists to catch exactly that drift, and a manifest that looks fresh and is not
will be designed against.

If the work is not committed yet, describe HEAD and say in your report that a
further pass is owed. That is the correct answer, not a failure to be thorough.

---

## Hard Rules

1. **Never write production code.** Read and report only.
2. **Never make a visual decision.** No colors, no spacing, no "should look
   like". `current_implementation` describes what is there, not what it wants.
3. **Never guess at states.** Read the branches. An invented state is worse
   than a missing one — it produces design work for a case that cannot happen.
4. **Never leave `source_files` incomplete.** It breaks staleness detection
   silently. Run validation until the import cross-check is quiet.
5. **Never describe a UI that does not exist yet.** Build it plain first, then
   survey it. Surveying a plan produces a design for a plan.

## Handoff

Report the surface id, component count, total states, and anything you noted as
an existing gap. Then:

> Ready for design. Run `/design <surface-id>`.

## Completion

- [ ] Manifest at `openspec/design/surfaces/<surface-id>.json`.
- [ ] Every component has `id`, `role`, `purpose`, and exhaustive `states`.
- [ ] Constraints written for anything a design could break.
- [ ] `source_files` complete — import cross-check quiet, or exclusions deliberate.
- [ ] Every component id traceable in the source files.
- [ ] `generated_at_commit` set to current HEAD.
- [ ] Gaps found in the code are filed as backlog items.
- [ ] `openspec.py validate --all` reports no new errors.

End response with: `SURFACE SURVEYED`
