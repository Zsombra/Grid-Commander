import type { Strategy, StrategyQuota } from '@/domain/strategy/strategy.js';
import type {
  CompileResult,
  LifecycleResult,
  StrategiesPort,
  StrategyListResult,
  VocabularyCategory,
  VocabularyResult,
} from '@/ports/strategies.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { malformed, messageOf, unreadable } from './unreadable.js';

/**
 * Strategy operations, expressed as BattleGrid tool calls.
 *
 * Everything goes through `BattleGridPort.callTool` and therefore through the
 * guard sequence — classify, scope, confirmation, audit. `apply_strategy_plan` is
 * annotated destructive by the server, so the guard requires a confirmation for
 * it whether or not this file remembers to ask.
 *
 * **The envelope trap**: four of these tools take `{ request: payload }` rather
 * than the payload directly. Getting it wrong is a validation error, not a
 * silent misbehaviour, but it is the kind of asymmetry that gets "tidied up".
 */

const TOOLS = {
  list: 'list_strategies',
  compile: 'compile_strategy_plan',
  apply: 'apply_strategy_plan',
  fork: 'fork_strategy',
  archive: 'archive_strategy',
  restore: 'restore_strategy',
  categories: 'list_strategy_categories',
} as const;

/** The four tools that require the strict outer envelope. */
const ENVELOPED = new Set<string>([TOOLS.compile, TOOLS.apply]);

export class McpStrategyAdapter implements StrategiesPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async listStrategies(params: { userId: string; accessToken: string }): Promise<StrategyListResult> {
    try {
      const payload = await this.call(params, TOOLS.list, { includeInactive: true });
      const raw = payload['strategies'];
      // Decided here, where the platform was actually read, rather than by a
      // surface counting what it was handed. The same condition the agent
      // adapter uses: no array, or an empty one.
      if (!Array.isArray(raw) || raw.length === 0) return { kind: 'empty' };
      return {
        kind: 'strategies',
        strategies: raw.map(mapStrategy),
        quota: mapQuota(payload['quota']),
      };
    } catch (err) {
      return unreadable(err);
    }
  }

  async compilePlan(params: {
    userId: string;
    accessToken: string;
    request: Readonly<Record<string, unknown>>;
  }): Promise<CompileResult> {
    try {
      const payload = await this.call(params, TOOLS.compile, params.request);
      const planToken = payload['planToken'];
      const approvedPlan = payload['approvedPlan'];
      if (typeof planToken !== 'string' || typeof approvedPlan !== 'object' || approvedPlan === null) {
        return { kind: 'rejected', reason: 'BattleGrid returned no usable plan for this request.' };
      }
      return {
        kind: 'compiled',
        approvedPlan: approvedPlan as Record<string, unknown>,
        reviewContext: optionalObject(payload['reviewContext']),
        planToken,
      };
    } catch (err) {
      // The compiler refusing a request is an ordinary outcome — a bad value, or
      // nothing to change. It is not a failure of the product.
      return { kind: 'rejected', reason: messageOf(err) };
    }
  }

  async applyPlan(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    plan: Readonly<Record<string, unknown>>;
    planToken: string;
    confirmationToken: string;
  }): Promise<Readonly<Record<string, unknown>>> {
    return this.call(
      params,
      TOOLS.apply,
      { plan: params.plan, planToken: params.planToken, confirm: true },
      { target: `strategy:${params.strategyId}`, confirmationToken: params.confirmationToken },
    );
  }

  async forkStrategy(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    sourceRevision: number;
  }): Promise<Strategy> {
    const payload = await this.call(params, TOOLS.fork, {
      strategyId: params.strategyId,
      sourceRevision: params.sourceRevision,
    });
    return mapStrategy(payload['strategy'] ?? payload);
  }

  async setActive(params: {
    userId: string;
    accessToken: string;
    strategyId: string;
    expectedRevision: number;
    active: boolean;
    confirmationToken?: string | undefined;
  }): Promise<LifecycleResult> {
    const payload = await this.call(
      params,
      params.active ? TOOLS.restore : TOOLS.archive,
      {
        strategyId: params.strategyId,
        // Both tools require it. This sent `{ strategyId }` alone, so every
        // archive and every restore was refused for a missing argument — which
        // nothing noticed, because no write had ever reached the real platform.
        expectedRevision: params.expectedRevision,
        // Only `archive_strategy` requires it: it is the destructive one of the
        // pair. Sent where it is declared and nowhere else, rather than to both
        // for symmetry — an argument a tool does not declare is one more thing
        // that can be rejected.
        ...(params.active ? {} : { confirm: true }),
      },
      { target: params.strategyId, confirmationToken: params.confirmationToken },
    );

    // Restoring can come back needing repair. The strategy stays inactive and
    // the way forward is the RESTORE arm of the compile pipeline — a distinct
    // outcome, not an error.
    const status = payload['status'] ?? payload['result'];
    if (status === 'REPAIR_REQUIRED') {
      return { kind: 'repair-required', reason: 'REPAIR_REQUIRED' };
    }

    return { kind: 'changed', strategy: mapStrategy(payload['strategy'] ?? payload) };
  }

  async readVocabulary(params: { userId: string; accessToken: string }): Promise<VocabularyResult> {
    try {
      const payload = await this.call(params, TOOLS.categories, {});
      const raw = payload['categories'];
      if (!Array.isArray(raw)) return malformed('no categories returned');
      return { kind: 'vocabulary', categories: raw.map(mapCategory) };
    } catch (err) {
      return unreadable(err);
    }
  }

  // -- internals ---------------------------------------------------------

  private async call(
    who: { userId: string; accessToken: string },
    tool: string,
    payload: Readonly<Record<string, unknown>>,
    extras: { target?: string | undefined; confirmationToken?: string | undefined } = {},
  ): Promise<Record<string, unknown>> {
    const result = await this.battlegrid.callTool({
      userId: who.userId,
      accessToken: who.accessToken,
      tool,
      // The envelope trap. `account` never goes inside `request`, and request
      // fields are never flattened beside it.
      args: ENVELOPED.has(tool) ? { request: payload } : payload,
      ...extras,
    });
    // Already the payload: the adapter unwrapped the MCP envelope. There was
    // an `asObject` here that returned `{}` for anything it did not recognise,
    // which is precisely how an unread envelope became "you have no agents".
    return result.content as Record<string, unknown>;
  }
}

export class StrategyPayloadError extends Error {
  constructor(field: string) {
    super(`BattleGrid returned a strategy with no usable "${field}"`);
  }
}

function mapStrategy(raw: unknown): Strategy {
  const s = (raw ?? {}) as Record<string, unknown>;

  // An id and a revision are not display fields. The id becomes `strategyId` on
  // a destructive apply and the revision becomes `expectedRevision` on a compile
  // and `sourceRevision` on a fork. Defaulting either would send a value nobody
  // read into an operation that reconfigures a fleet — the shape three earlier
  // production gates caught in three other layers. Refuse instead.
  const id = typeof s['id'] === 'string' && s['id'].length > 0 ? s['id'] : null;
  if (id === null) throw new StrategyPayloadError('id');

  const revision = typeof s['revision'] === 'number' ? s['revision'] : null;
  if (revision === null) throw new StrategyPayloadError('revision');

  return {
    id,
    name: String(s['name'] ?? '(unnamed)'),
    tagline: typeof s['tagline'] === 'string' ? s['tagline'] : null,
    description: typeof s['description'] === 'string' ? s['description'] : null,
    revision,
    scope: s['scope'] === 'SYSTEM' ? 'SYSTEM' : 'PRIVATE',
    // Display only — it never reaches a request, which composes its own.
    timeframe: typeof s['timeframe'] === 'string' ? s['timeframe'] : 'unknown',
    isActive: s['isActive'] !== false,
    // The platform's count. Deriving it by grouping agents would be a second
    // opinion, wrong whenever an agent moved between the two reads. See S-F.
    boundAgentCount: typeof s['boundAgentCount'] === 'number' ? s['boundAgentCount'] : 0,
    forkedFromStrategyId:
      typeof s['forkedFromStrategyId'] === 'string' ? s['forkedFromStrategyId'] : null,
  };
}

function mapQuota(raw: unknown): StrategyQuota | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const q = raw as Record<string, unknown>;
  const limit = q['limit'];
  // No limit, no capacity to report. Zeroes would read as "you have none left",
  // a specific claim nobody made — the defect three gates have now caught.
  if (typeof limit !== 'number') return null;
  const used = typeof q['used'] === 'number' ? q['used'] : 0;
  return {
    limit,
    used,
    remaining: typeof q['remaining'] === 'number' ? q['remaining'] : Math.max(0, limit - used),
  };
}

function mapCategory(raw: unknown): VocabularyCategory {
  const c = (raw ?? {}) as Record<string, unknown>;
  const category = String(c['category'] ?? '');
  return {
    category,
    label: String(c['label'] ?? category),
    purpose: String(c['purpose'] ?? ''),
    metricCount: typeof c['metricCount'] === 'number' ? c['metricCount'] : 0,
  };
}

/**
 * An optional nested object on a payload that was already read successfully.
 *
 * Empty is a truthful answer here, unlike for an envelope: `reviewContext`
 * carries advisory notes about a compiled plan, and a plan with none is
 * ordinary. This was called `asObject` and shared its name with the function
 * that silently turned an unread MCP envelope into "you have no agents" — the
 * name is different now so the two are never confused again.
 */
function optionalObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}
