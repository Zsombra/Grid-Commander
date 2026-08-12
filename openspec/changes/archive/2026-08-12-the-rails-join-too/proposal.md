# Proposal: The rails join too

## Why

`the-borders-join-the-palette` swept every bare `rounded border`, but the
defect has a directional sibling its pattern could not see: 4 bare
`border-l` rails (three signal lists, one trade-story timeline) still fall
through to Tailwind's default grey. `condition-outcomes.tsx:115` already
wears the correct spelling (`border-l border-border-default`).

## What Changes

- The 4 bare rails take `border-border-default` — same decided treatment
  (#155 / DT-0008), zero structural or copy changes.

## Capabilities

None — presentation only (`skip_specs: true`).

## Out of Scope

Everything else; the `rounded border` sweep is already archived.

## Impact

3 page files + `trade-story.tsx`, class strings only.
