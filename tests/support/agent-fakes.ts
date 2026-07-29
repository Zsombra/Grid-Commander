import type { Agent, SlotUsage } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import type { Catalog, CatalogResult } from '@/domain/agent/catalog.js';
import type { TradingConfig } from '@/domain/agent/trading-config.js';
import type { AgentsPort, JournalResult, RosterResult } from '@/ports/agents.js';

/**
 * An in-memory agent platform.
 *
 * Enforces the two rules a real BattleGrid enforces and a naive double would
 * not: `expectedRevision` must match, and a successful mutation bumps it. A
 * double that ignored the revision would let every concurrency test pass
 * without the code carrying one.
 */
export class FakeAgentsPort implements AgentsPort {
  readonly agents = new Map<string, Agent>();
  /** Every mutating call, in order, exactly as it arrived. */
  readonly calls: Array<{
    op: string;
    agentId?: string | undefined;
    revision?: number | undefined;
    token?: string | undefined;
  }> = [];

  catalog: Catalog = defaultCatalog();
  catalogReadable = true;
  rosterReadable = true;
  journalEntries: JournalResult = { kind: 'empty' };
  slots: SlotUsage | null = { limit: 3, used: 0, remaining: 3, rankName: 'Recruit III' };

  constructor(seed: readonly Agent[] = []) {
    for (const a of seed) this.agents.set(a.id, a);
    if (this.slots) {
      this.slots = { ...this.slots, used: seed.length, remaining: this.slots.limit - seed.length };
    }
  }

  async listAgents(): Promise<RosterResult> {
    if (!this.rosterReadable) return { kind: 'unreadable', reason: 'BattleGrid did not respond', cause: 'unreachable' };
    const agents = [...this.agents.values()];
    if (agents.length === 0) return { kind: 'empty', slots: this.slots };
    return { kind: 'agents', agents, slots: this.slots };
  }

  async getAgent(params: { agentId: string }): Promise<Agent> {
    const found = this.agents.get(params.agentId);
    if (!found) throw new Error(`no such agent: ${params.agentId}`);
    return found;
  }

  async readCatalog(): Promise<CatalogResult> {
    if (!this.catalogReadable) return { kind: 'unreadable', reason: 'catalog unavailable' };
    return { kind: 'catalog', catalog: this.catalog };
  }

  /** Every create payload, in order. */
  readonly created: Array<{
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
  }> = [];

  async createAgent(params: {
    displayName: string;
    brain: Brain;
    strategyId: string;
    tradingConfig: TradingConfig | null;
    arenaChallengeEnabled?: boolean | undefined;
  }): Promise<Agent> {
    this.calls.push({ op: 'create' });
    // The whole payload, kept. `tradingConfig` was `null` on every create for
    // the life of the product and nothing recorded it, so nothing could assert
    // on it.
    this.created.push(params);
    const id = `a${this.agents.size + 1}`;
    const agent: Agent = {
      id,
      revision: 1,
      displayName: params.displayName,
      status: 'ACTIVE',
      binding: {
        strategyId: params.strategyId,
        strategyName: 'Seeded Strategy',
        strategyRevision: 1,
        state: 'BOUND',
      },
      brain: params.brain,
      tradingConfig: params.tradingConfig,
      arenaChallengeEnabled: params.arenaChallengeEnabled ?? false,
      overlayText: null,
      permissions: { canEdit: true, canArchive: true, canEditOverlay: true },
    };
    this.agents.set(id, agent);
    return agent;
  }

  async updateAgent(params: {
    agentId: string;
    expectedRevision: number;
    changes: Readonly<Record<string, unknown>>;
  }): Promise<Agent> {
    this.calls.push({ op: 'update', agentId: params.agentId, revision: params.expectedRevision });
    const current = this.expect(params.agentId, params.expectedRevision);
    const next: Agent = {
      ...current,
      revision: current.revision + 1,
      ...(typeof params.changes['displayName'] === 'string'
        ? { displayName: params.changes['displayName'] }
        : {}),
      ...(params.changes['tradingConfig']
        ? { tradingConfig: { fields: params.changes['tradingConfig'] as Record<string, unknown> } }
        : {}),
    };
    this.agents.set(next.id, next);
    return next;
  }

  async rebindAgent(params: {
    agentId: string;
    strategyId: string;
    expectedRevision: number;
    confirmationToken: string;
  }): Promise<Agent> {
    this.calls.push({
      op: 'rebind',
      agentId: params.agentId,
      revision: params.expectedRevision,
      token: params.confirmationToken,
    });
    const current = this.expect(params.agentId, params.expectedRevision);
    const next: Agent = {
      ...current,
      revision: current.revision + 1,
      binding: {
        strategyId: params.strategyId,
        strategyName: 'Rebound Strategy',
        strategyRevision: 1,
        state: 'BOUND',
      },
    };
    this.agents.set(next.id, next);
    return next;
  }

  async setLifecycle(params: {
    agentId: string;
    expectedRevision: number;
    to: 'ACTIVE' | 'ARCHIVED';
    confirmationToken?: string | undefined;
  }): Promise<Agent> {
    this.calls.push({
      op: `lifecycle:${params.to}`,
      agentId: params.agentId,
      revision: params.expectedRevision,
      token: params.confirmationToken,
    });
    const current = this.expect(params.agentId, params.expectedRevision);
    const next: Agent = { ...current, revision: current.revision + 1, status: params.to };
    this.agents.set(next.id, next);
    return next;
  }

  async readJournal(): Promise<JournalResult> {
    return this.journalEntries;
  }

  private expect(agentId: string, revision: number): Agent {
    const current = this.agents.get(agentId);
    if (!current) throw new Error(`no such agent: ${agentId}`);
    if (current.revision !== revision) {
      // Shaped like the platform's own message so `toDomainError` recognises it.
      throw new Error(`expectedRevision ${revision} did not match; revision conflict`);
    }
    return current;
  }
}

export function anAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'a1',
    revision: 1,
    displayName: 'Volatilis',
    status: 'ACTIVE',
    binding: {
      strategyId: 's1',
      strategyName: 'Volatilis — imported',
      strategyRevision: 1,
      state: 'BOUND',
    },
    brain: { kind: 'preset', preset: 'ROMMEL' },
    tradingConfig: null,
    arenaChallengeEnabled: false,
    overlayText: null,
    permissions: { canEdit: true, canArchive: true, canEditOverlay: true },
    ...overrides,
  };
}

export function defaultCatalog(): Catalog {
  return {
    models: [
      {
        modelId: 'anthropic/claude-opus-4.6',
        displayName: 'Claude Opus 4.6',
        provider: 'Anthropic',
        isDefault: true,
      },
    ],
    brainPresets: ['MONTGOMERY', 'ROMMEL', 'PATTON'],
    positionManagementPresets: [
      { preset: 'COLT', label: 'Colt', description: 'Patient / wide' },
      { preset: 'WEBLEY', label: 'Webley', description: 'Defensive / measured' },
    ],
    bounds: {
      maxStopLossPct: { min: 0.1, max: 25 },
      maxDailyTrades: { max: 100 },
    },
    // The live catalog's defaults, as `get_trading_config_catalog` returns them.
    // The six money fields are absent here because BattleGrid genuinely does not
    // default them — that absence is the whole subject of `undefaultableFields`,
    // and a fixture that filled them in would prove the opposite of the point.
    defaults: {
      maxDailyTrades: 10,
      maxLeverage: 1,
      maxStopLossPct: 5,
      minStopLossPct: 1,
      maxEntryDeviationAtrMultiple: 1.5,
      minRiskRewardRatio: 1.5,
      minTradeConviction: 0.35,
      gridMinConfidence: 0.7,
      maxSlippageBps: 300,
      signalTimeoutMinutes: 10,
      atrMatchesStrategyTimeframe: true,
      atrTimeframe: '1h',
      smallPct: 1,
      mediumPct: 2.5,
      largePct: 5,
    },
  };
}

/** Deterministic tokens, so a test can assert which one was issued. */
export class SequentialRandom {
  private n = 0;
  token(): string {
    return `r${++this.n}`;
  }
  codeChallengeS256(verifier: string): string {
    return `challenge(${verifier})`;
  }
}
