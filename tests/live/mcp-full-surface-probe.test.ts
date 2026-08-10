import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * **Every tool this product exposes, called for real, in one run.**
 *
 *     BATTLEGRID_API_KEY=bg_live_… DATABASE_URL=… \
 *       npx vitest run --config vitest.live.config.ts tests/live/mcp-full-surface-probe.test.ts
 *
 * `mcp-server-probe` proves the server boots and answers a handful of
 * questions. This walks the **whole** surface: it lists the tools, discovers
 * the ids they need from the answers of earlier calls, and calls every one —
 * so a tool that silently stopped answering after a BattleGrid deployment
 * fails here rather than in front of an operator's model.
 *
 * Written the day BattleGrid shipped v15, which moved three fields off the
 * agent and onto the strategy. A surface diff tells you what the *platform*
 * changed; only calling every tool tells you what *this product* still
 * answers.
 *
 * The count is asserted so a tool that disappears from the registry fails
 * instead of quietly shrinking the sweep — the same rule
 * `all-controllers-probe` follows.
 */

const KEY = process.env['BATTLEGRID_API_KEY'];
const DB = process.env['DATABASE_URL'];
const live = KEY && DB ? describe : describe.skip;

/** What a call produced — kept apart so "empty" never reads as "broken". */
type Outcome = 'answered' | 'empty' | 'skipped' | 'failed';

interface Row {
  readonly tool: string;
  readonly outcome: Outcome;
  readonly note: string;
}

const text = (result: unknown): string => {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  return content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('\n');
};

live('every MCP tool answers', () => {
  it('walks the whole surface against a real account', { timeout: 900_000 }, async () => {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['tsx', 'bin/grid-commander-mcp.ts'],
      env: {
        ...(process.env as Record<string, string>),
        BATTLEGRID_API_KEY: KEY as string,
        DATABASE_URL: DB as string,
        TOKEN_ENCRYPTION_KEY:
          process.env['TOKEN_ENCRYPTION_KEY'] ?? randomBytes(32).toString('base64'),
        SESSION_SECRET: process.env['SESSION_SECRET'] ?? randomBytes(32).toString('hex'),
      },
    });
    const client = new Client({ name: 'grid-commander-full-probe', version: '1.0.0' });
    await client.connect(transport);
    const rows: Row[] = [];

    const call = async (tool: string, args: Record<string, unknown>): Promise<string | null> => {
      try {
        const res = await client.callTool({ name: tool, arguments: args });
        const body = text(res);
        const isError = (res as { isError?: boolean }).isError === true;
        if (isError) {
          rows.push({ tool, outcome: 'failed', note: body.slice(0, 120) });
          return null;
        }
        // A read that answers "nothing here" is a fact, not a failure — the
        // product's whole `unreadable`-vs-`empty` distinction lives on this.
        // Matched on the payload's own `kind`, never on prose: "recorded" and
        // "never-recorded" both contain "record", and a substring test called
        // a successful write empty.
        const kind = /"kind"\s*:\s*"([a-z-]+)"/.exec(body)?.[1] ?? '';
        const empty = ['none', 'empty', 'never-recorded', 'not-found', 'no-coins'].includes(kind);
        rows.push({
          tool,
          outcome: empty ? 'empty' : 'answered',
          note: body.replace(/\s+/g, ' ').slice(0, 100),
        });
        return body;
      } catch (err) {
        rows.push({ tool, outcome: 'failed', note: String(err).slice(0, 120) });
        return null;
      }
    };

    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      // eslint-disable-next-line no-console
      console.log(`  registry: ${tools.length} tools`);
      expect(tools.length, 'the registry must not shrink unnoticed').toBe(25);

      // --- discovery: ids the rest of the sweep needs ------------------------
      const roster = await call('list_agents', {});
      const agentId = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/.exec(
        roster ?? '',
      )?.[1];
      const listings = await call('list_strategies', {});
      const strategyId = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/.exec(
        listings ?? '',
      )?.[1];

      const skip = (tool: string, why: string): void => {
        rows.push({ tool, outcome: 'skipped', note: why });
      };

      // --- agent-scoped ------------------------------------------------------
      if (agentId) {
        await call('read_agent_thinking', { agentId });
        await call('read_agent_limits', { agentId });
        const record = await call('read_trading_record', { agentId, limit: 5 });
        await call('read_decision_pipeline', { agentId });
        await call('read_deployments', { agentId });
        await call('read_qualification', { agentId, coinTickers: ['BTC'] });

        // A trade story and an evaluation both need the **signal log** id, not
        // the outcome's own id. Taking the first uuid in the payload finds the
        // trade id and both tools answer `not-found` — proving their refusal
        // path and nothing else. The field name is the discriminator.
        const logId = /"signalLogId"\s*:\s*"([0-9a-f-]{36})"/.exec(record ?? '')?.[1];
        if (logId) {
          await call('read_trade_story', { agentId, logId });
          await call('read_evaluation', { agentId, logId });
        } else {
          skip('read_trade_story', 'no closed trade carries a log id on this account');
          skip('read_evaluation', 'no evaluation id available from the record');
        }
      } else {
        for (const t of [
          'read_agent_thinking',
          'read_agent_limits',
          'read_trading_record',
          'read_trade_story',
          'read_decision_pipeline',
          'read_evaluation',
          'read_qualification',
          'read_deployments',
        ]) {
          skip(t, 'no agent id on this account');
        }
      }

      // --- strategy & vocabulary --------------------------------------------
      if (strategyId) await call('read_strategy', { strategyId });
      else skip('read_strategy', 'no strategy id on this account');
      await call('read_signal_library', {});
      await call('read_signal', { signalId: 'rsi_oversold' });
      await call('read_metric_index', {});
      await call('read_metric', { metric: 'ADX' });
      await call('simulate_aggregate', {
        gate: 0.6,
        signals: [{ label: 'RSI oversold', score: 0.8, allocation: 3 }],
      });

      // --- recorder, field, arena, audit ------------------------------------
      await call('read_signal_history', { coinTicker: 'BTC', interval: '1h' });
      await call('read_record_coverage', {});
      const field = await call('read_field', {});
      const competitorId = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/.exec(
        field ?? '',
      )?.[1];
      if (competitorId) await call('read_competitor', { agentId: competitorId });
      else skip('read_competitor', 'the field listed no agent id');
      const arena = await call('watch_arena', {});
      await call('read_game_rules', {});
      const sessionId = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/.exec(
        arena ?? '',
      )?.[1];
      if (sessionId) await call('read_grid_session', { sessionId });
      else skip('read_grid_session', 'no Market Grid session listed');
      await call('read_audit', {});

      // `propose_agent_change` is the one write, and it writes only to this
      // product's own store — a recorded intent no model can perform. Called
      // deliberately: it is part of the surface, and an unexercised write path
      // is how this codebase has produced ten dead ones.
      if (agentId) {
        await call('propose_agent_change', {
          agentId,
          changes: { tradingConfig: { maxDailyTrades: 5 } },
          rationale: 'Full-surface probe: records an inert intent for a human to accept or discard.',
        });
      } else {
        skip('propose_agent_change', 'no agent id on this account');
      }

      // --- report ------------------------------------------------------------
      const width = Math.max(...rows.map((r) => r.tool.length));
      // eslint-disable-next-line no-console
      console.log('\n  tool'.padEnd(width + 4) + 'outcome    note');
      for (const r of rows) {
        // eslint-disable-next-line no-console
        console.log(`  ${r.tool.padEnd(width)}  ${r.outcome.padEnd(9)}  ${r.note}`);
      }
      const failed = rows.filter((r) => r.outcome === 'failed');
      const covered = new Set(rows.map((r) => r.tool));
      // eslint-disable-next-line no-console
      console.log(
        `\n  ${rows.filter((r) => r.outcome === 'answered').length} answered · ` +
          `${rows.filter((r) => r.outcome === 'empty').length} empty · ` +
          `${rows.filter((r) => r.outcome === 'skipped').length} skipped · ${failed.length} failed`,
      );

      // Every registered tool must appear in the sweep — a tool nobody called
      // is a tool nobody proved, and silence is what this file exists to break.
      const uncovered = names.filter((n) => !covered.has(n));
      expect(uncovered, 'every registered tool must be exercised or explicitly skipped').toEqual([]);
      expect(failed.map((f) => `${f.tool}: ${f.note}`), 'no tool may fail').toEqual([]);
    } finally {
      await client.close();
    }
  });
});
