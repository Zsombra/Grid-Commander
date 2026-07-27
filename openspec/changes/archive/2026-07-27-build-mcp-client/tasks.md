# Tasks

## 1. Package scaffolding

- [x] 1.1 Create the pnpm workspace: root `package.json`, `pnpm-workspace.yaml`,
      shared `tsconfig.json` (TypeScript, Node ≥ 20, ESM)
- [x] 1.2 Create `packages/battlegrid-mcp/` with its `package.json`, depending on
      `@modelcontextprotocol/sdk`
- [x] 1.3 Wire the quality gates from config: `pnpm type-check`, `pnpm lint`,
      `pnpm test` (they must run and pass, even on an near-empty package)

## 2. Connection & transport (capability: mcp-connection)

- [x] 2.1 `transport.ts` — connect to `BG_MCP_ENDPOINT` over streamable-HTTP with
      `Authorization: Bearer $BG_API_KEY` via the official SDK
- [x] 2.2 Refuse to start when `BG_API_KEY` is absent, with an error naming the
      variable and no network call *(mcp-connection: Authenticated Connection → Missing key)*
- [x] 2.3 Surface a rejected key as an auth failure, not "connected"
      *(→ Rejected key)*
- [x] 2.4 `health.ts` — a health/identity check returning reachable status +
      authenticated account *(mcp-connection: Connection Health And Identity)*

## 3. Tool invocation + drift (capability: mcp-connection)

- [x] 3.1 `client.call(toolName, args)` returns the tool's structured result
      *(mcp-connection: Tool Invocation → Invoke an available tool)*
- [x] 3.2 Surface tool-returned errors to the caller rather than masking them
      *(→ Tool reports an error)*
- [x] 3.3 Reject invocation of an unrecognized tool with no network request
      *(mcp-connection: Resilience To Tool-Surface Drift → Unknown tool name)*
- [x] 3.4 Report a server-advertised-but-unknown tool as unavailable, never
      call-by-default *(→ Server advertises a new tool)*

## 4. Capability tiers — the safety boundary (capability: capability-tiers)

- [x] 4.1 `scopes.ts` — the classification map (tool → observe|manage|wager),
      seeded from `docs/reference/battlegrid-mcp-tools.json`, plus `classify()`
      where an unknown tool returns `wager` *(capability-tiers: Every Tool Has A
      Tier → both scenarios)*
- [x] 4.2 Three typed client faces (`ObserveClient` / `ManageClient` /
      `WagerClient`); wager tools absent from observe/manage surfaces
      *(Wager Tools Unreachable → typed surface scenario)*
- [x] 4.3 Runtime dispatch guard: reject a tool whose tier exceeds the client's
      grant, before any network call *(Wager Tools Unreachable → refused;
      Manage Unreachable From Observe → refused)*
- [x] 4.4 Wager-capable client only constructable via a distinct, logged path;
      not the default constructor *(Wager Tools Unreachable → explicit construction)*
- [x] 4.5 `index.ts` public surface: default export gives observe/manage; wager
      is opt-in only

## 5. Regeneration

- [x] 5.1 `scripts/gen-tools.ts` — refresh the classification map + typed surface
      from a live `tools/list`, preserving the tier assignments
      *(mcp-connection drift + capability-tiers classification stay current)*

## 6. Verification

- [x] 6.1 **Boundary test (the important one):** assert the observe client
      refuses every one of the 16 wager tools before any network call, and the
      observe client refuses manage tools — pure unit test, no live calls
- [x] 6.2 Test `classify()` returns `wager` for an unknown tool name (fail-safe)
- [x] 6.3 Test missing `BG_API_KEY` refuses to start with the named-variable error
- [x] 6.4 Integration smoke against the live server using observe tools ONLY
      (`get_account_state`, `list_market_grid_sessions`) — never a wager tool;
      gated so it is skipped without a key
- [x] 6.5 All quality gates pass: `pnpm type-check`, `pnpm lint`, `pnpm test`
