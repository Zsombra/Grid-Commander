---
id: accept-opens-a-position-without-spending-its-confirmation
title: The confirmation gate is keyed to the platform's destructive hint, so the one write that commits money skips it
type: bug
status: open
priority: p2
created: 2026-08-17
updated: 2026-08-17
change: ""
capability: agent-authoring
github: "340"
blocked_by: []
tags: [battlegrid, confirmation, audit, declared-vs-observed, wager]
---

# The gate believes the platform about which verb is dangerous

## What

`beginGuardedCall` requires a confirmation only for operations it classes as
destructive (`call-path.ts:71`), and that class comes straight from BattleGrid's
annotation (`classify.ts:45`):

```ts
const destructive = mutating && (a.destructiveHint ?? true);
```

BattleGrid annotates the two decision verbs like this, read from
`docs/battlegrid-mcp-capabilities.json`:

| tool | `readOnlyHint` | `destructiveHint` | what it does |
|---|---|---|---|
| `accept_entry_decision` | false | **false** | **opens a real position with real money** |
| `cancel_entry_decision` | false | **true** | declines a proposal; nothing is spent |

The annotation is backwards from where the money risk is, and the guard is keyed
to it. So the single most consequential write this product can make is the one
operation that never reaches step 3.

## Measured, not read

Driven through the real `beginGuardedCall` with the real `classifyTool` and the
annotations above:

```
accept  -> {"mutating":true,"destructive":false,...}
cancel  -> {"mutating":true,"destructive":true,...}

accept admitted with NO confirmation token          audit row destructive flag: false
cancel refused with: ConfirmationRequiredError
token store size before/after: 0 0   <- a token never issued was accepted without complaint
```

The fourth line is the sharpest: a confirmation token that was **never issued**
is accepted for `accept_entry_decision` without complaint, because nothing looks
at it.

## What is and is not protected

**The scope step-up is intact.** Both verbs declare `mcp:wager` and step 2
refuses without it. That guard fires. (An earlier reading of this said the scope
resolved to `mcp:read`; that was an artifact of a synthetic tool object carrying
no `declaredScope`, and is withdrawn.)

**A human is still shown the consequence.** Task 5.2 of
`the-approval-can-be-answered` built the accept confirmation page, and the UI is
the only caller today. Nobody is accepting positions without seeing one.

**What does not fire is the binding.** The confirmation exists to prove the
person agreed to *these* levels — `confirmationTarget.decisionAnswer(verb,
decisionId, shown)` composes the target from the decision id, its revision and
the shown entry/stop/target, and the design says plainly that accepting a
decision whose stop moved between read and click "is a different act from the
one agreed to". That check is never performed for accept. The token is minted,
passed down through `answerDecision` -> `call()` -> `callTool`, and dropped.

**And the levels do move.** The 2026-08-17 live walk recorded a proposed entry of
`1.0009` filling at `1.0017`.

**Consume is also the single spend.** `confirmations.consume` is described in
`call-path.ts` as "the single atomic spender"; skipping it means an accept token
is never spent, so nothing at the port makes it one-shot.

## The audit says the wrong thing about the money

`call-path.ts:105` writes `destructive: cls.destructive` into the audit row, so
the product's own record of a real-money position opening reads
`destructive: false`, while the row for declining one reads `destructive: true`.
`audit-list.tsx:60` renders that flag as a badge. `CLAUDE.md`'s third
architectural fact is that this product moves other people's money and audits
every write; this is the audit describing the money-moving write as the safe one.

## Why p2 and not p1

No path today reaches the port without the UI, and the UI shows the consequence.
The exposure is that the enforcement is advisory rather than actual: the guard
that would catch moved levels, a replayed token, or a caller that skipped the
page does not run on the verb where all three matter most. It becomes p1 the
moment anything other than the confirmation page can call the port.

## Why the existing code did not catch it

`classify.ts` already reasons correctly about the *absent* case — "Where it is
absent on a mutating tool, assume the worst rather than the convenient." The gap
is the *present and wrong* case: a hint that is supplied is trusted. The
repository has a standing rule against exactly this shape of trust
(`the-wager-sentence-offers-scope-as-a-safety-boundary`, and `CLAUDE.md`'s
"Never treat scope alone as a safety boundary"); the same argument applies to
`destructiveHint`, which is one more platform-supplied claim about danger.

`tests/capability/call-path.test.ts` encodes the shape without flagging it — its
`WAGER` fixture is `{ mutating: true, destructive: false, requiredScope:
'mcp:wager' }`, which is `accept_entry_decision` exactly, and no test asks
whether a wager-scoped write should need a confirmation.

`tests/agent/answer-decision.test.ts` does assert accept and cancel compose
*different* targets, so a cancel agreement cannot be spent on an accept. That
test passes and is not vacuous — but it runs against a fake port, so it proves
the target is composed correctly, not that anything checks it.

## What would settle it

Not a special case for one tool name. The narrow version is that **confirmation
should be keyed to consequence rather than to the platform's word for it** —
minimally, a mutating tool requiring `mcp:wager` needs a confirmation regardless
of `destructiveHint`, since wager scope is this product's own marker for a
money-committing act. That keeps the rule shape-based, which is the discipline
`stoppages.tsx` states for itself and #337 re-argues.

Two things to decide when taken, neither obvious:

1. Whether the audit's `destructive` column should record the platform's claim,
   the product's judgement, or both. Recording the platform's claim has evidence
   value; rendering it as a badge asserts it as ours.
2. Whether any other tool carries the same inversion. This was found on one pair;
   the annotation set has not been swept for others.

## Evidence

- `src/infrastructure/battlegrid/call-path.ts:71` (the gate), `:105` (the audit row)
- `src/domain/capability/classify.ts:45`
- `src/application/use-cases/answer-decision.command.ts:74-80` (the target composed)
- `src/infrastructure/battlegrid/agent-adapter.ts:832-841` (passed down)
- `docs/battlegrid-mcp-capabilities.json` — both annotation sets
- `openspec/JOURNAL.md`, 2026-08-17 (accepted) — the observation this item was
  filed from, and the 1.0009/1.0017 fill
- `openspec/backlog/approvals-have-no-write-side.md:69` — records the annotation
  pair as an observation, without drawing this conclusion

## Notes

- Filed from a deferral in the 2026-08-17 journal entry, which recorded the
  inverted annotation and said "Worth its own item" without filing one.
- The proof above was run as a temporary test and then deleted rather than kept,
  because it asserts the current behaviour: a permanent test here would lock the
  defect in. The change that fixes this should carry a test asserting the
  corrected behaviour, verified non-vacuous by reverting.
- Related: [[approvals-have-no-write-side]] (the change that built both verbs),
  [[the-wager-sentence-offers-scope-as-a-safety-boundary]] (the same
  do-not-trust-the-platform's-safety-claim argument, one level out).
