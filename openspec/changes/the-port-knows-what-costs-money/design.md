# Design: The Port Knows What Costs Money

> **Scope adjusted before planning, 2026-08-17.** The first draft proposed
> creating a list of money-committing tools and asked the planner to settle where
> it should live. **Both questions were already answered in the repository** and
> the draft had not looked. This version is built on what exists.

## The list already exists

`tests/agent/wager.test.ts:79-88`:

```ts
const WAGER_TOOLS = [
  'submit_agent_grid', 'submit_market_grid', 'close_agent_position',
  'override_agent_protection', 'set_agent_per_trade_push',
  'reset_agent_drawdown_baseline', 'halt_intelligence_agent',
  'resume_intelligence_agent',
];
const ANSWER_TOOLS = ['accept_entry_decision', 'cancel_entry_decision'];
```

This is exactly the fact the port is missing — **this product's own judgement
about which operations commit funds** — and it has been written down since
`author-agents` (2026-07-27). It lives in a test, where it enforces
*unreachability*. Nothing carries it into the runtime, where it could drive
*classification*.

So the change is not "invent a source of truth". It is **give the existing one a
second consumer**, and stop it being two lists that can drift.

## A10 settles where the code goes, and it is the adapter

A10 has two structural halves:

| | Rule |
|---|---|
| 1 | No `WAGER_TOOLS` name may appear anywhere in `src/` or `app/` — these are operations the product must not be able to call |
| 2 | `ANSWER_TOOLS` may appear **only** in `src/infrastructure/battlegrid/` |

That rules out the first draft's suggestion of putting names in
`src/domain/capability/`. It would violate half 1 outright for eight tools, and
half 2 for the other two.

**So the producer is the adapter**, which is also the only place allowed to know
tool names at all (policy P6, "one way in"). Concretely:
`rawDiscoverTools` in `src/infrastructure/battlegrid/mcp-adapter.ts:387` maps the
discovered list and is already inside the permitted directory.

## The field already exists too, and has no producer

`DiscoveredTool.declaredScope` is declared (`tool-class.ts:56`), read
(`classify.ts:50`), and **set by nothing**. `classify.ts:61` says *"tools that
need wager authority say so, and are caught by `declaredScope`"* — describing a
mechanism with no producer, which is why the hole survived four months of being
read.

**Giving `declaredScope` a producer is the fix.** The domain keeps its existing
shape and stays name-free; the adapter supplies the fact it is uniquely permitted
to know.

That is a much smaller change than the first draft implied, and it repairs the
comment rather than deleting it.

## Two classes of tool, two protections, and only one needs runtime

This is the simplification the first draft missed.

**The eight `WAGER_TOOLS` are unreachable by construction.** A10 half 1 means
their names cannot appear in `src/` or `app/` at all — so the product cannot call
them, and runtime classification of them is unnecessary. **You cannot call what
you cannot name.** Their protection is structural and already works.

**Only the reachable money-committing tools need runtime classification.** Today
that is `accept_entry_decision` and `cancel_entry_decision` — the two A10 half 2
confines to the adapter, and the two the product actually calls.

So the runtime list is *short*, and it grows by exactly one deliberate move: when
a change releases a tool, its name moves from `WAGER_TOOLS` to the adapter's
reachable list, guarded on both sides. That is the same shape DL-10 already
performed by hand for the answer pair.

## The two lists must not drift

The risk in having a test list and a runtime list is that they disagree. Three
properties, all of which must be built:

1. **One home.** The names live in one module inside
   `src/infrastructure/battlegrid/`; `wager.test.ts` imports it rather than
   re-declaring. A10's guard then reads the same list it protects.
2. **Partition, asserted.** Every money-committing tool is in exactly one of
   *forbidden* or *reachable*. A name in both, or in neither while being called,
   is an error.
3. **Every name resolves.** A name absent from the discovered surface is an
   error, not a silent no-op — the failure mode `CLAUDE.md` warns about when it
   says never hard-code a tool list. With a vacuity guard, because an empty scan
   passes everything.

## A gap the sweep found

`random_submit_market_grid` is **money-affecting** — it submits a Market Grid
entry, and entry costs the fee — and it is **not in `WAGER_TOOLS`**. It is not
named in `src/` or `app/` today, so nothing is currently wrong; but nothing stops
the next person naming it either.

Add it. This is the value of doing the class rather than the tool: the sweep
found a hole in the guard that already existed.

Full sweep of the five money-affecting tools annotated `destructiveHint: false`:

| tool | in `WAGER_TOOLS`? | reachable? |
|---|---|---|
| `accept_entry_decision` | no — released (DL-10) | yes, adapter |
| `close_agent_position` | yes | no |
| `submit_market_grid` | yes | no |
| `submit_agent_grid` | yes | no |
| `random_submit_market_grid` | **no — gap** | no |

## `destructiveHint` becomes evidence

Kept and demoted. It stops deciding and becomes recorded: it is the platform's
own claim, it has been measured wrong on five tools, and that record has value.

The absent case is unchanged and still fails closed — `classify.ts:44`'s *"assume
the worst rather than the convenient"* was right and simply never extended to the
present-and-wrong case. `UNKNOWN_TOOL` is untouched, so a newly deployed
money-committing tool is safe before anyone classifies it.

## The audit column — settled, not deferred

`call-path.ts:105` writes `destructive: cls.destructive`; `audit-list.tsx:60`
renders it as a badge. Today a position-opening write reads `destructive: false`.

**Decision: record both, and never rewrite history.**

- The row carries **the platform's claim** and **this product's judgement** as
  separate facts. The badge renders ours, because it is presented as our
  statement about what we did to someone's account.
- **Existing rows are not backfilled.** An audit you edit is not an audit. Rows
  before this change carry the platform's answer in the single old field, and the
  change is dated in the journal so a reader can place them.
- Recording both rather than replacing keeps the disagreement visible, which is
  what this repository does everywhere else with declared-versus-observed — and
  it turns the inversion into standing evidence instead of a footnote.

## What must not change

- **No second opinion about whether a write is allowed.**
  `answer-decision.command.ts:16-20` is explicit that the port owns
  classification, scope, the confirmation consume and the audit row. This change
  makes the port's opinion correct; it must not move the decision upward.
- **`read-answer-authority.query.ts` still decides only what is drawn**, never
  what is permitted — the P1 rule the approvals log warns about in advance.
- **A10's behavioural half is untouched.** A wager call arriving without the
  scope is refused before it is attempted and is not audited as an attempt.

## How this gets proven

The existing tests pass while the defect is live, so the new ones must fail
against today's code before they pass against tomorrow's:

- **Classification driven from the real record.** `buildClassificationMap` over
  `docs/battlegrid-mcp-capabilities.json`, asserting `accept_entry_decision`
  requires wager and is consequential. Fails today.
- **The guard test stops fabricating its input.**
  `tests/agent/answer-authority.test.ts:171-176` hand-builds
  `{ destructive: true, requiredScope: 'mcp:wager' }`. Every assertion in it is
  correct about an input production never produces — a true test of the wrong
  subject, and the reason nobody saw this. It must take its classification from
  the real map.
- **Every new guard reverted once** and shown to fail, per standing practice.
