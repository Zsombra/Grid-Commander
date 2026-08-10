# Your First Session

How to go from a checkout to actually working your agents. Fifteen minutes,
none of it moves money.

## 1. Boot it

```bash
npm install
cp .env.example .env
```

Fill `.env` — three things matter:

- **`DATABASE_URL`** — any PostgreSQL 16.
- **The encryption secrets** — generated once, per the comments in the file.
- **`BATTLEGRID_API_KEY`** — your key, the **personal** path. Leave the two
  OAuth variables empty; they exist for the multi-tenant deployment where
  other people connect *their* accounts, and setting a key makes `/connect`
  say there is nothing to connect. Register nothing.

Then:

```bash
npx drizzle-kit generate && npx drizzle-kit migrate
npm run dev        # plain next dev — not --turbopack, see next.config.ts
```

Open `http://localhost:3000`. With a personal key you are already "connected";
the roster is the first thing you see.

## 2. Trust it before you use it

One command tells you whether what this product knows about BattleGrid is
current:

```bash
DATABASE_URL=… BATTLEGRID_API_KEY=… ./scripts/ci.sh
```

The **`freshness`** gate compares the recorded platform surface against the
live server and fails if BattleGrid has deployed since. They deploy often, the
tool count never moves, and meaning changes underneath — if this gate is red,
re-probe before trusting anything else:

```bash
BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py
```

## 3. Look before you touch — the reading tour

In the order the questions actually come up:

1. **`/agents`** — the roster. Every agent, its binding, its budget gauges,
   its brain by its real name.
2. **`/agents/[id]`** — opens with **what has been stopping it**. On this
   account that is the honest headline: `AGENT_APPROVAL_EXPIRED` by the
   dozens, `INSUFFICIENT_EQUITY` with the platform's own numbers
   (`equityUsd: 4.19` against `thresholdUsd: 10`). An agent that "does
   nothing" almost always has a stated reason.
3. **`/agents/[id]/pipeline`** — why it did or didn't trade, candidate by
   candidate: blocked before evaluation, evaluated-and-skipped (score vs the
   threshold in force), or decided — with the agent's reasoning and the
   per-signal checklist. Open any evaluation for the full 72-signal scorecard
   and what the thinking cost.
4. **`/agents/[id]/trades`** — every closed trade: P&L, both fees, slippage,
   leverage, why it closed. The summary is derived from the trades and says
   so, because the platform's own figure measures against a risk budget and
   reads zero without one.
5. **`/agents/[id]/qualification`** — the one forward-looking read: would
   this agent take these coins *right now*, and which gate refuses. This is
   the tuning loop's front half — check it before and after a strategy edit
   instead of waiting a cycle to read the wreckage.
6. **`/explorer`** — the denominator. The field as a whole is **losing
   money** (−$162 over 773 trades at last count); your rank means little
   without that. Open any competitor for their whole public record.
7. **`/arena`** — the Market Grid sessions, watch-only. Playing stakes a real
   entry fee and is deliberately not offered.

### Start the recorder today, even if you read nothing else

The platform serves *current* signal readings only — nothing on BattleGrid
answers "what did the signals say yesterday". Every claim about signal
behaviour therefore rests on forward data, and each day without a recorder is
history nobody can re-fetch. One cron line starts it:

```cron
17 * * * *  cd /path/to/grid-commander && DATABASE_URL=… BATTLEGRID_API_KEY=bg_live_… npx tsx bin/grid-commander-record.ts
```

Each run captures what every signal says for your deployed coins, at the
timeframes their deployments watch (or name coins: `--coins BTC,ETH
--interval 4h`). It exits nonzero when it recorded nothing, so cron's mail is
your dead-recorder alarm — and `/recorder` shows the record's own coverage,
gaps stated as gaps. Reads only: a capture changes nothing on your account.

## 4. When you're ready to change something

Every write is the same shape: **describe → confirm → perform.** The page
states the consequence against your account *as it is now* — the whole
condition list a save would produce, the agents a strategy edit reconfigures,
what stops when you undeploy — and the confirmation is cryptographically bound
to those exact values. If the account moved between describe and perform, the
write refuses rather than acting on stale agreement.

Sensible first writes, in ascending blast radius:

1. **Rename an agent** — trivial, proves the ceremony.
2. **Fork a strategy, with a name** — creates your own copy, touches nothing
   that exists. Name it: the platform's default is `<parent> (fork)` and it
   500s on a duplicate, which is how this account came to hold twenty-two
   strategies named `Dunkirk (fork)`.
3. **Edit the fork** — sections, tagline, a signal rule's allocation, a
   condition. Compile shows you the blast radius (zero, on an unbound fork)
   before anything applies.
4. **Rebind an agent to your fork** — the first write that changes live
   behaviour. The describe names the revision you are binding to.

Things the product will not do, on purpose: place trades or move money (no
wager scope, structurally); play arena sessions; create a market's *first*
radar deployment (the platform refuses it over MCP — do that one on
battlegrid.trade); let a model perform a write (a model can *propose* through
the MCP server; only you, at `/pending`, can agree).

## 5. Drive it from a model, if you like

`docs/MCP_SERVER.md` — point Claude Desktop, Claude Code, or any MCP client at
the product and ask it the questions the pages answer. All reads (plus one
tool that records a proposal and stops — trust `tools/list` over any count
written here). "How is Fade Master II doing and what's stopping it" is a fair
question; the answers carry the same unreadable-vs-empty honesty as the pages.
Once the recorder has been running a while, so is "what did `rsi_oversold`
say on BTC over the last week, and what did price do after" —
`read_signal_history` serves the record, gaps and all.

## 6. What to expect from the platform itself

- **Outages are routine.** 504s and `INTERNAL_ERROR`s come and go (one
  six-hour explorer outage was observed and resolved without any change on
  this side). Every surface renders that as *unreadable with a reason* —
  distinct from empty. If a page says BattleGrid is not answering, it is the
  platform, and nothing on your account has changed.
- **`/audit`** holds every write ever made on your behalf: actor, tool,
  outcome. If you ever wonder whether something acted — look there.
- The open questions worth knowing about live in `openspec/backlog/` — twenty
  items, each with its evidence and what would settle it. Several wait on
  you: funding agents past the $10 equity threshold, a browser OAuth consent,
  or a decision to put an agent into `APPROVAL_REQUIRED` mode.
