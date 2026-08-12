# Proposal: The refusals dress alike

## Why

Eleven ceremony pages still render their `?problem=` banner in the neutral
border DT-0004 retired, and `agent-edit.tsx` makes eleven (#156). A
refusal that renders like a neutral card is skimmable past.

## What Changes

- The eleven page banners take DT-0004's exact treatment: danger role,
  semibold "Refused: " prefix, space.4 padding.
- `agent-edit.tsx` takes the danger role without the prefix — its
  `problem` prop also carries the product's own catalog advisory, which
  is not a bounced write.

## Capabilities

None — presentation only, executing a decided treatment (`skip_specs: true`).

## Out of Scope

- `/agents/[id]`'s consequence-role problem line — a different, deliberate
  choice.
- Surveys/tickets for these pages — #108's remaining tail, follow-up.

## Impact

Eleven page files + agent-edit.tsx, class strings and one prefix span each.
