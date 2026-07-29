# The strategies walk

## Why

`strategies-may-have-the-same-navigation-gap` predicted this, and was right about
one of the two:

> A strategy sub-page could say "this strategy" on an account with several, or
> dead-end, and both checks would stay green.

Walked against a live account with 37 strategies — 25 owned, 12 from BattleGrid.

### Twelve affordances that cannot work, under a sentence saying so

The account is at capacity. The list says:

> **You have all 25 of your strategies.** Archive one to make room, or edit a
> strategy you already own.

and then renders **Make my own copy to edit** on all twelve system strategies.
The platform refuses every one of them:

```
fork_strategy → VALIDATION_ERROR
  "Strategy limit reached — you can have at most 25 active strategies."
```

The fork page itself refuses honestly and offers a way back, so nothing breaks.
But this product has a rule about exactly this, written in `agent-actions.tsx`
and acted on twice:

> A control that cannot work is not offered — and its absence is explained.

That is why there is no delete button, and why `AgentRenameForm` stopped
rendering an input for an agent BattleGrid will not let us rename. The strategy
list breaks it twelve times on one screen, directly beneath a sentence stating
the constraint that makes them impossible.

The agents side already does this properly: `/agents` reads **"Create an agent —
2 slots remaining"** and the reactivate flow carries an `atCapacity` warning.

### The edit page is a dead end — and so are the other three

`/strategies/[id]/edit` renders exactly four links, and all four are the global
navigation:

```
Agents · Strategies · Activity        (and nothing else)
```

No way back to the strategy being edited. `agent-edit.tsx` has three such links;
`strategy-detail.tsx` has none. This is the same defect as `/thinking` and
`/limits`, fixed on the agents side earlier today and never checked here —
because **neither reachability guard covers a return path.** One asks whether a
route is reachable at all, the other whether a list offers its entity. Getting
*back* is a third property and nothing measured it.

The walk found two of these, because two are the ones a person opens on the way
to something. **The guard, written before the fixes, found all four:**

```
/strategies/[id]/archive cannot get back to /strategies/[id]
/strategies/[id]/edit    cannot get back to /strategies/[id]
/strategies/[id]/fork    cannot get back to /strategies/[id]
/strategies/[id]/restore cannot get back to /strategies/[id]
```

and no agent sub-page, which is the control: the agents side was fixed by hand
this morning and the guard confirms that fix holds rather than merely describing
it.

`archive`, `fork` and `restore` each *had* a way out — it went to the list. So
declining an archive loses your place among seventeen strategies, which makes the
safe choice the more costly one. `restore` also offered
`/strategies/[id]/edit`: another page about the same strategy, which is not the
strategy.

Three `unreadable` branches rendered a `role="alert"` and no link at all.

### The worst one was invisible to every scan, including the new one

Writing the *decline* half of the guard — a confirmation must not send you to a
list — turned up a fifth instance, and the only one where the copy states an
outcome the link does not deliver. `plan-review.tsx` offers

```
Go back and change it        href=".."
```

`..` does not resolve to the page you came from. From `/strategies/<id>/edit` a
relative `..` resolves to **`/strategies`** — the roster:

```
new URL('..', 'http://h/strategies/abc/edit').pathname   →  /strategies/
```

So the one control promising to change the composed plan discarded it and landed
the user in a list of thirty-seven. Every link scan in `reachability.test.ts`
matches paths beginning with `/`, so none of them could see a relative href at
all. The new check resolves each href against the route it appears on, the way a
browser does.

**The surface manifest was already right.** `openspec/design/surfaces/strategy-editor.json`
records this link's effect as *"Link back to the compose form"*. The declared
intent and the implementation had disagreed since the panel was built, and the
survey that wrote it down did not check. DT-0002's acceptance lines are about
treatment — `button/secondary`, 44px, keyboard order after Apply — all still hold,
so the ticket is not reopened.

`changeIt` is now a **required** prop rather than a default, so no caller can
silently inherit a guess.

### What the walk found to be fine

Worth recording, because the backlog item guessed both ways. The list **does**
link every strategy by name — the agents-side defect is not present. Detail,
edit and archive all name the strategy. Archive proposes on render and spends the
token on a second request, which is the shape `money-limits-are-editable` had to
build for agents.

## What Changes

- **The fork affordance is gated on capacity**, and its absence is explained where
  it would have been. `forkAffordance(strategy, quota)` in the domain replaces
  `mustForkToEdit` at both call sites, returning `not-needed | offered | withheld`
  — a union rather than a boolean plus a reason string, so nothing can be offered
  *and* explained at once. **Unknown is not at-capacity:** a `null` quota offers
  the fork, because withholding a working control on a fact we do not have is the
  opposite mistake and the silent one.
- **Both fork surfaces, not just the roster.** `/strategies/[id]` offers the same
  control for the same strategy one click from the list. `get_strategy` does not
  report the quota, so `ReadStrategyQuery` now reads the roster too —
  concurrently, and allowed to fail: an unreadable roster is an unknown quota,
  which offers. A read added to make a control honest must not be able to take a
  working control away.
- **A way back on all four sub-pages** — `edit`, `archive`, `fork`, `restore` —
  and on the `unreadable` branches that rendered an alert and no link. Declining
  goes to the strategy; the not-found branches keep the list, because there is no
  strategy to return to.
- **`PlanReviewPanel` takes `changeIt` as a required prop.** Its `href=".."`
  resolved to the roster.
- `/strategies/[id]/edit` reads the roster before the vocabulary, so its refusal
  can name the strategy and return to it. A side effect worth stating: a
  nonexistent id now reports *"No such strategy"* rather than a vocabulary error,
  which is the better of the two answers.
- **Two guards, for two properties neither existing check covers.** In
  `reachability.test.ts`, because a second copy of `routeOf` is how the
  `page.tsx` separator bug survived in two places at once:
  1. *A page scoped to an entity offers a way back to it.* `app-access` has
     required this in words since the agents side broke this morning, and nothing
     enforced it.
  2. *A declined confirmation does not land on a list.* Independent of the first,
     and provably so: re-injecting the archive defect fails only this check —
     the page's own `Cannot archive` branch still links to the strategy, so the
     way-back check stays green while the button beside Archive goes to the
     roster. Resolves relative hrefs, which is how it found the `..`.

## Capabilities

- `strategy-authoring` — one requirement modified.
- `app-access` — one requirement modified.

## Out of Scope

- **Archived strategies.** The account has none — all 37 are active — so the
  restore path could not be walked. The code gates `Restore` on `!isActive` in
  both the list and the detail page, so it is wired; whether `list_strategies`
  returns archived strategies at all is unknown, and if it does not, restore is
  unreachable in the same way. → backlog, with what was and was not observed.
- **An automated check that a page *names* its entity.** The requirement has two
  clauses; the guard closes one. Every static form of the naming check is either
  misleadingly weak (`{x.name}` anywhere in the render set) or wrong (`No such
  strategy` legitimately names nothing), and the property is per-branch, which
  needs the pages rendered. This project has no component-rendering layer. Naming
  was verified by walking all five strategy routes and all eight agent routes. →
  `naming-an-entity-is-held-by-the-walk-only`, with why each cheap version was
  rejected.
- **The section editor.** `strategy-section-editor` stays open; the edit page
  offers a tagline and a compile, which is a different gap from this one.
- **Forking at capacity as a platform behaviour.** BattleGrid is right to refuse
  it. Nothing here argues with the limit.
