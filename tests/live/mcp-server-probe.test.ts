import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * The MCP server, launched as a real subprocess and driven as a real client.
 *
 *     BATTLEGRID_API_KEY=bg_live_… DATABASE_URL=… npx vitest run tests/live/mcp-server-probe.test.ts
 *
 * The other MCP tests wire the server in memory over fakes. This one starts
 * `bin/grid-commander-mcp.ts` the way an operator's client starts it — spawn,
 * stdio, handshake — and asks it real questions about the real account. It is
 * the difference between "the handlers work" and "Claude Desktop can use this".
 *
 * It also proves the negative: `archive_agent` is not a tool here, and asking
 * for it is refused rather than quietly doing something adjacent.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const DB = process.env['DATABASE_URL'];
const live = KEY && DB ? describe : describe.skip;

live('the MCP server answers a real client', () => {
  it('lists a read-only surface and answers real reads', { timeout: 300_000 }, async () => {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', 'bin/grid-commander-mcp.ts'],
      env: {
        ...(process.env as Record<string, string>),
        BATTLEGRID_API_KEY: KEY as string,
        DATABASE_URL: DB as string,
        // The server needs these to boot; the values are irrelevant to a
        // stdio run, which resolves no session and stores no token.
        TOKEN_ENCRYPTION_KEY:
          process.env['TOKEN_ENCRYPTION_KEY'] ?? randomBytes(32).toString('base64'),
        SESSION_SECRET: process.env['SESSION_SECRET'] ?? randomBytes(32).toString('hex'),
      },
    });
    const client = new Client({ name: 'grid-commander-probe', version: '1.0.0' });
    await client.connect(transport);

    try {
      const { tools } = await client.listTools();
      // eslint-disable-next-line no-console
      console.log(`  tools/list → ${tools.length} tools`);
      expect(tools.length).toBeGreaterThan(10);

      // Each one by what it does, asserted against what a client actually
      // receives. Every tool but `propose_agent_change` is a read; that one
      // writes a row to this product's own store and says so, because
      // `readOnlyHint` means "does not modify its environment" and not "does
      // not modify BattleGrid".
      for (const t of tools) {
        expect(t.annotations?.readOnlyHint, t.name).toBe(t.name !== 'propose_agent_change');
        expect(t.annotations?.destructiveHint, t.name).toBe(false);
      }

      const instructions = client.getInstructions() ?? '';
      expect(instructions).toMatch(/read-only/i);

      const text = (r: unknown): string =>
        ((r as { content: { text: string }[] }).content[0]?.text ?? '');

      const roster = JSON.parse(
        text(await client.callTool({ name: 'list_agents', arguments: {} })),
      ) as { roster: { kind: string; agents?: { id: string; displayName: string }[] } };
      // eslint-disable-next-line no-console
      console.log(`  list_agents → ${roster.roster.kind}, ${roster.roster.agents?.length ?? 0} agents`);
      expect(roster.roster.kind, 'the roster should read').toBe('agents');

      const field = JSON.parse(
        text(await client.callTool({ name: 'read_field', arguments: {} })),
      ) as { field: { kind: string; field?: { shown: number; stats: { totalAgents: number | null; totalNetPnl: number | null } } } };
      if (field.field.kind === 'field') {
        // eslint-disable-next-line no-console
        console.log(
          `  read_field → ${String(field.field.field?.stats.totalAgents)} agents, ` +
            `${String(field.field.field?.shown)} shown, net ${String(field.field.field?.stats.totalNetPnl?.toFixed(2))}`,
        );
      }

      const agentId = roster.roster.agents?.[0]?.id;
      if (agentId) {
        const pipeline = JSON.parse(
          text(
            await client.callTool({
              name: 'read_decision_pipeline',
              arguments: { agentId, limit: 3 },
            }),
          ),
        ) as { funnel: { kind: string }; blocks: { kind: string }; decisions: { kind: string } };
        // eslint-disable-next-line no-console
        console.log(
          `  read_decision_pipeline → funnel=${pipeline.funnel.kind} blocks=${pipeline.blocks.kind} decisions=${pipeline.decisions.kind}`,
        );
        // Each part reports its own state rather than the call failing.
        expect(pipeline.funnel.kind).toBeTruthy();

        /**
         * The one forward-looking tool, asked the way a model would ask it:
         * name an agent and nothing else, and let the product choose the coins.
         *
         * What is asserted is not the verdicts — they are whatever the market
         * is doing this minute — but that **the answer says where its subject
         * came from**. A model handed "none of these qualify" without being
         * told the product picked the coins reports a stuck agent to its owner,
         * and over stdio nothing but this sentence stands between the two.
         */
        const screening = JSON.parse(
          text(await client.callTool({ name: 'read_qualification', arguments: { agentId } })),
        ) as {
          kind: string;
          screening?: string;
          reason?: string;
          source?: { kind: string; coins: string[]; because?: string };
          result?: {
            kind: string;
            verdicts?: { coinTicker: string; qualifies: boolean; firstFailReason: string | null }[];
          };
        };
        // eslint-disable-next-line no-console
        console.log(`  read_qualification → ${screening.screening ?? screening.reason ?? '?'}`);

        if (screening.kind === 'screened') {
          expect(screening.source?.kind, 'the coins have a stated source').toBeTruthy();
          // Every coin screened is named in the sentence a model will repeat,
          // so it cannot quote a subject narrower than the one it answers about.
          for (const coin of screening.source?.coins ?? []) {
            expect(screening.screening, 'the sentence names every coin screened').toContain(coin);
          }
          expect(screening.result?.kind, 'the screening reports its own state').toBeTruthy();
          for (const v of screening.result?.verdicts ?? []) {
            // eslint-disable-next-line no-console
            console.log(
              `    ${v.coinTicker}: ${v.qualifies ? 'would take it' : 'would not'}` +
                `${v.firstFailReason ? ` — ${v.firstFailReason}` : ''}`,
            );
          }
        } else {
          // "Nothing could be screened" is a statement about this product's
          // inability to pick a subject, and it carries its own sentence rather
          // than an empty verdict list.
          expect(screening.kind).toBe('no-coins');
          expect(screening.reason).toBeTruthy();
        }
      }

      // The negative, proven rather than asserted in a comment.
      const refused = await client.callTool({ name: 'archive_agent', arguments: {} });
      expect((refused as { isError?: boolean }).isError).toBe(true);
      // eslint-disable-next-line no-console
      console.log(`  archive_agent → refused: ${text(refused)}`);
    } finally {
      await client.close();
    }
  });
});
