# Proposal: The Copy Can Be Named

## Why

`fork_strategy` names every fork `<parent> (fork)`. The operator's own account
holds twenty-two strategies named `Dunkirk (fork)` — same name, same parent id,
indistinguishable — and when a strategy of the fork's default name already
exists, the platform answers the fork with `INTERNAL_ERROR` rather than a clean
refusal. Established live 2026-08-06 by isolating the variables; see
`openspec/backlog/forking-a-name-that-exists-is-a-500.md`.

The tool accepts an optional `name` (declared: string, 1–50 characters) that
this product has never sent. Two product problems follow:

- The one lever the operator has — naming the copy themselves — is not
  offered anywhere.
- When the platform refuses a fork, the refusal crashed the server action:
  `ForkStrategyCommand` declared a `refused` arm nothing ever produced, so the
  operator got a framework error page instead of the platform's answer, and
  lost the form they were acting from.

## What Changes

- The fork form gains an optional name field. Blank means what happens today —
  the platform names the copy `<parent> (fork)` — and the page says so plainly.
  Why naming matters is stated no wider than the truth supports: a name of
  your own tells your copies apart. **No promise that naming avoids an
  error**: the 500-on-collision is the platform's misbehaviour, a colliding
  *chosen* name has never been probed, and this product does not explain
  platform internals it cannot back.
- `ForkStrategyCommand` threads the name through; the adapter sends `name`
  only when non-blank. The declared 1–50 bound is pre-stated by the control
  (`maxLength={50}`), the way the agent forms pre-state `displayName`'s
  declared 80.
- A fork refusal becomes a result, not a crash: the adapter converts the
  platform's answer into `{kind: 'refused', reason}` — the same treatment
  `setActive` already gives archive and restore — and the fork form re-renders
  with the platform's words and the typed name intact.
- The payload-conformance sweep gains `fork_strategy`: the payload this
  product constructs, named and unnamed, held against the declared surface.

## What Is Not Done

- **No pre-check against existing names.** Counting names before forking would
  be this product enforcing a constraint the platform owns and has not
  published, and it would be wrong the moment BattleGrid allows duplicates or
  changes the naming rule. If the platform 500s, its answer reaches the
  operator as it was given.
- **No re-diagnosis.** The refusal renders in the platform's words; the
  product does not translate `INTERNAL_ERROR` into "that name is taken",
  because the platform never said that.
- **Reporting the defect to BattleGrid** stays open on the backlog item — the
  platform behaviour is still wrong regardless of this product's field.

## Capabilities

**Modified**: `strategy-authoring` — one MODIFIED requirement (A Private Copy
Is How A Platform Strategy Is Changed).
