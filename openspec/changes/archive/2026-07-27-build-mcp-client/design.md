# Design: BattleGrid MCP client (Tier 0)

## Technical Approach

A single package, `packages/battlegrid-mcp/`, that wraps the official
`@modelcontextprotocol/sdk` streamable-HTTP client. Auth is a static Bearer key
from `BG_API_KEY`; connect once, invoke tools by name.

The capability boundary is the design's whole point, and it is enforced on two
layers that back each other up:

- **Compile-time** — three client faces (`ObserveClient`, `ManageClient`,
  `WagerClient`). Each exposes only the tools of its tier and below, so a
  wager tool is not even a method on the observe/manage faces. Consumers hold
  the narrowest face they need.
- **Runtime** — a single classification map (tool name → tier) and a dispatch
  guard that checks the requested tool's tier against the client's granted tier
  before any network call. This is the *actual* guarantee: even a
  stringly-typed or dynamic call to a higher-tier tool is refused. Unknown tools
  classify as `wager` and are therefore refused by default — fail safe.

The classification map is seeded from `docs/reference/battlegrid-mcp-tools.json`
(already in the repo) and is the single source of safety truth. A `gen:tools`
script refreshes it and the typed surface from a live `tools/list`; between
regenerations, a newly-advertised tool is unknown → treated as wager → refused,
so drift never opens the boundary.

## Decisions

### Decision: Three tiers, not two
Chosen because BattleGrid's own `mcp:read` / `mcp:wager` split is about trading
authority, not read-vs-write: several `mcp:read` tools mutate the account
(create an agent, apply a strategy, `rebind` is destructive). Collapsing those
into "read" would let a pure-observation consumer mutate the account. Rejected:
the two-client (read | wager) model from the first architecture review — too
coarse, surfaced the moment agent/strategy creation became the first product.

### Decision: Runtime guard is the guarantee; types are ergonomics
Chosen because the server warns its tool surface changes between deploys and
advertises `tools.listChanged`. A purely type-based boundary drifts silently the
moment the generated surface is stale. The runtime classification map, with
unknown → wager, fails closed regardless of type staleness. Rejected:
compile-time-only enforcement — it would be a real boundary only until the next
BattleGrid deploy.

### Decision: Static Bearer auth, no OAuth
Chosen because the static `bg_live_` key authenticates directly as a Bearer
token and this is a headless client we control. Rejected: the OAuth /
dynamic-client-registration flow — it exists on the server, but it was only ever
needed for claude.ai's connector; building it here is pure cost.

### Decision: Do not pre-generate all 110 typed tool signatures now
Chosen because the boundary (classification + guards) is what carries the
safety weight, and it needs only the tool *names* and tiers, which we have.
Exhaustive per-tool argument/return types can grow per consumer as each tool is
actually used. Rejected: generating all 110 up front — large, and most go
unused until their consumer exists.

## Data Flow

```
consumer
  │ holds an ObserveClient | ManageClient | WagerClient (narrowest it needs)
  ▼
client.call(toolName, args)
  │
  ├─► classify(toolName)         → observe | manage | wager  (unknown ⇒ wager)
  ├─► guard(tier ≤ grantedTier)? ─ no ─► reject before any network call
  │       │ yes
  ▼       ▼
@modelcontextprotocol/sdk  ──streamable-HTTP + Bearer──►  mcp.battlegrid.trade/mcp
  ▲
  └─ structured result (or surfaced tool error) ──► consumer
```

## File Changes

- `packages/battlegrid-mcp/package.json` (new) — package, deps, scripts
- `packages/battlegrid-mcp/src/transport.ts` (new) — SDK connect, Bearer from env, session
- `packages/battlegrid-mcp/src/scopes.ts` (new) — tier classification map + `classify()`; the safety source of truth
- `packages/battlegrid-mcp/src/client.ts` (new) — dispatch + runtime guard; observe/manage/wager faces
- `packages/battlegrid-mcp/src/health.ts` (new) — health/identity check
- `packages/battlegrid-mcp/src/index.ts` (new) — public surface: the three client faces, no wager on the default
- `packages/battlegrid-mcp/scripts/gen-tools.ts` (new) — regenerate classification + types from live tools/list
- `packages/battlegrid-mcp/test/*` (new) — see tasks; the boundary tests are the important ones
- root `package.json` / `pnpm-workspace.yaml` / `tsconfig.json` (new) — workspace scaffolding
