import type { DraftStanding } from '@/domain/strategy/condition-draft.js';
import { composeForResolution, serialiseCondition } from '@/domain/strategy/condition-draft.js';
import type { ConditionVerdict, StrategyCondition } from '@/domain/strategy/condition.js';
import type { Strategy } from '@/domain/strategy/strategy.js';
import type { CoinSelection, ReportPreviewOutcome, StrategiesPort } from '@/ports/strategies.js';
import type { FailureCause } from '@/ports/failure.js';

/**
 * What a condition would do, before it exists.
 *
 * `PreviewCompositionQuery` asks the platform to resolve the conditions a
 * strategy *has*. This asks it to resolve one it does not — composed by an
 * operator, sent alongside the strategy's own so that a reference has something
 * to resolve against, and thrown away afterwards.
 *
 * **Nothing here writes.** The only platform call is `preview_strategy_report`,
 * annotated `readOnlyHint: true` and `destructiveHint: false`, which is the same
 * call the preview surface already makes. There is no compile and no apply in
 * this path, and `tests/strategy/structure.test.ts` asserts that no caller holds
 * both — this one holds neither.
 *
 * The strategy is read fresh on every attempt. A draft is composed against the
 * conditions the platform holds *now*, and a stale copy would resolve a `ref`
 * against a condition that has since changed — an answer about a strategy that
 * no longer exists, presented as an answer about this one.
 */

/**
 * Where the draft's definition comes from.
 *
 * Two arms because there are two honest sources and they cannot be merged. A
 * composed definition is the operator's, built row by row and limited to one
 * level of grouping. A seeded one is the strategy's own, at whatever depth it
 * has — the only way to ask a question about a condition too deeply nested for
 * the composer to build, which is exactly the condition worth asking about.
 *
 * The identity is the operator's either way: seeding takes the definition and
 * nothing else, so `?from=FLOW_UP` under a new key and a new verdict is a real
 * question rather than a re-read of what the strategy already holds.
 */
export type DraftSource =
  | { readonly kind: 'composed'; readonly condition: StrategyCondition }
  | {
      readonly kind: 'from-existing';
      readonly sourceKey: string;
      /** Null falls back to the source condition's own. */
      readonly conditionKey: string | null;
      readonly name: string | null;
      readonly verdict: ConditionVerdict;
    };

export interface TryConditionRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly strategyId: string;
  readonly coinSelection: CoinSelection;
  /**
   * What to try, or `null` for the blank composer.
   *
   * Null is a real state rather than a missing argument: opening the surface
   * with nothing drafted still needs the strategy read, because the composer is
   * built against what the strategy already defines.
   */
  readonly draft: DraftSource | null;
}

interface Composing {
  readonly strategy: Strategy;
  /** The strategy's own conditions, mapped — what the composer composes against. */
  readonly existing: readonly StrategyCondition[];
}

export type TryConditionResult =
  | ({ readonly kind: 'composing' } & Composing)
  | ({
      readonly kind: 'tried';
      readonly draft: StrategyCondition;
      /** Whether the draft joined the strategy's conditions or displaced one. */
      readonly standing: DraftStanding;
      /** How many of the strategy's own conditions were sent with it. */
      readonly alongside: number;
      readonly outcome: ReportPreviewOutcome;
    } & Composing)
  /**
   * The draft carries a form this product cannot write back.
   *
   * Its own result, not an error and not a platform refusal: nothing was sent,
   * and the reason is ours rather than BattleGrid's. Collapsing it into
   * `refused` would put this product's words in the platform's mouth — the
   * inverse of the mistake `A Refused Column Teaches In The Platform's Words`
   * exists to prevent.
   */
  | ({
      readonly kind: 'inexpressible';
      readonly draft: StrategyCondition;
      readonly reasons: readonly string[];
    } & Composing)
  /**
   * The draft was to be seeded from a condition the strategy does not carry.
   *
   * Its own case rather than a blank composer, for the same reason `missing`
   * and `unreadable` are separate one layer down: a stale link and a fresh
   * start look identical as an empty form, and the operator who followed the
   * link is entitled to know which they got.
   */
  | ({ readonly kind: 'no-such-condition'; readonly sourceKey: string } & Composing)
  | { readonly kind: 'strategy-missing' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class TryConditionQuery {
  constructor(private readonly strategies: StrategiesPort) {}

  async execute(req: TryConditionRequest): Promise<TryConditionResult> {
    const read = await this.strategies.readStrategy(req);
    if (read.kind === 'missing') return { kind: 'strategy-missing' };
    // The adapter classified this with the error in hand; carrying its verdict
    // is the whole point of `FailureCause`, and re-deriving one here would be a
    // second, worse copy of a judgement already made.
    if (read.kind === 'unreadable') {
      return { kind: 'unreadable', reason: read.reason, cause: read.cause };
    }

    const { detail } = read;
    const composing: Composing = { strategy: detail.summary, existing: detail.conditions };
    if (req.draft === null) return { kind: 'composing', ...composing };

    const wanted = req.draft;
    let draft: StrategyCondition;
    if (wanted.kind === 'composed') {
      draft = wanted.condition;
    } else {
      const source = detail.conditions.find((c) => c.conditionKey === wanted.sourceKey);
      if (!source) {
        return { kind: 'no-such-condition', sourceKey: wanted.sourceKey, ...composing };
      }
      draft = {
        // The definition whole, at whatever depth it has. The identity is the
        // operator's — that is what makes this a question rather than a re-read.
        definition: source.definition,
        conditionKey: wanted.conditionKey ?? source.conditionKey,
        name: wanted.name ?? source.name,
        verdict: wanted.verdict,
        // Carried from the source for the same reason the definition is: the
        // operator asked to retarget a condition, not to change whether it
        // must hold.
        required: source.required,
      };
    }

    const serialised = serialiseCondition(draft);
    if (serialised.kind === 'inexpressible') {
      return { kind: 'inexpressible', draft, reasons: serialised.reasons, ...composing };
    }

    // The strategy's own conditions go as the platform sent them — never
    // re-serialised out of `detail.conditions`, which would drop any form the
    // mapper read as `unrecognised`. Only the draft passes through the
    // serialiser, because only the draft has no platform object of its own.
    const composed = composeForResolution(read.conditionsAsGiven, serialised.condition);

    try {
      const outcome = await this.strategies.previewReport({
        userId: req.userId,
        accessToken: req.accessToken,
        timeframe: detail.summary.timeframe,
        sections: detail.sections,
        coinSelection: req.coinSelection,
        conditions: composed.conditions,
      });
      return {
        kind: 'tried',
        draft,
        standing: composed.standing,
        alongside: composed.alongside,
        outcome,
        ...composing,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // A throw out of the port is no usable answer, whatever caused it — the
      // same reading `PreviewCompositionQuery` and `CheckColumnQuery` take.
      // Calling it a refusal would send an operator to fix a draft that is fine.
      return { kind: 'unreadable', reason, cause: 'unreachable' };
    }
  }
}
