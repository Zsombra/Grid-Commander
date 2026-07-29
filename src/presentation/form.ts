import type { CompiledPlan } from '@/domain/strategy/compiled-plan.js';
import type { Behavior } from '@/domain/agent/brain.js';
import { isConviction, isOutlook, isRisk } from '@/domain/agent/brain.js';

/**
 * Reading a submitted form without inventing what it did not contain.
 *
 * A route is thin, but "thin" cannot mean coercing whatever arrived into the
 * shape the use case expects. `Number(formData.get('expectedRevision'))` gives 0
 * for an absent field and NaN for a malformed one, and sending either as an
 * optimistic-concurrency token is the same defect two production gates have
 * already caught in this project: a fabricated number standing in for one that
 * was never supplied.
 */

export class FormError extends Error {
  constructor(readonly field: string, message: string) {
    super(message);
  }
}

export function requiredText(form: FormData, field: string): string {
  const value = form.get(field);
  if (typeof value !== 'string' || value.length === 0) {
    throw new FormError(field, `${field} is required`);
  }
  return value;
}

export function optionalText(form: FormData, field: string): string | null {
  const value = form.get(field);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** An integer, or a refusal. Never a coercion, and never NaN. */
export function requiredInteger(form: FormData, field: string): number {
  const raw = form.get(field);
  if (typeof raw !== 'string') throw new FormError(field, `${field} is required`);
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new FormError(field, `${field} must be a whole number`);
  return value;
}

/**
 * The behavior profile, validated rather than cast.
 *
 * `String(form.get('risk')) as Risk` type-checks and asserts nothing — a form
 * posting `risk=NONSENSE` would sail through and reach BattleGrid. The domain
 * already has the guards; the route's job is to use them.
 */
export function behavior(form: FormData): Behavior {
  const risk = form.get('risk');
  const outlook = form.get('outlook');
  const conviction = form.get('conviction');

  if (!isRisk(risk)) throw new FormError('risk', 'Choose a risk tolerance.');
  if (!isOutlook(outlook)) throw new FormError('outlook', 'Choose a market outlook.');
  if (!isConviction(conviction)) throw new FormError('conviction', 'Choose a conviction level.');

  return { risk, outlook, conviction };
}

/**
 * The compiled plan a review carried back through its form.
 *
 * Parsed here rather than in the route, because `app/` may not import the
 * domain (W-D) and because this belongs beside the other field readers: it is
 * the same job — take an untyped form value and produce a typed one or refuse.
 *
 * It is not trusted. The confirmation issued for an apply is bound to
 * `strategy:<id>#<intentDigest>`, so a plan altered in transit digests
 * differently, the confirmation fails to consume, and the write is refused
 * before it reaches BattleGrid.
 */
export function compiledPlan(formData: FormData, name: string): CompiledPlan {
  const raw = requiredText(formData, name);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`"${name}" is not a compiled plan`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`"${name}" is not a compiled plan`);
  }
  const p = parsed as Record<string, unknown>;
  // Named rather than cast: the three fields the apply path actually reads.
  if (typeof p['planToken'] !== 'string' || typeof p['intentDigest'] !== 'string') {
    throw new Error(`"${name}" is missing the fields an apply needs`);
  }
  return parsed as CompiledPlan;
}

/**
 * The six money questions, read off the form.
 *
 * Every value stays `undefined` when the control was left empty, so
 * `buildTradingConfig` reports it as missing rather than silently receiving a
 * zero. `Number('')` is `0`, and a `maxDailyLossUsd` of 0 would be the most
 * expensive possible misreading of an empty box.
 */
export function moneyAnswers(formData: FormData): Record<string, unknown> {
  const mode = optionalText(formData, 'tradingMode');
  return {
    ...(mode ? { tradingMode: mode } : {}),
    ...money(formData, 'minAllocationUsd'),
    ...money(formData, 'balanceThresholdUsd'),
    ...money(formData, 'maxConcurrentExposureUsd'),
    ...money(formData, 'maxCumulativeDrawdownUsd'),
    ...money(formData, 'maxDailyLossUsd'),
  };
}

function money(formData: FormData, name: string): Record<string, number> {
  const raw = optionalText(formData, name);
  if (!raw) return {};
  const value = Number(raw);
  return Number.isFinite(value) ? { [name]: value } : {};
}
