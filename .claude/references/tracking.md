# Tracking

How work is tracked so that nothing is lost between sessions, agents, or weeks.
Every skill that starts or ends a session reads this file.

---

## 1. Four places, one rule each

| Where | Tracks | Lifetime |
|---|---|---|
| `openspec/backlog/<id>.md` | Work that is **not a change yet** — bugs, debt, ideas, deferred findings | Until it becomes a change or is closed |
| `openspec/changes/<id>/tasks.md` | Steps **inside** an in-flight change | The change |
| `openspec/changes/archive/` | What **shipped**, with full context | Forever |
| `openspec/JOURNAL.md` | What **happened** in each session, and what to do next | Forever |

**The rule that keeps this from rotting: exactly one place owns each piece of
work at a time.**

```
idea/bug ──► backlog item ──► change folder ──► archive
             (owns it)        (owns it)         (owns it)
                                  │
             item links to it ────┘  and says nothing more
```

A backlog item never restates a change's tasks. Once work becomes a change, the
item sets `status: in-progress`, `change: <change-id>`, and gets out of the way.
Two systems tracking the same work means both go stale, and then neither is
trusted.

---

## 2. Start and end of every session

This is the part that makes multi-agent and multi-session work actually hold.

**Start — read state before doing anything:**

```bash
python3 .claude/tools/openspec.py board
```

One command, the whole picture: capabilities, active changes and their next
action, open backlog by priority, recent journal entries, health. Read it before
you form a plan. The last session already worked out things you would otherwise
rediscover.

**End — write state before you stop:**

Append a journal entry (newest first, at the top of `openspec/JOURNAL.md`):

```markdown
## YYYY-MM-DD — one-line summary

**Did**: what actually changed. Name changes, items, files.
**State**: what is in flight and how far along.
**Next**: the single next action, named as a command or skill.
**Watch out**: gotchas, dead ends, non-obvious decisions.
```

Write `**Watch out**: none` rather than dropping the field. An empty field is a
signal; a missing one is ambiguous.

**A session that changed anything and left no journal entry is an incomplete
session.** The diff shows what changed; only the journal says why, what is
half-done, and what bit you.

---

## 3. Backlog items

One file per item, `openspec/backlog/<item-id>.md`, copied from `TEMPLATE.md`.
One file per item means parallel agents never conflict on a shared index — and
the index is computed, never hand-maintained.

```yaml
---
id: fix-duplicate-orders     # MUST match the filename
title: Checkout can create duplicate orders
type: bug                    # bug | feature | debt | chore | question | risk
status: open                 # open | in-progress | blocked | done | wontfix
priority: p0                 # p0 | p1 | p2 | p3
created: 2026-07-20
updated: 2026-07-25
change: ""                   # change-id once work starts
capability: ""               # openspec/specs/<capability> this concerns
blocked_by: []               # other item ids
tags: [checkout, payments]
---
```

Body sections: **What**, **Why it matters**, **Evidence**, **Notes**.

### Priorities

| | Meaning |
|---|---|
| `p0` | Broken in production, or blocking everything else. Work on it now. |
| `p1` | Next up. Real cost to leaving it. |
| `p2` | Wanted. Would take it if the week allowed. |
| `p3` | Someday. Recorded so it stops occupying anyone's head. |

Priority is earned by the **Why it matters** section. A p0 with no stated
consequence is someone's preference, not a priority.

### Statuses

`open` → `in-progress` (a change exists) → `done` (the change archived).
`blocked` requires `blocked_by`. `wontfix` requires a reason in the body —
a closed item that does not say why gets reopened by the next person.

### Naming

Item IDs and change IDs share the kebab-case convention, so an item that becomes
a change keeps its name: `backlog/add-2fa.md` → `changes/add-2fa/`. The lineage
reads at a glance and needs no cross-reference table.

---

## 4. What goes in the backlog

**Do file an item for:**
- A bug you found but are not fixing right now
- A verifier WARNING or SUGGESTION you are not acting on
- An auditor MINOR violation, or a waived MAJOR — with the waiver rationale
- Work explicitly cut from a proposal's scope
- Technical debt you created deliberately, while you remember why
- A question that blocks a decision
- An `/explore` path you rejected but might revisit

**Do not file:**
- Steps of an in-flight change — those are `tasks.md`
- Anything already covered by an open item — update that one instead
- Vague unease. "Auth feels messy" is not actionable. Name a symptom.

**The discipline that matters:** when you decide *not* to do something, file it
before you move on. An undocumented deferral is indistinguishable from an
oversight three weeks later, and that is the failure this system exists to
prevent.

---

## 5. Where items come from

| Source | What to file |
|---|---|
| `/explore` | Rejected options worth revisiting; problems found but out of scope |
| `proposer` | Everything cut into **Out of Scope** |
| `executor` | Debt created deliberately; blockers hit; TODOs left in code |
| `verifier` | Every WARNING and SUGGESTION not fixed this round |
| `auditor` | Every MINOR, and every waived MAJOR with its rationale |
| `archiver` | Anything the change did not finish |
| `/debug` | Spec gaps and root causes found while fixing something else |

This wiring is the point. Findings that no skill files anywhere are findings
that get rediscovered.

---

## 6. Commands

```bash
python3 .claude/tools/openspec.py board                          # session start
python3 .claude/tools/openspec.py backlog list                   # open items
python3 .claude/tools/openspec.py backlog list --status all
python3 .claude/tools/openspec.py backlog list --type debt --priority p1
python3 .claude/tools/openspec.py backlog list --tag auth
python3 .claude/tools/openspec.py backlog show <item-id>
python3 .claude/tools/openspec.py journal --limit 5
python3 .claude/tools/openspec.py validate --all                 # includes backlog
```

Slash commands: `/board` (start), `/backlog` (view and file), `/handoff` (end).

---

## 7. Validation

`validate` checks the backlog alongside the specs:

| Code | Severity | Meaning |
|---|---|---|
| `backlog_missing_frontmatter` | error | No `---` block |
| `backlog_id_mismatch` | error | `id` does not match the filename |
| `backlog_invalid_type` / `_status` / `_priority` | error | Value outside the allowed set |
| `backlog_change_not_found` | error | Links to a change that does not exist |
| `backlog_change_archived` | warning | Change shipped, item still open |
| `backlog_status_behind_change` | warning | Change active, item still `open` |
| `backlog_in_progress_without_change` | warning | `in-progress` with nothing linked |
| `backlog_blocked_without_cause` | warning | `blocked` with empty `blocked_by` |
| `backlog_blocked_by_unknown` | warning | Blocker is not a real item |
| `backlog_capability_not_found` | warning | Names a capability with no spec |
| `change_without_backlog_item` | info | Active change with no linked item — fine, just noted |

The drift warnings are the valuable ones. They catch the specific way this
system dies: work finishes and nobody updates the record.

---

## 8. Merge conflicts

Backlog items are one file each, so parallel agents do not collide.

`JOURNAL.md` will conflict when two sessions run in parallel. The resolution is
always the same: **keep both entries, newest first.** Never drop one — a lost
journal entry is a lost session.
