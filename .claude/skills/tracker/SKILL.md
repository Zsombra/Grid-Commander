---
name: tracker
description: Owns the backlog and the session journal — files issues, keeps their status honest against the changes they link to, and writes the session handoff entry. Use when the user wants to record a bug or idea for later, review or triage the backlog, ask what to work on next, catch up on what happened previously, or close out a session.
---

# Tracker

## Lane

This skill owns the record of work that is not currently a change, and the
record of what happened.

It does:
- File backlog items and keep their frontmatter honest.
- Triage: priority, status, blockers, duplicates.
- Report what to work on next.
- Write the session journal entry.
- Promote an item to a change (by handing to the proposer) and link the two.

It does NOT:
- Write code, specs, or change artifacts.
- Track the steps of an in-flight change — that is `tasks.md`.
- Decide whether work happens. It records; the user decides.

## Read First

`.claude/references/tracking.md` — the conventions. Non-negotiable, because
their whole value is that every agent follows the same ones.

---

## Mode A: Session start ("where are we", "what's next", "catch me up")

```bash
python3 .claude/tools/openspec.py board
python3 .claude/tools/openspec.py mirror     # needs gh; sees past this checkout
gh pr list --state open                      # what is finished but unmerged
```

Read the output, then read the last 2–3 journal entries in full — the board
shows only their summary lines, and the **Watch out** field is usually the most
valuable text in the repo.

**`board` describes one checkout. `main` is routinely behind finished work.**
Sessions run in parallel worktrees, each lands as a PR, and each closes its
issues the moment they are settled — so between close-out and merge every local
count is true about `main` and false about reality. `board`, `backlog list`,
`validate` and `JOURNAL.md` are all blind to this; `mirror` and `gh pr list` are
the only two commands here that are not. Run them.

Report:
1. What is in flight, and how far along — **including open PRs and what each
   one claims to settle.**
2. What the last session said to do next, and whether that still holds.
3. Anything flagged as drifted — an archived change with an open item, a change
   with no tasks, validation errors. **Check `mirror`'s drift rows against the
   open PRs before calling any of them a record nobody updated** (see below).
4. **One** recommended next action. Not a menu.

### Drift has two causes that look identical

An item reading `open` against a CLOSED issue means one of:

| | what it is | what to do |
|---|---|---|
| **rot** | the record was never updated | write the closure |
| **in-flight** | a PR carrying the closure has not merged | merge it, write nothing |

Guessing wrong is expensive in one direction only: writing closures for work
already done on a branch duplicates it and then conflicts with it. On 2026-08-17
a session read nine such rows as rot and rebuilt most of a tool the unmerged PR
had already shipped — the rows were #339's close-out.

Two signals separate them, neither conclusive alone: a **same-day cluster** of
closed issues (one session closes as it goes; rot accumulates on scattered
dates), and an **open PR**. `mirror` prints both. When in doubt the check is two
commands and costs nothing:

```bash
gh pr list --state open
git log --all --oneline -20
```

`git log` alone cannot see another worktree's branch; `--all` can.

If the journal's **Next** disagrees with what the board computes, say so
explicitly and explain which you trust. That disagreement is usually where
something was dropped.

## Mode B: File an item

Copy `openspec/backlog/TEMPLATE.md` to `openspec/backlog/<item-id>.md`.

1. **Check for duplicates first**: `backlog list --status all`. Updating an
   existing item beats filing a near-twin — two half-descriptions of one problem
   are worse than one good description.
2. Derive a kebab-case ID. If this is likely to become a change, name it the way
   the change would be named, so the lineage is obvious.
3. Fill the frontmatter. Every field, no placeholders left.
4. Write the body. **Evidence** is the field that matters most: `file:line`, an
   error string, a reproduction. It is what saves the next person the
   rediscovery.
5. Set `updated` to today.
6. **Mirror it as a GitHub issue and link it back.** File the issue, then set
   `github: "<number>"` in the item's frontmatter. Write the issue for someone
   with no checkout: what is actually true (with `file:line` or a payload), why
   it matters, what would settle it and what that needs, and where the
   reasoning came from — the last one is what makes a wrong premise cheap to
   correct later. Name the backlog id in the issue's first lines.
   `github: none` is allowed for an item that only points at another, and must
   say so in the body. Full doctrine: `.claude/references/tracking.md` §7.
7. `python3 .claude/tools/openspec.py validate --all`

**Priority is earned by consequence.** Ask what breaks if this is never done.
If the answer is "nothing much", it is p3, whoever is asking.

## Mode C: Triage

Walk `backlog list --status all` and fix what has drifted:

| Symptom | Action |
|---|---|
| Item `open`, change active | → `in-progress`, link the change |
| Item open, change archived | → `done` — or say what is genuinely left |
| `in-progress`, no change linked | Either link it or set back to `open`. It is not in progress. |
| `blocked`, blocker is closed | Unblock it |
| Two items, one problem | Merge — keep the better body, delete the other |
| p0 that has sat for weeks | It is not a p0. Re-price it or explain why it stalled. |
| `wontfix` with no reason | Add one, or reopen |

Update `updated` on everything you touch. Report what changed and what you left
alone.

Triage is not busywork: a backlog nobody trusts is one everybody stops reading,
and then the deferrals recorded in it are the same as deferrals never recorded.

## Mode D: Promote an item to a change

1. Confirm the item is still worth doing and still described accurately.
2. Hand to the **proposer** with the item's body as context — the Evidence and
   Notes sections are exactly what a proposal needs and were written when the
   problem was fresh.
3. Once the change folder exists, update the item: `status: in-progress`,
   `change: <change-id>`, `updated: today`.
4. Do not copy the item's content into the change and do not delete the item.
   The change owns the detail from here; the item just points at it.

## Mode E: Session handoff ("wrap up", "/handoff", end of a work session)

Prepend an entry to `openspec/JOURNAL.md`, directly under the `# Journal`
header and above the previous entry:

```markdown
## YYYY-MM-DD — one-line summary

**Did**: what actually changed. Name changes, items, files.
**State**: what is in flight and how far along.
**Next**: the single next action, named as a command or skill.
**Watch out**: gotchas, dead ends, non-obvious decisions.
```

Before writing it:

1. `board` — so the entry matches reality rather than your memory of it.
2. Update any backlog item this session touched.
3. **File items for everything deferred this session.** Bugs noticed and not
   fixed, warnings not acted on, debt taken on deliberately. This is the step
   that gets skipped, and it is the whole point of the system.
4. Verify: `validate --all`.

Write **Watch out** honestly. "The delta merge silently drops scenarios you
omit from a MODIFIED block" is worth more than a clean-sounding summary. If
there is genuinely nothing, write `none`.

Keep the entry short. Four fields, a few lines each. A journal nobody reads
because entries are essays is a journal that does not work.

---

## Hard Rules

1. **Never duplicate a change's tasks in a backlog item.** Link and stop.
2. **Never close an item without saying why** — archived change, superseded,
   wontfix with a reason.
3. **Never leave a deferral unfiled.** Deciding not to do something is a
   decision that must survive the session.
4. **Never write a journal entry from memory.** Run `board` first.
5. **Never invent status.** If you do not know whether something works, the
   entry says you do not know.
6. **`id` always matches the filename.** Validation enforces it.
7. **Never file a finding in only one place.** Every item is mirrored as a
   GitHub issue and linked by `github:`. A finding that lives only in the repo
   is invisible to the person who decides what gets worked on. Validation
   enforces it for every open item, with no exemption by age.
8. **When a finding turns out to be wrong, correct the issue rather than
   filing a second one.** Keep the original under a `<details>` fold saying
   what was wrong — a ticket whose history is deleted teaches nobody why the
   mistake was reachable.

## Completion

- [ ] Every item touched has an accurate `status` and a current `updated`.
- [ ] Everything deferred this session is filed, **and mirrored as an issue**.
- [ ] `validate --all` reports no new errors.
- [ ] (Mode E) Journal entry written, with all four fields.

End response with: `TRACKING UPDATED`
