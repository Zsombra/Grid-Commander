import type { Agent } from '@/domain/agent/agent.js';
import type { Brain } from '@/domain/agent/brain.js';
import { isApprovedModel, isKnownBrainPreset } from '@/domain/agent/catalog.js';
import type { ValidationIssue } from '@/domain/agent/trading-config.js';
import {
  buildTradingConfig,
  positionManagementForPreset,
  positionManagementFrom,
  positionSizePresetsFrom,
  validateTradingConfig,
} from '@/domain/agent/trading-config.js';
import type { AgentsPort } from '@/ports/agents.js';

export interface CreateAgentRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly displayName: string;
  readonly brain: Brain;
  readonly strategyId: string;
  /**
   * The money questions BattleGrid refuses to default, as the operator answered
   * them. Raw rather than a built `TradingConfig`, because assembling one needs
   * the catalog — and this command already has it.
   */
  readonly money: Readonly<Record<string, unknown>>;
  /**
   * A position-management preset from the catalog, or `CUSTOM`, or absent —
   * the last two both mean the product-assembled values. A named preset means
   * the platform's own twelve values for it, never a substitute.
   */
  readonly positionPreset?: string | undefined;
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
      // Two different refusals. The presets are read from the create tool's own
      // declaration, so an empty set means it could not be read — and telling
      // an operator their choice "is not a brain preset" on the strength of a
      // read that failed blames them for it. `DescribeDeployQuery` draws the
      // same line for timeframes, in the same words.
      issues.push({
        field: 'brain.preset',
        reason:
          catalog.brainPresets.length === 0
            ? 'BattleGrid did not declare which brain presets it accepts, so none can be validated.'
            : `"${req.brain.preset}" is not a brain preset.`,
      });
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

    /**
     * The config is assembled here, not supplied.
     *
     * `tradingConfig` used to arrive as `null` from the one page that creates
     * agents, so every agent this product made traded under limits it neither
     * set nor could name. BattleGrid declares no default for the money
     * questions, so omitting them did not inherit something sensible — it left
     * them unanswered.
     *
     * All-or-nothing: the platform rejects a partial `tradingConfig` and resets
     * whatever a partial send omits, so this either produces a complete one or
     * refuses and says which questions have no answer.
     */
    /**
     * A named preset is the platform's values or a refusal — never a fallback.
     *
     * `positionManagementForPreset` answers only when the catalog carried the
     * preset *and* its configuration; anything else is a validation issue in
     * the same shape as an unknown brain preset. Falling back to the CUSTOM
     * assembly here would create an agent labeled COLT carrying values that
     * are not COLT's — the exact lie the requirement forbids.
     */
    const preset = req.positionPreset;
    let positionManagement = positionManagementFrom(catalog, 'CUSTOM');
    if (preset !== undefined && preset !== 'CUSTOM') {
      const fromCatalog = positionManagementForPreset(catalog, preset);
      if (fromCatalog === null) {
        issues.push({
          field: 'positionPreset',
          reason: `"${preset}" is not a position-management preset the catalog describes.`,
        });
      } else {
        positionManagement = fromCatalog;
      }
    }

    const built = buildTradingConfig(catalog, {
      ...req.money,
      positionManagement,
      positionSizePresets: positionSizePresetsFrom(catalog),
    });

    if (built.kind === 'incomplete') {
      issues.push(
        ...built.missing.map((field) => ({
          field,
          reason: 'BattleGrid sets no default for this, so it has to be answered here.',
        })),
      );
    } else {
      issues.push(...validateTradingConfig(built.config, catalog));
    }

    if (issues.length > 0) return { kind: 'invalid', issues };
    // Narrowed by the guard above: `incomplete` always produced an issue.
    if (built.kind !== 'config') return { kind: 'invalid', issues };

    const agent = await this.agents.createAgent({
      userId: req.userId,
      accessToken: req.accessToken,
      displayName: req.displayName,
      brain: req.brain,
      strategyId: req.strategyId,
      tradingConfig: built.config,
      arenaChallengeEnabled: req.arenaChallengeEnabled,
      idempotencyKey: req.idempotencyKey,
    });
    return { kind: 'created', agent };
  }
}
