# Proposal: A Failed Read Explains Itself

## Why

`WhyNotLoaded` has existed since the roster was built. It takes a
`FailureCause` and a subject and adds the sentence that turns a failure into
something an operator can act on:

> This does not mean your agents are gone — Grid-Commander could not reach
> BattleGrid to ask.

Counted 2026-08-05 and again today: **36 branches across 32 files render a
`kind === 'unreadable'` outcome. Six of them reached the component.** The other
thirty printed `{result.reason}` and stopped.

The component's own header says it is *"shared by the roster and the strategy
list so the two cannot drift"* — and it was used by exactly those two plus three
agent pages. Everything built since had hand-rolled the branch.

`the-outage-explains-itself` already fixed the *reason* at the boundary, so the
base sentence reads well everywhere. What the thirty were still missing is the
half that cannot be recovered from a message: **the refused-versus-unreachable
branch**, which reads the `cause` the adapter carried out, and the
**subject-specific reassurance** that names what has *not* been deleted.

## The guard is the change; the sweep is its consequence

Thirty hand-rolled branches is a symptom. The cause is that nothing stopped the
thirty-first, and a sweep without a guard buys one clean afternoon — this
repository has the receipts, and the backlog item says so in as many words.

So `tests/architecture/failure-is-explained.test.ts` derives the branches from
the source, per branch rather than per file, and fails any that renders neither
the shared sentence nor a stated exemption. A list of files would be the same
mistake one level up: it would pass while a thirty-seventh branch was written,
which is exactly how the thirty accumulated.

Two things fell out of writing it, both of which a sweep alone would have
missed:

- **Two of the six surfaces that already used the component read
  ungrammatically.** `/limits` rendered *"This does not mean this agent's limits
  gone"*, and `/thinking` the same for its reasoning. A shared component is
  supposed to make that impossible; it did not, because nothing ever read the
  sentence back. The guard now does.
- **`/agents/new` branched on `catalog.kind !== 'catalog'`,** which needed a
  `: 'unknown'` fallback for a state the union does not have and hid the `cause`
  entirely — so a user with a rejected credential was told to wait out an outage
  that was not happening. That is the precise failure `why-not-loaded.tsx`'s
  header was written about.

## What Changes

- **A guard.** Every rendered `kind === 'unreadable'` branch under `app/` and
  `src/presentation/` must reach `WhyNotLoaded`. Derived from source; per
  branch; the branch's own rendered region, not its file's imports. Exemptions
  are declared with a written reason and checked in both directions — a stale
  exemption fails, and so does one whose branch has since been fixed.
- **The sweep.** Twenty-six branches across twenty-four files now render the
  sentence, each with a subject accurate to that surface. Four more are exempt,
  below. Thirty-two of thirty-six branches now explain themselves; the other
  four say why they do not.
- **Two subjects corrected** so the sentence they complete is grammatical.
- **`CatalogResult` moved from `@/domain/agent/catalog.js` to
  `@/ports/agents.js`** and given the `cause` its three siblings already carry.
  It is the outcome of a read, which is what a port describes; being the outlier
  in the domain meant it was the one read outcome that could not say *why* it
  failed. The adapter was already producing a cause through `unreadable(err)` —
  only the type dropped it.
- **`PreviewCompositionResult` carries a `cause`**, passed through from the
  strategy read and classified as `unreachable` for a throw out of the port —
  the reading `CheckColumnQuery` and `ReadMetricQuery` already take.

## Exemptions, and why each one is not silence

Four branches do not carry the sentence, and each says so in the guard with its
reason rather than by being absent from a list:

| Branch | Why not |
|---|---|
| `proposal-queue.tsx` | Read from Grid-Commander's own database. The sentence names BattleGrid, which was never asked — it would be false. |
| `pending/[id]` | Same store. A BattleGrid failure reaches this page as `not-possible`, with the platform's own words. |
| `metrics/[metric]` column check | A contract check of a column being composed in the query string right now. Nothing was saved, so there is nothing for "does not mean it is gone" to refer to. |
| `exposure.tsx` | **Owed and deferred**, not denied — outside this change's scope. Filed as `the-exposure-panel-still-prints-its-reason`. |

## What is deliberately not here

**A shorter second wording for a repeated failure.** The backlog item raises it:
the audit table carries the full reason once per row, so during an outage that
is the same paragraph down the page. It is *correct*, and a second wording for
the same failure would be a second vocabulary — the thing this product refuses
elsewhere. It is a presentation problem (collapse repeats), not a copy one, and
it is not this change.

## Capabilities

**Modified**: `app-access` — one ADDED requirement.
