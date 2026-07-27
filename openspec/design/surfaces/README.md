# UI Surfaces

One file per surface (route, screen, or major panel): `<surface-id>.json`.

**Written by the developer agent** (`ui-surveyor` skill, `/surface` command)
from the actual code. **Read by the design agent.**

A surface says what exists, what states each component has, and what the design
must not break. It is the input to every design ticket.

Do not hand-write these to describe a UI that does not exist yet — the design
agent will design fiction. Build it plain first, then survey it.

Contract: `.claude/references/design-contract.md` §4
