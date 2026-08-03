import type { Agent } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type {
  AgentsPort,
  BudgetResult,
  EntryDecision,
  GateBlock,
  JournalResult,
  RosterResult,
  SignalEvaluation,
  StageResult,
  ThoughtLogResult,
  TradeOutcomesResult,
  EvaluationResult,
  FunnelResult,
} from '@/ports/agents.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { isSilent } from '@/domain/agent/journal.js';
import {
  mapAgent,
  mapBudget,
  mapCatalog,
  mapEntryDecision,
  mapGateBlock,
  mapRecord,
  mapSignalEvaluation,
  mapSlotUsage,
  mapThought,
  mapTradeOutcome,
} from './agent-mapper.js';
import { malformed, unreadable } from './unreadable.js';
import { mapEvaluationScorecard } from './scorecard-mapper.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';

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
  tradeOutcomes: 'list_trade_outcomes',
  gateBlocks: 'list_gate_blocks',
  signalLogs: 'list_signal_logs',
  entryDecisions: 'list_entry_decisions',
  signalLogDetail: 'get_signal_log',
  signalPerformance: 'get_signal_performance',
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
    confirmation: Confirmation;
  }): Promise<Agent> {
    const payload = await this.call(
      params,
      TOOLS.update,
      {
        agentId: params.agentId,
        expectedRevision: params.expectedRevision,
        ...params.changes,
      },
      // Forwarded, not composed. `target` alone was supplied here once, and the
      // guard needs both; then both were supplied and the target was the bare
      // agent id, which is what let an agreement about $25 authorise $25,000.
      { confirmation: params.confirmation },
    );
    return mapAgent(payload['agent'] ?? payload);
  }

  async rebindAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    strategyId: string;
    expectedRevision: number;
    confirmation: Confirmation;
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
      // Built by the command with `confirmationTarget.agentRebind`. It was
      // composed here, correctly, and being correct in four adapters out of five
      // is what made the fifth invisible.
      { confirmation: params.confirmation },
    );
    return mapAgent(payload['agent'] ?? payload);
  }

  async setLifecycle(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    expectedRevision: number;
    to: 'ACTIVE' | 'ARCHIVED';
    confirmation?: Confirmation | undefined;
  }): Promise<Agent> {
    const payload = await this.call(
      params,
      params.to === 'ARCHIVED' ? TOOLS.archive : TOOLS.activate,
      { agentId: params.agentId, expectedRevision: params.expectedRevision },
      { confirmation: params.confirmation },
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

  async readTradeOutcomes(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    page?: number | undefined;
    limit?: number | undefined;
  }): Promise<TradeOutcomesResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.tradeOutcomes, {
        agentId: params.agentId,
        ...(params.page === undefined ? {} : { page: params.page }),
        ...(params.limit === undefined ? {} : { limit: params.limit }),
      });
    } catch (err) {
      return unreadable(err);
    }

    const raw = payload['outcomes'];
    if (!Array.isArray(raw)) return malformed('no outcomes returned');
    if (raw.length === 0) return { kind: 'none' };
    return {
      kind: 'outcomes',
      outcomes: raw.map(mapTradeOutcome),
      total: typeof payload['total'] === 'number' ? payload['total'] : null,
    };
  }

  async readGateBlocks(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<StageResult<GateBlock>> {
    return this.stage(params, TOOLS.gateBlocks, mapGateBlock);
  }

  async readSignalLogs(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<StageResult<SignalEvaluation>> {
    return this.stage(params, TOOLS.signalLogs, mapSignalEvaluation);
  }

  async readEntryDecisions(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<StageResult<EntryDecision>> {
    return this.stage(params, TOOLS.entryDecisions, mapEntryDecision);
  }

  /**
   * The three pipeline stages share one envelope — `{entries, total}` —
   * established live 2026-08-03 by reading all three. One helper rather
   * than three copies, because the shape is the platform's, not ours, and
   * three copies would be three places to notice it changing.
   */
  /**
   * One of this account's own evaluations, in full.
   *
   * The same `log` shape the public read returns, mapped by the same
   * function — with `owned: true`, which is what lets the owner-only cost
   * be read at all. Until this existed the product read the 23-key list
   * row and showed a stranger's agent more than the user's own.
   */
  async readOwnEvaluationDetail(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<EvaluationResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.signalLogDetail, {
        agentId: params.agentId,
        logId: params.logId,
      });
    } catch (err) {
      return unreadable(err);
    }
    const evaluation = mapEvaluationScorecard(payload, { owned: true });
    // `log: null` is the platform's documented answer for an evaluation it
    // will not detail. Nothing published is not nothing readable.
    if (evaluation === null) return { kind: 'none' };
    return { kind: 'evaluation', evaluation };
  }

  async readOwnFunnel(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<FunnelResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.signalPerformance, { agentId: params.agentId });
    } catch (err) {
      return unreadable(err);
    }
    const n = (k: string): number | null =>
      typeof payload[k] === 'number' && Number.isFinite(payload[k]) ? (payload[k] as number) : null;
    // An agent that has evaluated nothing gets `none`, not a funnel of
    // zeros — the same distinction the roster keeps between empty and
    // unreadable, one surface in.
    if (n('totalEvaluations') === null) return { kind: 'none' };
    const topRaw = Array.isArray(payload['topCoinsByEvaluation'])
      ? payload['topCoinsByEvaluation']
      : [];
    return {
      kind: 'funnel',
      funnel: {
        totalEvaluations: n('totalEvaluations'),
        totalDecisions: n('totalEntryDecisions'),
        enterDecisions: n('enterCount'),
        // Two counters, two fields. `skipCount` is decisions that were
        // SKIP; `skippedCount` is pipelines whose terminal status was
        // SKIPPED. Never summed, never substituted.
        skipDecisions: n('skipCount'),
        skippedTerminal: n('skippedCount'),
        executed: n('executedCount'),
        failed: n('failedCount'),
        expired: n('expiredCount'),
        cancelled: n('cancelledCount'),
        blocked: n('blockedCount'),
        pending: n('pendingCount'),
        fillRatePercent: n('fillRatePct'),
        avgAggregateScorePercent: n('avgAggregateScorePercent'),
        avgConvictionPercent: n('avgConvictionPercent'),
        avgRiskRewardRatio: n('avgRiskRewardRatio'),
        outcomeCount: n('outcomeCount'),
        winCount: n('winCount'),
        lossCount: n('lossCount'),
        winRatePercent: n('winRatePercent'),
        avgNetPnl: n('avgNetPnl'),
        totalNetPnl: n('totalNetPnl'),
        avgDurationSeconds: n('avgDurationSeconds'),
        topCoins: topRaw
          .map((raw: unknown) => {
            const c = (raw ?? {}) as Record<string, unknown>;
            const coinTicker = typeof c['coinTicker'] === 'string' ? c['coinTicker'] : null;
            if (!coinTicker) return null;
            return {
              coinTicker,
              count: typeof c['count'] === 'number' ? c['count'] : null,
            };
          })
          .filter((c): c is { coinTicker: string; count: number | null } => c !== null),
      },
    };
  }

  private async stage<T>(
    params: { userId: string; accessToken: string; agentId: string; limit?: number | undefined },
    tool: string,
    map: (raw: unknown) => T,
  ): Promise<StageResult<T>> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, tool, {
        agentId: params.agentId,
        ...(params.limit === undefined ? {} : { limit: params.limit }),
      });
    } catch (err) {
      return unreadable(err);
    }
    const raw = payload['entries'];
    if (!Array.isArray(raw)) return malformed(`no entries returned by ${tool}`);
    if (raw.length === 0) return { kind: 'none' };
    return {
      kind: 'entries',
      entries: raw.map(map),
      total: typeof payload['total'] === 'number' ? payload['total'] : null,
    };
  }

  // -- internals ---------------------------------------------------------

  private async call(
    who: { userId: string; accessToken: string },
    tool: string,
    args: Record<string, unknown>,
    extras: {
      confirmation?: Confirmation | undefined;
      idempotencyKey?: string | undefined;
    } = {},
  ): Promise<Record<string, unknown>> {
    const result = await this.battlegrid.callTool({
      userId: who.userId,
      accessToken: who.accessToken,
      tool,
      args,
      // The pair, split onto the two wire-level fields the guard reads. **One
      // place** — this is where a target could once again be composed by hand,
      // and a second mapping is the defect this change exists to remove.
      target: extras.confirmation?.target,
      confirmationToken: extras.confirmation?.token,
      idempotencyKey: extras.idempotencyKey,
    });
    // Already the payload: the adapter unwrapped the MCP envelope. There was
    // an `asObject` here that returned `{}` for anything it did not recognise,
    // which is precisely how an unread envelope became "you have no agents".
    return result.content as Record<string, unknown>;
  }
}
