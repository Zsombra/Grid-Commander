---
id: four-dead-write-paths
title: Four of six write paths cannot be submitted — the forms are not bound to their actions
type: bug
status: open
priority: p1
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: app-access
blocked_by: []
tags: [reachability, forms, server-actions, spec-violation]
---

# Four of six write paths cannot be submitted

## What

A Server Action runs only when a form is bound to the function —
`action={fn}` or `formAction={fn}`. A form with `method="post"` and a *string*
action is an ordinary HTML post to that URL, and a `page.tsx` cannot export HTTP
handlers (only `route.ts` can), so Next re-renders the page and nothing happens.

| Write path | How the form submits | Works |
|---|---|---|
| Start OAuth | `action={startAuthorization}` | **yes** |
| Archive an agent | `action={performArchive}` | **yes** |
| Create an agent | `method="post" action="/agents/new"` | **no** |
| Rename an agent | no form renders it at all | **no** |
| Rebind an agent | `method="post" action={`/agents/${id}/rebind`}` | **no** |
| Apply a strategy plan | `method="post"`, no action, no action defined | **no** |

Three server actions are defined and referenced by nothing — each appears
exactly once in the repository, at its own definition:

- `create` — `app/(app)/agents/new/page.tsx:50`
- `rename` — `app/(app)/agents/[id]/page.tsx:75`
- `performRebind` — `app/(app)/agents/[id]/rebind/page.tsx:60`

`app/(app)/strategies/[id]/edit/page.tsx` contains no `'use server'` and no
exported action at all, so the Apply button in `plan-review.tsx:73` has nothing
to reach even in principle.

Confirmed against the served application: a POST to each of those URLs returns
200 with the page re-rendered, and no action runs.

## Why it matters

**The product can connect an account and archive an agent. It cannot create an
agent, rename one, rebind one, or apply a strategy change.** That is the whole
authoring surface — the thing this product is for.

Every use case behind them is wired into the composition root, tested, and
audited: `CreateAgentCommand`, `UpdateAgentCommand`, `RebindAgentCommand`,
`ApplyPlanCommand`. The guard sequence, the confirmation tokens, the
optimistic-concurrency handling and the audit writes are all real and all
unreachable.

It violates the same archived requirement as `five-dead-links`, more severely.
`app-access` — *"Each behaviour delivered by a capability of this product SHALL
be reachable by a user through the interface"* — passed a production gate three
times over this code.

## How it survived

The same shape as every other guard failure in this project, and the clearest
instance yet.

`wire-the-app` checked that **routes exist**. `prove-it-runs` checked that the
application **builds** and that pages **render**. Both are true here: the pages
exist, they build, they return 200, and they show the right words. The forms are
on screen with their labels and their buttons.

Nothing ever checked that a **form is connected to the thing it submits to**.
Rendering was treated as reachability, and a form that renders perfectly and
posts into a void is indistinguishable from a working one unless you press it.

## Fix

1. **Bind each form to its action.** Pass the action down as a prop
   (`<AgentForm action={create} />`) rather than hardcoding a URL, so the binding
   is a type error when it is missing rather than a silent no-op.
2. **Write the missing apply action** for the strategy edit page.
3. **Make it checkable.** A structural test that fails on any `<form>` whose
   `action` is a string literal or template, and on any exported `'use server'`
   function that no `action={}` references. Both halves are needed: the first
   catches a form pointing nowhere, the second catches an action nothing points
   at.

Prefer a test over a lint rule — the "unreferenced server action" half needs to
see across files.
