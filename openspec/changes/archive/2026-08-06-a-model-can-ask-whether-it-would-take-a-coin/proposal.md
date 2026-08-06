# Proposal: A Model Can Ask Whether It Would Take A Coin

## Why

`why-it-would-not-take-this-coin` built `ReadQualificationQuery` and
`/agents/[id]/qualification`. It did not offer either over this product's own
MCP server, and that was a scope decision — the delta spec there is
`agent-understanding`, and exposing a tool is `mcp-control`.

The gap matters more than a missing tool usually would. **Every read on the MCP
surface today is retrospective**: what an agent decided, what stopped it, what
it closed. A model asked "why is my agent not trading" has to infer forward
from backward evidence. Screening is the one question this product can answer
about *now* — the platform scores the agent's gates against live coins, spends
no LLM call, and the agent does not act — and it is the question a model tuning
an agent would ask most often.

It is also the cleanest possible fit for this surface's rule.
`get_agent_coin_qualification` is read-only by BattleGrid's own annotation, and
`ReadQualificationQuery` reaches no Command, so `mcp-read-only.test.ts` admits
it on the same derivation every other read passes on — by what it reaches, not
by what it is called.

## What Changes

- `read_qualification` on the MCP surface, wired to the same
  `readQualification` use-case the web page calls. Takes `agentId`, and
  `coinTickers` when the model wants to choose the subject itself.
- **The response states where the coins came from, ahead of the verdicts.**
  This is the whole risk of exposing this read to a model rather than to a
  person. The web surface shows provenance and verdicts side by side and a
  reader takes in both; a model paraphrasing JSON can carry the verdicts and
  drop a discriminator nested two levels down, and "none of these qualify"
  reported without "the product chose these coins" is a stuck agent reported to
  its owner. So the answer opens with a sentence naming the source — the
  agent's own deployments, a ranked list this product picked, or the caller's
  own list — and the fallback says **why** it happened, because an agent
  deployed nowhere and an agent whose deployments could not be read produce the
  same coins and mean opposite things.
- `docs/MCP_SERVER.md` gains the tool, and its tool count moves.
- `tests/live/mcp-server-probe.test.ts` screens a real agent through the real
  subprocess, and holds the provenance sentence to naming every coin screened.

## What Is Not Changed

- **No new use-case, no new port method, no new mapper.**
  `ReadQualificationQuery` already chooses the coins, names the source, caps at
  what the platform screens and reports what the cap dropped. This change
  carries that across a boundary; it does not re-decide any of it.
- **The web surface is untouched.** `/agents/[id]/qualification` and
  `ScreenedCoins` keep rendering the same `CoinSource`.
- **No write, and no widening of what a model may reach.** The tool is a read
  in the sense this surface means it: it reaches no Command and no confirmation.
- The platform's per-call coin cap is not restated in the tool's schema. It
  lives in the use-case, which caps and *reports what it dropped* rather than
  refusing — a `maxItems` here would tell a client the call fails when it does
  not, and would be a second copy of a number BattleGrid owns.

## Capabilities

**Modified**: `mcp-control` — one ADDED requirement.
