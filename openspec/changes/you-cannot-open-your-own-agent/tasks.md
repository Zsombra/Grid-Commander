# Tasks

## The guard first

- [x] 1. `reachability.test.ts` — a walk from the root that refuses to traverse a
  mutation route. It must fail on the current tree before anything is fixed;
  record which routes it names.
- [x] 2. The mutation set is derived, not listed. A hardcoded list of destructive
  segments is the same mistake one level up — it passes while a new one is added.

## The fixes

- [x] 3. The agent's name links to `/agents/[id]` on its row.
- [x] 4. `/thinking` and `/limits` name the agent and link back to it, matching
  what `journal` and `edit` already do.
- [x] 5. `/thinking` and `/limits` link to each other.
- [x] 6. Check the other agent sub-pages for the same two gaps while in there —
  `archive`, `reactivate`, `rebind`.

## Verify

- [x] 7. Re-run the guard from task 1. It passes for the right reason: re-inject
  each fix's removal and watch it fail.
- [x] 8. Serve against the live account and walk `/agents` → agent → thinking →
  limits → back, clicking only what is rendered.
- [x] 9. typecheck, lint, tests, `./scripts/check.sh`, `check-serving.sh`.

## What re-injecting found

Task 7 was worth doing twice. Two of the three mutations passed at first:

- **Deleting the row's name-link left the suite green.** The corridor guard is
  satisfied by *any* non-mutation path, and `thinking` and `limits` now link
  back — true, and not what a person does. That is why `a list offers the thing
  it lists` exists as a separate, narrower check.
- **The first version of that check passed too**, because `/agents/new` matches
  `^/agents/[^/]+$`. A static sibling is not an entity. Found by re-injecting,
  not by reading.

A third gap is stated rather than guarded. `AgentEditForm`'s **editable** branch
had no way back while both of its refusal branches did — so the file read as
covered and the page a working account actually sees was a dead end. A source
scan cannot tell which branch renders. Walking the product is what catches that,
which is what task 8 is for.
