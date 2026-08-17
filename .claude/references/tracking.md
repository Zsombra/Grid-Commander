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
github: "87"                 # the issue mirroring this item — bare number, or `none` + a reason (§7)
blocked_by: []               # other item ids, or an external namespace (below)
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

#### Waiting on someone outside this repository

`blocked_by` took item ids and nothing else, so an item waiting on BattleGrid, on
other players, or on a live authorisation had no way to say so — `validate` told
it to "set status: open", and it did. A board of thirty items then read as thirty
pieces of available work when a third of them were waits. Three namespaces name
the wait instead:

| token | meaning | example |
|---|---|---|
| `upstream:<name>` | the platform must change | `upstream:battlegrid` |
| `external:<name>` | someone outside must act | `external:market-grid-players` |
| `operator:<name>` | the operator must authorise | `operator:live-write-authorization` |

An unrecognised namespace is an **error**, not a warning — `blocked_by:
[vendor:battlegrid]` fails. A bare name that is not an item stays a warning, as
before.

**A token is not an excuse.** `blocked` on an external cause carries two
obligations, enforced by review rather than by the parser:

1. The body explains the wait.
2. The body names the **tripwire** — the observable change that would end it.

`market-grid-payloads-that-only-fill-once-someone-plays` is the model. Eight
reads across four platform majors proved polling had nothing to find, so it names
the condition (`playersNeeded < minimumPlayers`) and says outright not to poll. An
item that cannot say it is waiting gets re-read every session by someone deciding
whether to take it, which is the cost this exists to stop.

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

## 7. Every finding is mirrored as a GitHub issue

**When you find something, file it in both places, in the same breath.** A
backlog item is invisible to anyone who has not cloned the repo; a GitHub issue
is where the operator actually looks. A finding that exists only in
`openspec/backlog/` is a finding nobody outside the session will read.

```
finding ──► backlog item          the canonical record: validated, linked to
            (owns it)             a capability and a change, versioned with the code
                │
                └──► GitHub issue  the mirror: visible, assignable, discussable
                     (points back)
```

**The backlog stays canonical.** This is a mirror, not a second tracker — §1's
rule still binds, and the way it survives here is that the two are never both
authoritative. The item carries the state (`status`, `priority`, `change`,
`capability`); the issue carries the argument and the evidence, because that is
what a reader without the repo needs. When they disagree, the item is right.

### What to mirror

Everything §4 says to file. If it earned a backlog item, it earns an issue —
the two decisions are the same decision, so there is no separate judgement to
make and no place for one to be skipped.

### The link, both ways

- The item's frontmatter carries `github: "87"` — the **bare number**, not a
  URL. A URL carries the repo, and an item that outlives a move would then
  point at the old one.
- The issue body names the backlog id in its first lines, so a reader who lands
  on the issue can find the canonical record.

### Opting out

`github: none` is allowed and must **say why in the body**. An opt-out is a
claim, checked the same way an exemption is in `failure-is-explained.test.ts`:
silence is not an opt-out. The honest cases are narrow — an item that duplicates
an existing issue's scope, or one whose whole content is a pointer to another
item.

### Writing the issue

The issue is read by someone with no context and no checkout, so it carries what
a backlog item can assume and an issue cannot:

- **What is actually true**, with `file:line` or a payload — not "X is broken".
- **Why it matters**, which is what earns the priority.
- **What would settle it** — the first concrete step, and what it needs
  (a key, a decision, an upstream fix). Name the blocker if there is one.
- **Where the reasoning came from**, especially if it might be wrong. #84 was
  filed on a premise that turned out false; the correction was cheap because
  the original reasoning was written down and could be checked.

### When a finding corrects an earlier one

Update the issue rather than filing a second. Keep the original text under a
`<details>` fold with a note saying what was wrong. A ticket whose history is
deleted teaches nobody why the mistake was reachable.

### Enforced, not documented

`validate` warns on **any** open item with no `github:` value, errors on a
malformed one, and warns on an unexplained opt-out. No date exemption and no
grandfathering: the twenty-eight items that predated the rule were backfilled
on 2026-08-10 (issues #89–#116), so there is nothing left to exempt.

The rule was briefly scoped to items created on or after that date, to avoid
twenty-eight recurring warnings teaching everyone to skim the warning block.
Once the backfill landed, the scoping covered exactly one remaining case — an
old item **reopened** later — and that is the case that most needs a mirror, so
it came out.

### The other direction: `openspec.py mirror`

`validate` checks that a mirror **exists**. It has never checked that the two
agree, so an item could read `status: open, priority: p2` while its issue was
CLOSED and every check passed — which happened for a day, with the board's
`NEXT:` line recommending work GitHub already considered finished (#309).

```bash
python3 .claude/tools/openspec.py mirror
```

Three directions, and only two of them are drift:

| | meaning | exit |
|---|---|---|
| item open/in-progress/blocked, issue **CLOSED** | drift | fails |
| item **done**, issue OPEN | drift | fails |
| issue OPEN with **no item** | usually in-flight | reports; fails only under `--strict` |

The third is the noisy one. Every session's tracking lands as a PR and its
issues close immediately, so between filing and merge an issue legitimately has
no item on `main`. Against a working tree it is quiet; against `main`
mid-flight it is not.

#### Drift is not the same as rot — read it against the open PRs

The table says which directions are *drift*. It does not say what drift **means**,
and the first direction has two causes that look identical in a list and want
opposite responses:

| | what it is | what to do |
|---|---|---|
| **rot** | the record was never updated | write the closure |
| **in-flight** | a PR carrying the closure has not merged | merge it, write nothing |

Getting this wrong is expensive in one direction only. Writing closures for work
already done on a branch duplicates it, and then conflicts with it on this very
file.

**It has happened, and the evidence was not the problem.** On 2026-08-17 a
triage pass read seven items open against closed issues plus two orphan issues,
called it accumulated rot, and rebuilt most of `mirror` itself before noticing
that all nine were **#339 sitting unmerged**. `mirror` had reported the drift
correctly; nothing told the reader how to interpret it.

Two signals separate the cases, neither conclusive alone:

- **A same-day cluster.** One session closes its issues as it goes, so its drift
  shares a close date. Genuine rot accumulates on scattered ones. `mirror` prints
  the cluster when it finds one.
- **An open PR.** The thing that would be carrying the missing writes. `mirror`
  lists them.

Neither is proof, so `mirror` reports and does not conclude. The check it points
at is two commands and costs nothing:

```bash
gh pr list --state open
git log --all --oneline -20
```

**`--all` is the load-bearing flag.** Plain `git log` cannot see a branch checked
out in another worktree, and this repository runs sessions in parallel worktrees
by default.

The detection signal that finally caught it generalises and is cheaper than
either: **a closing comment naming an archived change that is not in the
archive.** Closing comments only name changes that were archived, so the absence
is a strict contradiction rather than a maybe.

**What does not catch it**: `assert_checkout.py` (#325) passes — the worktree is
intact. A `behind N / ahead N` stamp against `origin/main` (#335) reads `0 / 0`
— the checkout *is* `main`, and `main` is the thing that is behind. Every
offline surface here — `board`, `backlog list`, `validate`, `JOURNAL.md`,
`HANDOFF.md` — describes one checkout and cannot see this at all. `mirror` and
`gh pr list` are the only two that can.

**It is deliberately not part of `validate`.** `validate` is offline and must
stay that way — it runs in CI, in hooks, and on a laptop with no `gh`
credential, and a check needing the network would either fail there or teach
people to skim the warning block, which is the exact failure the scoping note
above records. `mirror` needs `gh` and says so, exiting 2 when it is missing.

A rule nothing enforces is a rule that gets skipped. That is not a guess here —
`failure-is-explained.test.ts` exists because thirty branches hand-rolled their
own failure sentence, and its header names the cause: *nothing stopped the
thirty-first.*

---

## 8. Validation

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
| `backlog_blocked_by_malformed` | error | Blocker uses an unknown `<ns>:<name>` namespace |
| `backlog_capability_not_found` | warning | Names a capability with no spec |
| `change_without_backlog_item` | info | Active change with no linked item — fine, just noted |

The drift warnings are the valuable ones. They catch the specific way this
system dies: work finishes and nobody updates the record.

---

## 9. Merge conflicts

Backlog items are one file each, so parallel agents do not collide.

`JOURNAL.md` will conflict when two sessions run in parallel. The resolution is
always the same: **keep both entries, newest first.** Never drop one — a lost
journal entry is a lost session.
