# Proposal: The analysis reaches the model

## Why

`the-record-answers-forward` gave the operator `/recorder/analysis` — forward
returns per signal state, with sample sizes and gap-excluded pairing. The MCP
surface was deliberately left alone (backlog
`the-analysis-is-not-on-the-models-surface`, #283). A model holding
`read_signal_history` can re-derive the analysis, and that is exactly the
problem: re-deriving is where the two disciplines get skipped. Parity is this
surface's convention — `read_trade_story` and `read_loss_shape` both shipped
with their pages.

## What Changes

- A sibling read tool, `read_forward_returns`, wrapping the existing
  `ReadForwardReturnsQuery` — the same 1:1 tool-to-use-case grain as every
  other tool on the surface, and the same shape `read_loss_shape` took.
- The tool description carries the two disciplines into the contract a model
  actually receives: a pair spanning a recording gap is excluded and counted,
  not paired; and nothing is sorted by the return, so the tables arrive by
  sample size and a model must not re-rank them.
- `read_signal_history`'s contract is untouched. Its response shape may
  already be consumed, and the sibling read costs nothing.
- The live full-surface probe's registry pin moves 26 → 27 and the probe calls
  the new tool.

## Capabilities

**New**: none
**Modified**: `mcp-control` — one ADDED requirement

## Out of Scope

- Widening `read_signal_history` or `read_record_coverage` to carry the
  analysis. Same reason the loss shape did not widen `read_agent_limits`: an
  additive-looking change to a consumed contract is still a contract change.
- Any new query, port, or derivation. `ReadForwardReturnsQuery` exists, is
  wired in `composition.ts`, and is what `/recorder/analysis` already reads.
- Conditioning the analysis on regime. That is a distinct open question —
  `forward-returns-are-not-regime-conditioned` (#297) — and reading the
  unconditioned analysis over MCP neither answers it nor forecloses it.
- Narrowing the read to one coin or interval. The query takes only a user id;
  giving the tool arguments the use-case does not have would mean a filter
  implemented at the boundary, which is where derivations drift from the page.

## Impact

- `src/mcp/tools.ts` — one tool entry, beside the two record reads.
- `tests/mcp/recorder-tools.test.ts` — the four states over a real client, the
  gap-excluded pair count, the sample-size-descending order, and the
  disciplines in the description. That file, not `server.test.ts`: it is
  already the record's own boundary test and carries the fixtures, including
  a seeded series whose spacing coverage already calls a gap.
- `tests/live/mcp-full-surface-probe.test.ts` — registry pin 26 → 27 and one
  probe call beside `read_record_coverage`. No skip entry: the tool is
  account-scoped, not agent-scoped, so it is always called.
- No production behavior outside the MCP surface changes. No new platform
  call of any kind — this reads the product's own store.
