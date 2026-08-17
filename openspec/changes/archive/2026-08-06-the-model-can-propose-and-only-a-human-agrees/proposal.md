# The model can propose, and only a human agrees

## Why

The MCP server can answer eighteen questions about the operator's account and
change nothing. That was the right call and it is now the binding constraint.

The operator's stated intent for this product: *"our heart and soul will be the
MCP controller … translate what the user wants to do via chat into the
application."* Half of that is built. A model can explain that an agent is
burning money on evaluations it can never execute, and cannot set
`tradingMode: OFF`.

`the-assistant-cannot-be-trusted-with-a-write` set out why writes were withheld,
and it is still true: every write here runs **describe → confirm → perform**
with a token digest-bound to the values it was formed against. That binding
stops a *changed* payload. It cannot stop a model calling describe and perform
back to back without ever showing a human "this will archive Apex and stop three
deployments". The ceremony's premise is a person reading the consequence, and
MCP gives that person no seat.

The backlog item named three ways out and ruled one of them in only if the
answer to *act or draft* is **draft**. It is draft.

## The design, in one sentence

**The model records an intent; the human's own describe → confirm → perform runs
unchanged.**

Concretely:

1. A model calls `propose_stop_trading` (or edit, rebind, deploy, retune). The
   product **stores the intent** — which tool, which target, which values — and
   returns a reference and a URL.
2. Nothing is described, no token is minted, nothing is reserved.
3. The operator opens that URL. The web app runs `describe` **then**, against
   BattleGrid as it is at that moment, renders the consequence it always
   renders, and mints the token it always mints.
4. The operator agrees, and `perform` runs exactly as it does today.

## Why storing the intent beats minting a token early

The obvious version — describe at proposal time and hold the token until the
human releases it — fails on its own terms:

- **The token lives 300 seconds.** An operator reviewing a model's suggestion
  will very often arrive after it has expired, so the common path becomes an
  error, and `openspec/config.yaml` already records that expiry is a normal path
  rather than a failure to design around.
- **A token is a bearer capability.** Handing one to a model, even one with no
  tool to spend it, puts an unspent authorization in a transcript.
- **A consequence rendered at proposal time is stale by definition.** The
  operator would be agreeing to a sentence computed against a world that has
  moved — which is precisely what value-binding exists to prevent.

Storing the intent has none of those properties. A proposal carries **no
authority at all**: it is a note saying what a model suggested. If the world
changed between the suggestion and the reading, the fresh describe shows the
world as it is, and the operator agrees to that or does not.

## What this changes about "No Tool Mutates"

That requirement stands, and gets sharper rather than weaker.

Today it forbids a tool reaching any mutating use-case, enforced by a derived
check. `propose_*` reaches none — it writes a row in this product's own
database and touches BattleGrid not at all. The requirement is MODIFIED to say
what it has always meant: **no tool may change anything on the operator's
BattleGrid account**, and specifically no tool may reach `perform`.

The derived guard gets stricter, not looser: it currently keys on a name prefix
that happens to include `describe`. It will key on whether a use-case can reach
the platform's write path.

## What is out of scope

- **Any model-facing agreement mechanism.** No elicitation, no "the model asked
  and the user said yes in chat". The seat is in the web app, and this change
  does not add a second one.
- **Auto-executing a proposal.** There is no setting that makes proposals
  perform themselves. Adding one later would undo the entire argument.
- **Wager scope.** Nothing here requests `mcp:wager`, and no proposal type
  covers a tool that needs it.
- **Proposal editing by the model.** A proposal is immutable once recorded; a
  model that changed its mind records a new one and the stale one is dropped.

## Capabilities

- `mcp-control` — MODIFIED `No Tool Mutates`; ADDED the proposal surface and
  what a proposal is not.
- `battlegrid-connection` — ADDED: a stored proposal carries no authority.

## Track

`full`. It touches the trust boundary, adds a table and a migration, changes a
requirement that the product's entire safety argument rests on, and is the
first change to let anything outside the web app initiate a write path. If
ambiguity here causes rework, the rework is expensive and the failure is
somebody's money.
