import type { Agent } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { isApprovedModel, isKnownBrainPreset } from '@/domain/agent/catalog.js';
import type { TradingConfig, ValidationIssue } from '@/domain/agent/trading-config.js';
import { validateTradingConfig } from '@/domain/agent/trading-config.js';
import type { AgentsPort } from '@/ports/agents.js';

export interface CreateAgentRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly displayName: string;
  readonly brain: Brain;
  readonly strategyId: string;
  readonly tradingConfig: TradingConfig | null;
  readonly arenaChallengeEnabled?: boolean | undefined;
  readonly idempotencyKey?: string | undefined;
}

export type CreateAgentResult =
  | { readonly kind: 'created'; readonly agent: Agent }
  | { readonly kind: 'at-capacity'; readonly explanation: string }
  | { readonly kind: 'invalid'; readonly issues: readonly ValidationIssue[] }
  | { readonly kind: 'no-catalog'; readonly reason: string };

/**
 * Create an agent, refusing before the platform has to.
 *
 * Two checks happen here that BattleGrid would also perform: capacity and
 * bounds. Duplicating them is deliberate — the requirement is that a user is
 * told *before* they compose an agent that cannot be created, and that a value
 * is rejected against the live catalog rather than against a guess. A product
 * that submits and relays the rejection has technically validated nothing.
 */
export class CreateAgentCommand {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: CreateAgentRequest): Promise<CreateAgentResult> {
    const catalogResult = await this.agents.readCatalog(req);
    if (catalogResult.kind === 'unreadable') {
      return { kind: 'no-catalog', reason: catalogResult.reason };
    }
    const { catalog } = catalogResult;

    const roster = await this.agents.listAgents(req);
    if (roster.kind === 'unreadable') {
      // Capacity unknown. Attempting anyway would be composing against state we
      // could not read, which is the thing the roster requirement forbids.
      return { kind: 'no-catalog', reason: roster.reason };
    }
    if (roster.slots === null) {
      // The roster read succeeded but carried no capacity block. Attempting a
      // create here would be composing against a limit we did not learn — and
      // inventing one to check against would be worse.
      return {
        kind: 'no-catalog',
        reason: 'BattleGrid did not report how many agent slots this account has.',
      };
    }
    if (roster.slots.remaining <= 0) {
      const { limit, rankName } = roster.slots;
      return {
        kind: 'at-capacity',
        explanation:
          `You are using all ${limit} of your agent slots. ` +
          `${rankName} allows ${limit}. Archive an agent to free one.`,
      };
    }

    const issues: ValidationIssue[] = [];

    if (req.displayName.trim().length === 0 || req.displayName.length > 80) {
      issues.push({ field: 'displayName', reason: 'Name must be 1–80 characters.' });
    }

    if (req.brain.kind === 'preset' && !isKnownBrainPreset(catalog, req.brain.preset)) {
      issues.push({ field: 'brain.preset', reason: `"${req.brain.preset}" is not a brain preset.` });
    }
    if (req.brain.kind === 'custom' && !isApprovedModel(catalog, req.brain.modelId)) {
      issues.push({
        field: 'brain.modelId',
        reason: `"${req.brain.modelId}" is not a model BattleGrid currently approves.`,
      });
    }

    if (req.strategyId.trim().length === 0) {
      issues.push({ field: 'strategyId', reason: 'An agent must be bound to a strategy.' });
    }

    if (req.tradingConfig) {
      issues.push(...validateTradingConfig(req.tradingConfig, catalog));
    }

    if (issues.length > 0) return { kind: 'invalid', issues };

    const agent = await this.agents.createAgent({
      userId: req.userId,
      accessToken: req.accessToken,
      displayName: req.displayName,
      brain: req.brain,
      strategyId: req.strategyId,
      tradingConfig: req.tradingConfig,
      arenaChallengeEnabled: req.arenaChallengeEnabled,
      idempotencyKey: req.idempotencyKey,
    });
    return { kind: 'created', agent };
  }
}
