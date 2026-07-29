import type { Agent } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type { AgentsPort, JournalResult, RosterResult } from '@/ports/agents.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { mapAgent, mapCatalog, mapSlotUsage } from './agent-mapper.js';
import { unreadable } from './unreadable.js';

/**
 * Agent operations, expressed as BattleGrid tool calls.
 *
 * Every one of them goes through `BattleGridPort.callTool`, which runs the guard
 * sequence built in `connect-battlegrid-account`: classify, refuse unheld scope,
 * require a confirmation bound to the operation and its target, open the audit
 * record before the attempt. There is deliberately no second route: a direct
 * fetch from here would make all four of those advisory.
 *
 * The tool names below are the only place they appear. They are not a
 * capability list — nothing here decides what a tool *does*; the server's
 * annotations do that, per session.
 */

const TOOLS = {
  list: 'list_intelligence_agents',
  get: 'get_intelligence_agent',
  create: 'create_intelligence_agent',
  update: 'update_intelligence_agent',
  rebind: 'rebind_intelligence_agent',
  archive: 'archive_intelligence_agent',
  activate: 'activate_intelligence_agent',
  models: 'list_approved_models',
  tradingCatalog: 'get_trading_config_catalog',
  journal: 'get_agent_journal',
} as const;

/**
 * The named brain presets, from the create tool's own enum.
 *
 * A closed enum in the schema rather than a catalog endpoint — there is no tool
 * that lists them. Kept here at the boundary, next to the tool names, rather
 * than in the domain: if BattleGrid adds one, this is where the surprise lands.
 */
const BRAIN_PRESETS = [
  'MONTGOMERY',
  'KESSELRING',
  'CHUIKOV',
  'EISENHOWER',
  'ZHUKOV',
  'NIMITZ',
  'BRADLEY',
  'ROMMEL',
  'PATTON',
  'YAMAMOTO',
] as const;

export class McpAgentAdapter implements AgentsPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async listAgents(params: { userId: string; accessToken: string }): Promise<RosterResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.list, { statuses: ['ACTIVE', 'ARCHIVED'] });
    } catch (err) {
      // Unreadable is its own state. Reporting an empty roster here would tell a
      // user their agents are gone. See design D-H.
      return unreadable(err);
    }

    const slots = mapSlotUsage(payload['slotUsage']);
    const raw = payload['agents'];
    if (!Array.isArray(raw) || raw.length === 0) return { kind: 'empty', slots };
    return { kind: 'agents', agents: raw.map(mapAgent), slots };
  }

  async getAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<Agent> {
    const payload = await this.call(params, TOOLS.get, { agentId: params.agentId });
    return mapAgent(payload['agent'] ?? payload);
  }

  async readCatalog(params: { userId: string; accessToken: string }): Promise<CatalogResult> {
    try {
      const [models, trading] = await Promise.all([
        this.call(params, TOOLS.models, {}),
        this.call(params, TOOLS.tradingCatalog, {}),
      ]);
      return { kind: 'catalog', catalog: mapCatalog(models, trading, BRAIN_PRESETS) };
    } catch (err) {
      // No catalog, no form. Offering one whose submission is certain to fail
      // is worse than saying the platform could not be reached.
      return unreadable(err);
    }
  }

  async createAgent(params: {
    userId: string;
    accessToken: string;
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
    arenaChallengeEnabled?: boolean | undefined;
    idempotencyKey?: string | undefined;
  }): Promise<Agent> {
    const payload = await this.call(
      params,
      TOOLS.create,
      {
        displayName: params.displayName,
        brain: brainToArgument(params.brain),
        strategyId: params.strategyId,
        ...(params.tradingConfig ? { tradingConfig: params.tradingConfig.fields } : {}),
        ...(params.arenaChallengeEnabled === undefined
          ? {}
          : { arenaChallengeEnabled: params.arenaChallengeEnabled }),
      },
      { idempotencyKey: params.idempotencyKey },
    );
    return mapAgent(payload['agent'] ?? payload);
  }

  async updateAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    expectedRevision: number;
    changes: Readonly<Record<string, unknown>>;
    confirmationToken: string;
  }): Promise<Agent> {
    const payload = await this.call(
      params,
      TOOLS.update,
      {
        agentId: params.agentId,
        expectedRevision: params.expectedRevision,
        ...params.changes,
      },
      // `target` alone was supplied here, and the guard needs both. A
      // destructive tool with a target and no token is refused every time.
      { target: params.agentId, confirmationToken: params.confirmationToken },
    );
    return mapAgent(payload['agent'] ?? payload);
  }

  async rebindAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    strategyId: string;
    expectedRevision: number;
    confirmationToken: string;
  }): Promise<Agent> {
    const payload = await this.call(
      params,
      TOOLS.rebind,
      {
        agentId: params.agentId,
        strategyId: params.strategyId,
        expectedRevision: params.expectedRevision,
        confirm: true,
      },
      {
        // Bound to the pair, not to the verb — a confirmation for one agent must
        // not carry onto another. See domain `rebindTarget`.
        target: `agent:${params.agentId}->strategy:${params.strategyId}`,
        confirmationToken: params.confirmationToken,
      },
    );
    return mapAgent(payload['agent'] ?? payload);
  }

  async setLifecycle(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    expectedRevision: number;
    to: 'ACTIVE' | 'ARCHIVED';
    confirmationToken?: string | undefined;
  }): Promise<Agent> {
    const payload = await this.call(
      params,
      params.to === 'ARCHIVED' ? TOOLS.archive : TOOLS.activate,
      { agentId: params.agentId, expectedRevision: params.expectedRevision },
      { target: params.agentId, confirmationToken: params.confirmationToken },
    );
    return mapAgent(payload['agent'] ?? payload);
  }

  async readJournal(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<JournalResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.journal, {
        agentId: params.agentId,
        ...(params.limit === undefined ? {} : { limit: params.limit }),
      });
    } catch (err) {
      return unreadable(err);
    }

    const raw = payload['entries'] ?? payload['journal'];
    if (!Array.isArray(raw) || raw.length === 0) return { kind: 'empty' };
    return {
      kind: 'entries',
      entries: raw.map((entry: unknown) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return {
          at: new Date(String(e['createdAt'] ?? e['at'] ?? 0)),
          kind: String(e['type'] ?? e['kind'] ?? 'entry'),
          summary: String(e['summary'] ?? e['title'] ?? ''),
          detail: typeof e['detail'] === 'string' ? e['detail'] : null,
        };
      }),
    };
  }

  // -- internals ---------------------------------------------------------

  private async call(
    who: { userId: string; accessToken: string },
    tool: string,
    args: Record<string, unknown>,
    extras: {
      target?: string | undefined;
      confirmationToken?: string | undefined;
      idempotencyKey?: string | undefined;
    } = {},
  ): Promise<Record<string, unknown>> {
    const result = await this.battlegrid.callTool({
      userId: who.userId,
      accessToken: who.accessToken,
      tool,
      args,
      ...extras,
    });
    // Already the payload: the adapter unwrapped the MCP envelope. There was
    // an `asObject` here that returned `{}` for anything it did not recognise,
    // which is precisely how an unread envelope became "you have no agents".
    return result.content as Record<string, unknown>;
  }
}
