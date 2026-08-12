# The round trip keeps what the person needs

## Problem

Three surfaces lose something between the person and the platform and back.
Different things, one shape: a round trip that arrives emptier than it left.

**1. A reason is dropped at the query boundary** (#170).
`readSectionOptions` collapses a failed strategy read to a bare
`{ kind: 'strategy-unreadable' }` (`read-section-options.query.ts:32`) — the
port's `reason` and `cause` are discarded. So the edit page's branch
(`strategies/[id]/edit/page.tsx:50-58`) renders a heading and a back link and
nothing else: it is the one unreadable branch in the product that **cannot**
comply with the rule every other one follows, because the reason never reaches
it. The `vocabulary-unreadable` arm drops its reasons identically.

**2. A value is trusted that was never checked** (#169).
`allocation` goes into `Number.parseInt` unvalidated
(`rules/[signalId]/page.tsx:211`), so `?a=banana` sends `NaN` into
`describeRetune` and relies on the platform to refuse it downstream. The
product has a decided shape for this — `/recorder/trim`'s unreadable-date state
names the value it could not read — and this page does not use it.

**3. Typed values are discarded by a refusal** (#162).
Agent edit re-renders `AgentEditForm` from the agent's **current** values on a
refused describe (`:140-150`), an unresolvable preset (`:179-188`), and the
`?problem=` bounce (`:285`). Everything typed is gone. A refusal usually names
what to fix, and fixing it currently means retyping the rest.

## Intent

**Carry what was given, check what arrives, and keep what was typed.**

None of the three needs a new mechanism. The port already produces the reason
(1); the product already has a decided rejected-input state (2); the rule
editor's own refusal path already carries typed values through a redirect (3).
Each is a boundary declining to do what the surface next to it already does.

## Capabilities touched

- **strategy-authoring** — ADDED (a failed read reaches the surface with its
  reason; a value the page was handed is checked before it is sent)
- **agent-authoring** — ADDED (a refusal preserves what was composed)

## Scope

### In scope

- `ReadSectionOptionsResult`'s `strategy-unreadable` and `vocabulary-unreadable`
  arms carry `reason` and `cause`; the edit page renders them with the shared
  `WhyNotLoaded`, as every other unreadable branch does
- The rule editor parses `allocation` and renders a rejected-input state naming
  the value, rather than sending `NaN`
- Agent edit's three refusal paths carry the composed values back and re-render
  the form from them
- The rule editor's "Compose it again" link on the params-not-numeric branch
  points at the composition, not the bare form — its own refusal path already
  does this, and the two disagreeing is the bug

### Out of scope

- **The dead ternary in the rule editor's cannot-retune reason** (#169's second
  finding). Both arms read `described.reason`; it is harmless, and removing it
  is a tidy rather than a fix. Stays on #169.
- **Whether `ruleParams: undefined` clears stored params** (#169's third, and
  the one that could have escalated). Already answered while verifying:
  `retune-rule.command.ts:50` omits the key rather than sending a clearing
  value, so stored params are preserved. Nothing to change.
- **A general form-state mechanism.** Three surfaces are fixed by the means
  each already has beside it. Inventing a shared carrier for a problem that has
  appeared three times, in three shapes, would be designing ahead of the
  evidence.

## Why standard, not lite

Three surfaces, two capabilities, and each adds a requirement about what a
person is owed. No writes change, no migration, no money.
