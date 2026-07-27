# Backlog

Work that is **not a change yet**: bugs, debt, ideas, deferred findings,
open questions.

One file per item, named `<item-id>.md`. Copy `TEMPLATE.md`.

```bash
python3 .claude/tools/openspec.py backlog list
python3 .claude/tools/openspec.py backlog list --status all --type bug
python3 .claude/tools/openspec.py backlog show <item-id>
```

## The boundary that keeps this from rotting

| Where the work is | Source of truth |
|---|---|
| Not started, or just an idea | The backlog item |
| Being built | `openspec/changes/<change-id>/` — the item just links to it |
| Shipped | `openspec/changes/archive/` — the item is `done` |

A backlog item never duplicates a change's tasks. Once an item becomes a
change, set `status: in-progress` and `change: <change-id>`, and let the change
folder carry the detail. Two systems tracking the same work means both go stale.

Because item IDs and change IDs share the same kebab-case convention, an item
that becomes a change usually keeps its name — `backlog/add-2fa.md` →
`changes/add-2fa/` — so the lineage reads at a glance.

## Why one file per item

Parallel agents each create their own file, so there are no merge conflicts on
a shared index. The index is computed by the tool and never hand-maintained.

Full conventions: `.claude/references/tracking.md`
