# You cannot open your own agent

## Why

On `/agents`, every row offers six links. None of them is the agent.

```
THE .0  ACTIVE  Bound to Midway at revision 3
  Edit · Rebind to another strategy · Archive ·
  What it decided · What would stop it · Journal
```

`/agents/[id]` exists. It carries the strategy-binding sentence, the brain, the
money summary and the rename form — none of which is on any other page. In the
running application the only live link to it is the cancel on
`/agents/[id]/archive`. **You reach your agent's own page by starting to retire
it.**

The reachability guard passes, and correctly by its own terms: it scans source
text for `href`, `agent-edit.tsx` contains `/agents/${agent.id}` three times, and
the walk from the root reaches the agent through `/agents/[id]/edit`. What it
cannot say is that all three of those links sit in branches that do not render
on this account, and that the surviving path runs through a mutation flow. The
requirement says a walk from the root must arrive; it does not yet say the walk
must not have to open a destructive form on the way.

Two more from the same walk, and they compound:

**Neither `/thinking` nor `/limits` names the agent.** `/journal` says
"THE .0's journal". `/edit` says "Edit THE .0". The two pages added most
recently say "What this agent decided" and "What would stop this agent" — with
eleven agents on this account, neither page can be identified. On limits that is
acute; the sentence it renders is

> Nothing will stop this agent on Loss in a day, Loss in total.

about an agent it does not name.

**Both are dead ends.** Their only links are the four global nav items. A page
that tells you two loss ceilings are unset offers no way back to the agent, and
no way to the page where the money is described.

## What Changes

- The agent's name links to the agent, on its own row. One link, where a person
  looks for it.
- Every agent sub-page names the agent it is about and links back to it. The
  pattern already exists — `journal` and `edit` do it — and the two newest pages
  broke it.
- `/limits` and `/thinking` link to each other. "Why did it act" and "what would
  stop it" are the same question asked twice.
- The reachability guard gains the check it was missing: a route must be reached
  by a walk that never passes through a mutation. A destructive form is not a
  corridor.

## Capabilities

- `app-access` — one requirement modified.

## Out of Scope

- **A breadcrumb component, or any shared page chrome.** Three pages need a
  heading and a link back; inventing a layout for it is a bigger decision than
  the defect warrants and would touch every route.
- **Reordering or trimming the six row actions.** They are all reachable and all
  work. Which of them deserves prominence is a design question, and there is a
  design lane for it.
- **`/strategies`.** The same shape may be there. It was not walked, so nothing
  is claimed about it. → backlog.
