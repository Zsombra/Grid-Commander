# Design Tickets

One file per ticket: `DT-NNNN.json`. Implemented tickets move to `done/`.

**Written by the design agent** (`design-director` skill, `/design` command).
**Read and implemented by the developer agent** (`executor`).

```bash
python3 .claude/tools/openspec.py design tickets --status open
python3 .claude/tools/openspec.py design show DT-0001
```

## The rule that matters

A ticket may change **presentation**. It may never change **behavior**.
Anything that adds or removes a state, action, field, or step sets
`behavior_impact: requires-spec-change` and blocks until a `/propose` change
lands and is linked in `spec_change`.

Contract: `.claude/references/design-contract.md` §2, §5
