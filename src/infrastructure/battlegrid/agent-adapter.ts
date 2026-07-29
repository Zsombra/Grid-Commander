import type { Agent } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type { AgentsPort, BudgetResult, JournalResult, RosterResult, ThoughtLogResult } from '@/ports/agents.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { isSilent } from '@/domain/agent/journal.js';
import { mapAgent, mapBudget, mapCatalog, mapRecord, mapSlotUsage, mapThought } from './agent-mapper.js';
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
  thoughts: 'get_agent_thought_log',
  allThoughts: 'get_user_thought_log',
  budget: 'get_agent_budget',
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

  /**
   * Two tools, one shape.
   *
   * `get_agent_thought_log` needs an `agentId`; `get_user_thought_log` takes
   * none and aggregates across every agent. Both were called live and both
   * return `{ entries, limit, page, total }` with identical entries, so the
   * choice is which tool, not which mapper.
   */
  async readThoughtLog(params: {
    userId: string;
    accessToken: string;
    agentId?: string | undefined;
    limit?: number | undefined;
  }): Promise<ThoughtLogResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(
        params,
        params.agentId === undefined ? TOOLS.allThoughts : TOOLS.thoughts,
        {
          ...(params.agentId === undefined ? {} : { agentId: params.agentId }),
          ...(params.limit === undefined ? {} : { limit: params.limit }),
        },
      );
    } catch (err) {
      // Unreadable is its own state. An agent that has not reasoned yet and a
      // log that failed to load are different facts about an agent, and telling
      // a user the first when the second happened is the defect the roster's
      // three states exist to prevent.
      return unreadable(err);
    }

    const raw = payload['entries'];
    if (!Array.isArray(raw) || raw.length === 0) return { kind: 'empty' };
    return {
      kind: 'entries',
      entries: raw.map(mapThought),
      // The server's own count, not `entries.length` — this reads one page of
      // a log that had 340 entries on it.
      total: typeof payload['total'] === 'number' ? payload['total'] : raw.length,
    };
  }

  async readBudget(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<BudgetResult> {
    try {
      const payload = await this.call(params, TOOLS.budget, { agentId: params.agentId });
      return { kind: 'budget', budget: mapBudget(payload) };
    } catch (err) {
      // A budget that failed to load is not an agent with no limits, and the
      // difference is the whole subject of this surface.
      return unreadable(err);
    }
  }

  /**
   * An agent's whole record — what it did, thought, and submitted.
   *
   * `limit` is accepted and forwarded because the port declares it, and the
   * platform ignores it: `get_agent_journal` returned ten of each array on every
   * call, and its schema offers no page argument. Ten is what the surface says.
   */
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

    const record = mapRecord(payload);
    return isSilent(record) ? { kind: 'empty' } : { kind: 'record', record };
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
