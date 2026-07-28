# Proposal: Build The Front Door

## Why

The address of this product returns 404, and no page links to any other.

```
  /            404
  /connect     200
  /agents      200
```

Walking the link graph from `/connect` — the only entry a user can arrive at —
reaches exactly one route: `/connect` itself. Five top-level destinations are
served and unreachable by clicking:

```
/agents  /agents/new  /assistant  /audit  /strategies
```

Sixteen routes of working capability, with no way in and no way between. Every
one of them can be used, by typing its URL.

**`app-access` already forbids this.** *"Each behaviour delivered by a capability
of this product SHALL be reachable by a user through the interface"* — a
requirement that has now passed a production gate four times over code that
violates it.

It kept passing for a reason worth naming, because it is the same reason twice.
`close-the-reachability-gap` measured *"every link the interface renders resolves
to a route"* and that check is green here: every link this product renders does
resolve. It never asked the other direction — **is every route something a link
reaches?** A destination nothing points at is unreachable in exactly the way a
link to nothing is, and no check in this repository looks for it.

The requirement even anticipated the shape of the mistake — *"a route table is
not the interface"* — and the guard written for it still started from a list
rather than from a walk.

## What Changes

- **A root route.** `/` resolves to the product for a connected user and to
  `/connect` for everyone else. A redirect rather than a fifth copy of a page,
  because the decision is *where you belong right now*, not what to render.
- **Navigation across the four sections**, in a layout shared by every page
  under `(app)` rather than pasted into four of them. One nav, one place it can
  be wrong.
- **A reachability walk that starts at the door.** From `/`, follow every link
  the interface can render; any served route not reached fails the check. This
  is the direction nothing measures today.
- **The requirement is modified to say which direction counts**, so the next
  guard cannot satisfy it by enumerating routes again.

## Capabilities

**Modified**: `app-access` — one MODIFIED requirement (reachability is measured
by walking from the entry point) and one ADDED (the product's own address
resolves). The second is not pedantry: `/` is the only URL a user is ever given,
and nothing in eight requirements says it must do anything.

## Out of Scope

- **Designing the navigation.** It gets tokens and no more. `agent-roster` and
  the other surfaces have never had a design pass, and a navigation styled ahead
  of them would set a baseline nobody chose. A design ticket follows.
- **A home page with content.** `/` redirects. What a landing page *says* is a
  product question — the idea brief has opinions about it — and inventing one
  here would be scope creep dressed as a fix.
- **Deep links inside a section.** Reaching one agent from the roster already
  works. This is about the four top-level destinations and the door.
- **Deployment configuration.** There is none — no Dockerfile, no target. A real
  gap, filed as `no-deployment-configuration`, and a different kind of work from
  this.
