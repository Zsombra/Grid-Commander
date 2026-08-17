#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { app } from '@/composition.js';
import type { CookieStore } from '@/infrastructure/http/cookie-session.js';
import { buildServer } from '@/mcp/server.js';

/**
 * Grid-Commander as an MCP server, over stdio.
 *
 * Stdio because it needs no hosting, opens no port, and works with every
 * MCP client that exists today — the operator points Claude Desktop, Claude
 * Code, or any other client at this file and their model can ask this
 * product questions. Which model that is, is theirs to choose and nothing
 * here knows or cares.
 *
 *   {
 *     "mcpServers": {
 *       "grid-commander": {
 *         "command": "npx",
 *         "args": ["tsx", "bin/grid-commander-mcp.ts"],
 *         "env": { "BATTLEGRID_API_KEY": "bg_live_…", "DATABASE_URL": "…" }
 *       }
 *     }
 *   }
 */

/**
 * There is no browser here, so there is no session.
 *
 * `app()` takes a cookie store because a web request has one. A stdio
 * server is launched by one operator's client and acts as that operator, so
 * the store is a stub and `OwnerOnlyUser` — which resolves no session and
 * reads no cookie — is the path taken. If this deployment were configured
 * for delegated sessions instead, `currentUser` would answer
 * `not-connected` below and the server would refuse to start rather than
 * offering tools that fail on every call.
 */
const NO_COOKIES: CookieStore = {
  get: () => undefined,
  set: () => {},
  delete: () => {},
};

async function main(): Promise<void> {
  const built = app(NO_COOKIES);
  const user = await built.currentUser.execute();

  if (user.kind !== 'acting') {
    // Refusing to start beats serving eighteen tools that each fail the
    // same way. The message says what is missing, because the operator is
    // reading a terminal, not a rendered page.
    process.stderr.write(
      'grid-commander-mcp cannot start: no BattleGrid authority.\n' +
        'Set BATTLEGRID_API_KEY (a bg_live_ key) in this server’s environment.\n',
    );
    process.exit(1);
  }

  const server = buildServer({
    app: built,
    authority: { userId: user.authority.userId, accessToken: user.authority.accessToken },
  });

  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  process.stderr.write(`grid-commander-mcp failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
