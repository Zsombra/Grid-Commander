# Tasks

## 1. The refusal keeps its structure

- [x] 1.1 Give `CompileResult`'s rejected arm the platform's structured detail
      alongside the reason it already carries — the authoring code, and the
      context the platform sends with it. Traces to: **A Compile Refused For
      The Strategy's Own Prose Is Named As That**.
- [x] 1.2 Parse it in `strategy-adapter.ts`'s compile `catch`, where
      `messageOf(err)` currently flattens the whole body to a string.
      `mapColumnRefusal` (`:1093`) already parses this exact shape for the
      column checker — **reuse it or extract from it**, do not write a second
      parser for the same envelope.
- [x] 1.3 A refusal that is not JSON, or that carries no `details`, keeps its
      full message and claims no structure. Traces to: scenario "A refusal that
      does not parse".

## 2. It reaches the describe

- [x] 2.1 `CompilePlanResult`'s rejected arm threads the detail
      (`compile-plan.command.ts:51` currently drops everything but `reason`).
- [x] 2.2 `DescribeConditionWriteQuery` gains an arm for the marker case,
      beside `no-such-condition` / `inexpressible` / `drift` — distinct facts
      get distinct arms here, and a bucket labelled `refused` is what this
      change is removing the need for.
- [x] 2.3 Only `MARKET_READ_MARKER_UNKNOWN` takes the new arm. Every other code
      falls through to `refused` unchanged. Traces to: scenario "A refusal for
      any other reason".

## 3. The page says it

- [x] 3.1 `app/(app)/strategies/[id]/conditions/save/page.tsx` renders the new
      arm: what the prose names, and the nearest valid key **only when the
      platform gave one**.
- [x] 3.2 The composed edit survives, as on every other refusing branch.
- [x] 3.3 Do not render `details.path`'s character offset to the operator. It
      locates the marker in the prose for a machine; a number with no editor to
      jump to is noise.

## 4. Tests

- [x] 4.1 A refusal carrying `MARKET_READ_MARKER_UNKNOWN` renders the marker
      and the nearest key.
- [x] 4.2 A refusal carrying a different code renders the platform's words and
      no marker framing.
- [x] 4.3 A non-JSON refusal renders in full and claims nothing.
- [x] 4.4 The composed edit survives all three.
- [x] 4.5 Unit-level: the adapter's parse, against the real refusal body
      recorded on #111 — that text is the only observation of this shape, so it
      is the fixture.

## 5. Gates

- [x] 5.1 `npm run typecheck`
- [x] 5.2 `npm run lint`
- [x] 5.3 `npm test`
- [x] 5.4 `npm run build`
- [x] 5.5 `npm run db:generate && git diff --quiet drizzle/`
- [x] 5.6 `npm run test:db` — 7 files / 85 tests, against `grid_commander_test`.
      The guard from #195 requires a disposable database; this is the first
      change in the session whose db gate actually ran.

## Notes for whoever executes this

**The live probe that found it is `tests/live/condition-write-probe.test.ts`.**
Run with a key, it prints both refusals in full. That is the only place this
shape has ever been observed, and #111 records it verbatim — model from that
text, not from a guess at what the platform "probably" sends.

**Changing `CompileResult` will name its callers.** Same shape as
`sourceRevision` on the fork: prefer the compiler telling you every site over a
field that defaults quietly.

## Execution record — 2026-08-13

**Gates: all six.** typecheck · lint · `npm test` (171 files / **2232**, up from
2221) · build · db:generate + drizzle clean · **`test:db` 7 files / 85 tests**,
run against `grid_commander_test` as the guard from #195 now requires.

**1.2 — the parsers stayed apart, deliberately.** The task said reuse or extract
from `mapColumnRefusal`. Neither: it flattens `allowedDomain` into values and a
rule because the column surface renders those, and this one carries `context`
whole because which of its keys matter depends on the code. Merging would have
made one shape guess at both readers. They are siblings with a comment saying so.

**2.2 — `refusal` was made required on the rejected arm, not optional.** Same
call as `sourceRevision` on the fork, and it paid the same way: the compiler
named all four fixtures that construct a rejected `CompileResult`, and the page
that had no branch for the new arm. A defaulted field would have left the page
silently falling through to `proposal`.

**3.1 — the page states the reading and keeps the platform's sentence.** The
product's words explain what happened; BattleGrid's own text sits beneath them,
so the operator can check the reading rather than take it.

**4.5 — the fixture is the real body**, recorded live 2026-08-06 by the
condition-write probe. It is the only observation of this shape.

## Not done

Nothing. The one open question this change deliberately did not touch —
`conditions: []`, and what removing the *last* condition does — stays on #111's
backlog item, unobserved.
