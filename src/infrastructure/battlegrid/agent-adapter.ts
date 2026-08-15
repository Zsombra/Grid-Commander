import type { Agent } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { brainToArgument } from '@/domain/agent/brain.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type {
  AgentsPort,
  BudgetResult,
  PerformanceResult,
  CatalogResult,
  EntryDecision,
  GateBlock,
  GateBlocksResult,
  JournalResult,
  RosterResult,
  SignalEvaluation,
  StageResult,
  ThoughtLogResult,
  TradeOutcomesResult,
  EvaluationResult,
  FunnelResult,
  QualificationResult,
  TradeChartResult,
  PositionAuditResult,
  FleetSpendResult,
} from '@/ports/agents.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import type { FailureCause } from '@/ports/failure.js';
import { isSilent } from '@/domain/agent/journal.js';
import {
  mapAgent,
  mapBudget,
  mapPerformanceReading,
  mapCatalog,
  mapCoinQualification,
  mapEntryDecision,
  mapGateBlock,
  mapRecord,
  mapRosterAgent,
  mapSignalEvaluation,
  mapSlotUsage,
  mapThought,
  mapTradeOutcome,
} from './agent-mapper.js';
import { malformed, messageOf, unreadable } from './unreadable.js';
import { mapEvaluationScorecard } from './scorecard-mapper.js';
import { mapAuditEvent, mapTradeChart } from './trade-story-mapper.js';
import { declaredValues } from './declared-values.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';

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
  hub: 'get_agents_hub',
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
  performance: 'get_agent_performance',
  tradeOutcomes: 'list_trade_outcomes',
  gateBlocks: 'list_gate_blocks',
  signalLogs: 'list_signal_logs',
  entryDecisions: 'list_entry_decisions',
  signalLogDetail: 'get_signal_log',
  signalPerformance: 'get_signal_performance',
  coinQualification: 'get_agent_coin_qualification',
  tradeChart: 'get_trade_chart',
  positionAudit: 'get_position_audit_history',
} as const;

/**
 * The window the refusal fallback reads in, and how many of them it will take.
 *
 * Small enough that one poisoned row costs 25 rows instead of 100, large enough
 * that filling a hundred-row summary takes four calls rather than a hundred.
 * Eight windows absorbs four refusals and still fills the request; past that
 * the result admits the gap instead of walking further, because a fallback that
 * keeps calling a platform that keeps refusing is the outage, not the remedy.
 *
 * These bound the fallback only. The ordinary read is one call at whatever
 * limit the caller asked for and never reaches this.
 */
const FALLBACK_WINDOW = 25;
const FALLBACK_WINDOWS = 8;

/**
 * How many tickers `get_agent_coin_qualification` will screen in one call.
 *
 * Read off the tool's own `maxItems` in the surface record. Held here rather
 * than in the use-case because it is the platform's constraint on this call,
 * and a caller that oversteps it gets a validation refusal rather than a
 * truncated answer — so the cap is enforced where the call is composed, and
 * what was dropped is reported rather than silently lost.
 */
const MAX_TICKERS_PER_CALL = 12;

export class McpAgentAdapter implements AgentsPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async readFleetSpend(params: {
    userId: string;
    accessToken: string;
  }): Promise<FleetSpendResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.hub, {});
    } catch (err) {
      return unreadable(err);
    }
    const summary = payload['summary'];
    // A hub answer without its summary is a read that did not answer the
    // question — not a fleet that spent nothing.
    if (typeof summary !== 'object' || summary === null) {
      return malformed('the hub answer carried no summary');
    }
    const s = summary as Record<string, unknown>;
    const asNum = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;
    return {
      kind: 'spend',
      totalCost24hUsd: asNum(s['totalCost24hUsd']),
      activeAgents: asNum(s['activeAgents']),
    };
  }

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
    // The roster mapping, not the shared one: this is the read whose
    // `last24hCostUsd` is trusted — the detail read answers 0 for the same
    // agent at the same moment. See `mapRosterAgent`.
    return { kind: 'agents', agents: raw.map(mapRosterAgent), slots };
  }

  /**
   * Every tool that answers with an agent — this read, and the five writes
   * below — returns `{ agent: {...} }`. Walked live against v18.2.0 on
   * 2026-08-13: get, create, update, rebind, archive and activate, each read
   * off the wire rather than off the reference (#103).
   *
   * `create` alone carries a sibling key, `slotUsage`, which is the reason
   * these read the field instead of treating the envelope as the agent.
   *
   * This was `payload['agent'] ?? payload` at all five sites, tolerating a
   * bare-agent shape the reference does not document and the platform has
   * never been seen to send. It failed closed either way — `mapAgent` throws
   * without an id and a revision — so the fallback never cost safety. What it
   * cost was certainty: nobody reading it could tell which shape arrives, and
   * the answer had never been asked of the platform.
   */
  async getAgent(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<Agent> {
    const payload = await this.call(params, TOOLS.get, { agentId: params.agentId });
    return mapAgent(payload['agent']);
  }

  async readCatalog(params: { userId: string; accessToken: string }): Promise<CatalogResult> {
    try {
      const [models, trading, brainPresets] = await Promise.all([
        this.call(params, TOOLS.models, {}),
        this.call(params, TOOLS.tradingCatalog, {}),
        this.brainPresets(params.accessToken),
      ]);
      return { kind: 'catalog', catalog: mapCatalog(models, trading, brainPresets) };
    } catch (err) {
      // No catalog, no form. Offering one whose submission is certain to fail
      // is worse than saying the platform could not be reached.
      return unreadable(err);
    }
  }

  /**
   * The brain presets, from the create tool's own enum in the *discovered*
   * schema — the same discovery every session already performs.
   *
   * This was ten names written down here, under a comment saying that if
   * BattleGrid added one, this is where the surprise would land. It had already
   * landed: the enum in this repo's first capabilities dump (2026-07-27, server
   * v3.0.0) carried eleven values, two days before the constant was written with
   * ten — the ten in the field's *description*, which enumerates presets in
   * prose and is not the constraint beside it. Being the designated landing
   * place for the surprise did not make anyone look for eight days. Meanwhile
   * the server went v3.0.0 → v11.0.0 (probed 2026-08-06) with `tool_count`
   * never moving off 110, which is the record's own warning about what a stable
   * tool list does and does not tell you.
   *
   * So it is read, exactly as `RadarPort.deploymentTimeframes` and
   * `MarketPort.rankingVocabulary` read theirs. Still resolved at the boundary,
   * next to the tool names; the domain still receives a list whose origin it
   * does not know.
   */
  private async brainPresets(accessToken: string): Promise<readonly string[]> {
    let tools: readonly DiscoveredTool[];
    try {
      tools = await this.battlegrid.discoverTools(accessToken);
    } catch {
      // A discovery that failed is a declaration that could not answer, not a
      // platform with no presets. Empty travels out and the surfaces say which,
      // the way an empty timeframe list does one module over — and the model
      // route, whose values did answer, stays open.
      return [];
    }
    const create = tools.find((t) => t.name === TOOLS.create);
    // A value the declaration lists as a preset *and* uses to name a branch of
    // the same union is ambiguous inside the declaration itself, and this
    // product does not offer a choice it cannot describe. Derived from the two
    // enums rather than named here, so it stays true if either moves. What the
    // platform does with such a value is not established — see the backlog item
    // `preset-custom-in-the-preset-branch-is-unestablished`; nothing here
    // guesses, and nothing here explains it.
    const branches = new Set(declaredValues(create, 'brain.kind'));
    return declaredValues(create, 'brain.preset').filter((preset) => !branches.has(preset));
  }

  async createAgent(params: {
    userId: string;
    accessToken: string;
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
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
        // On the wire, not only in the audit record. The create tool declares
        // this field itself — "a retry with the same key returns the original
        // result" — so the platform's contract is offered, not merely quoted.
        // Per-tool rather than in `call()`, because an operation that does not
        // declare the field rejects the whole payload for it
        // (additionalProperties: false is how every update failed, once).
        ...(params.idempotencyKey ? { idempotencyKey: params.idempotencyKey } : {}),
      },
      { idempotencyKey: params.idempotencyKey },
    );
    return mapAgent(payload['agent']);
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
    return mapAgent(payload['agent']);
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
    return mapAgent(payload['agent']);
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
    return mapAgent(payload['agent']);
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

  async readPerformance(params: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<PerformanceResult> {
    try {
      const payload = await this.call(params, TOOLS.performance, { agentId: params.agentId });
      return { kind: 'performance', reading: mapPerformanceReading(payload) };
    } catch (err) {
      // A curve that failed to load is not an agent that settled nothing —
      // the platform itself distinguishes the two, and so must this read.
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

  /**
   * Gate blocks, reading around a refusal if the platform makes one.
   *
   * **One call is the happy path and stays the happy path.** The fallback below
   * engages only when the ordinary read comes back `unreadable`, so a platform
   * that answers costs exactly what it always did. The defect it was built for
   * (#100) healed upstream by 2026-08-14; the fallback stays as dormant
   * defense, because it costs nothing while the platform answers and this
   * platform has regressed before.
   */
  async readGateBlocks(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    limit?: number | undefined;
  }): Promise<GateBlocksResult> {
    const whole = await this.stage(params, TOOLS.gateBlocks, mapGateBlock);
    if (whole.kind === 'none') return whole;
    if (whole.kind === 'entries') return { ...whole, refused: null };
    return this.readAroundRefusal(params, whole);
  }

  /**
   * The same history, in windows small enough that one poisoned row does not
   * take the rest with it.
   *
   * Dated history, not live status: from 2026-08-12 to 2026-08-13,
   * `list_gate_blocks` refused on **specific rows**, deterministically, with
   * the refusals clustered at the head of the history (#100, re-bisected
   * 2026-08-13) — a single call for a hundred rows failed whenever any one of
   * the hundred was poisoned, while rows 151-250 on the same agent read
   * perfectly. Healed upstream by 2026-08-14: re-probed read-only, both
   * affected agents answered every window, zero refusals.
   *
   * Bounded on purpose. The account carries an agent with 5,483 blocks, and
   * walking those to summarise a reason obvious from the first hundred would
   * answer an outage with a second one. Eight windows is enough to fill the
   * requested count while absorbing four refusals, and when it is not enough
   * the result says so rather than pretending it read everything.
   */
  private async readAroundRefusal(
    params: {
      userId: string;
      accessToken: string;
      agentId: string;
      limit?: number | undefined;
    },
    refusal: { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause },
  ): Promise<GateBlocksResult> {
    const want = params.limit ?? FALLBACK_WINDOW;
    const entries: GateBlock[] = [];
    let total: number | null = null;
    let refusedWindows = 0;

    for (let page = 1; page <= FALLBACK_WINDOWS && entries.length < want; page += 1) {
      let payload: Record<string, unknown>;
      try {
        payload = await this.call(params, TOOLS.gateBlocks, {
          agentId: params.agentId,
          limit: FALLBACK_WINDOW,
          page,
        });
      } catch {
        // The reason is already held in `refusal`; a per-window reason would be
        // one of several and the surface can only show one honestly.
        refusedWindows += 1;
        continue;
      }
      const raw = payload['entries'];
      if (!Array.isArray(raw)) {
        refusedWindows += 1;
        continue;
      }
      // Every window that answers restates it, so the last one wins rather than
      // the first — `total` is the platform's current count, not a snapshot
      // taken before the walk began.
      if (typeof payload['total'] === 'number') total = payload['total'];
      // An empty window is the end of the history, not a refusal. Counting it
      // as a gap would put a permanent "some could not be read" on every agent
      // whose history is shorter than the walk.
      if (raw.length === 0) break;
      for (const row of raw) entries.push(mapGateBlock(row));
    }

    // Nothing survived. `unreadable` with the platform's own first reason, not
    // an empty summary: reading around a refusal is not inventing one.
    if (entries.length === 0) return refusal;

    return {
      kind: 'entries',
      entries,
      total,
      refused:
        refusedWindows === 0
          ? // Every window answered, so the single call failed on a row the
            // smaller windows never asked for. There is no gap to admit.
            null
          : { windows: refusedWindows, rows: refusedWindows * FALLBACK_WINDOW },
    };
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

  /**
   * Whether this agent's gates would admit a trade on each named coin.
   *
   * `verdicts` missing entirely is `unreadable`, not `none`. The distinction is
   * the one the roster has enforced since the beginning and it matters more
   * here than almost anywhere: an empty verdict list rendered as an answer says
   * *your agent would take none of these*, which is a claim about the agent's
   * settings, made on the strength of a read that failed.
   */
  async readCoinQualification(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    coinTickers: readonly string[];
  }): Promise<QualificationResult> {
    // A caller asking for none would be refused by the schema's `minItems`.
    // Answering it here costs one round trip less and says the same thing.
    if (params.coinTickers.length === 0) return { kind: 'none' };

    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.coinQualification, {
        agentId: params.agentId,
        coinTickers: params.coinTickers.slice(0, MAX_TICKERS_PER_CALL),
      });
    } catch (err) {
      return unreadable(err);
    }
    const raw = payload['verdicts'];
    if (!Array.isArray(raw)) return malformed('the qualification carried no verdicts');
    if (raw.length === 0) return { kind: 'none' };
    try {
      return { kind: 'verdicts', verdicts: raw.map(mapCoinQualification) };
    } catch (err) {
      return malformed(messageOf(err));
    }
  }

  async readTradeChart(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    logId: string;
  }): Promise<TradeChartResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.tradeChart, {
        agentId: params.agentId,
        logId: params.logId,
      });
    } catch (err) {
      return unreadable(err);
    }
    // The status discrimination lives in the mapper: no-trade and not-found
    // are the platform's answers, not failures, and only the mapper has the
    // payload in hand to keep them apart from a malformed one.
    return mapTradeChart(payload);
  }

  async readPositionAudit(params: {
    userId: string;
    accessToken: string;
    agentId: string;
    positionId: string;
  }): Promise<PositionAuditResult> {
    let payload: Record<string, unknown>;
    try {
      payload = await this.call(params, TOOLS.positionAudit, {
        agentId: params.agentId,
        positionId: params.positionId,
      });
    } catch (err) {
      return unreadable(err);
    }
    const raw = payload['events'];
    if (!Array.isArray(raw)) return malformed('no events returned');
    if (raw.length === 0) return { kind: 'none' };
    return { kind: 'events', events: raw.map(mapAuditEvent) };
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
