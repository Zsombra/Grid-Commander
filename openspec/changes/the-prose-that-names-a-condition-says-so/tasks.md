# Tasks

## 1. The refusal keeps its structure

- [ ] 1.1 Give `CompileResult`'s rejected arm the platform's structured detail
      alongside the reason it already carries — the authoring code, and the
      context the platform sends with it. Traces to: **A Compile Refused For
      The Strategy's Own Prose Is Named As That**.
- [ ] 1.2 Parse it in `strategy-adapter.ts`'s compile `catch`, where
      `messageOf(err)` currently flattens the whole body to a string.
      `mapColumnRefusal` (`:1093`) already parses this exact shape for the
      column checker — **reuse it or extract from it**, do not write a second
      parser for the same envelope.
- [ ] 1.3 A refusal that is not JSON, or that carries no `details`, keeps its
      full message and claims no structure. Traces to: scenario "A refusal that
      does not parse".

## 2. It reaches the describe

- [ ] 2.1 `CompilePlanResult`'s rejected arm threads the detail
      (`compile-plan.command.ts:51` currently drops everything but `reason`).
- [ ] 2.2 `DescribeConditionWriteQuery` gains an arm for the marker case,
      beside `no-such-condition` / `inexpressible` / `drift` — distinct facts
      get distinct arms here, and a bucket labelled `refused` is what this
      change is removing the need for.
- [ ] 2.3 Only `MARKET_READ_MARKER_UNKNOWN` takes the new arm. Every other code
      falls through to `refused` unchanged. Traces to: scenario "A refusal for
      any other reason".

## 3. The page says it

- [ ] 3.1 `app/(app)/strategies/[id]/conditions/save/page.tsx` renders the new
      arm: what the prose names, and the nearest valid key **only when the
      platform gave one**.
- [ ] 3.2 The composed edit survives, as on every other refusing branch.
- [ ] 3.3 Do not render `details.path`'s character offset to the operator. It
      locates the marker in the prose for a machine; a number with no editor to
      jump to is noise.

## 4. Tests

- [ ] 4.1 A refusal carrying `MARKET_READ_MARKER_UNKNOWN` renders the marker
      and the nearest key.
- [ ] 4.2 A refusal carrying a different code renders the platform's words and
      no marker framing.
- [ ] 4.3 A non-JSON refusal renders in full and claims nothing.
- [ ] 4.4 The composed edit survives all three.
- [ ] 4.5 Unit-level: the adapter's parse, against the real refusal body
      recorded on #111 — that text is the only observation of this shape, so it
      is the fixture.

## 5. Gates

- [ ] 5.1 `npm run typecheck`
- [ ] 5.2 `npm run lint`
- [ ] 5.3 `npm test`
- [ ] 5.4 `npm run build`
- [ ] 5.5 `npm run db:generate && git diff --quiet drizzle/`
- [ ] 5.6 `npm run test:db` — blocked on database credentials all session.
      Report blocked, never passed.

## Notes for whoever executes this

**The live probe that found it is `tests/live/condition-write-probe.test.ts`.**
Run with a key, it prints both refusals in full. That is the only place this
shape has ever been observed, and #111 records it verbatim — model from that
text, not from a guess at what the platform "probably" sends.

**Changing `CompileResult` will name its callers.** Same shape as
`sourceRevision` on the fork: prefer the compiler telling you every site over a
field that defaults quietly.
