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

/**
 * One coercion for the edit intent, used by both requests that form it.
 *
 * The edit is two requests, and they read their values from two places: the
 * review reads a query string, the apply reads a `FormData`. Each had its own
 * coercion — the review kept `"25"`, the apply produced `25` — and that was
 * invisible while nothing compared them.
 *
 * It stops being invisible the moment the confirmation is bound to the values:
 * `"25"` and `25` digest differently, so **every honest edit would have been
 * refused**, which is the one way that change could be wrong while every new
 * test passed (DL-5). Found by comparing the two coercions before writing the
 * binding, not by running it.
 *
 * So there is one function, and both paths call it. A number where the text
 * parses as one, the text otherwise — the platform wants numbers, and a value it
 * will reject should reach it as what the user typed rather than as `NaN`.
 */
/**
 * The six BattleGrid declines to default.
 *
 * Written down rather than read from the catalog because this is an *input*
 * filter: it decides which submitted parameters are trusted enough to forward
 * into a proposal, and that decision must not widen because a catalog response
 * changed. It lives beside `editIntent` because the two are one rule — the
 * fields to read, and how to read them. The form that renders the fields still asks the catalog, so one the
 * platform starts defaulting stops being shown while staying forwardable —
 * which is the safe direction for the two to disagree in.
 */
export const MONEY_FIELDS = [
  'tradingMode',
  'maxDailyLossUsd',
  'maxCumulativeDrawdownUsd',
  'maxConcurrentExposureUsd',
  'balanceThresholdUsd',
  'minAllocationUsd',
] as const;

export function editIntent(
  source: { get(name: string): string | null | undefined },
  fields: { readonly name: readonly string[]; readonly money: readonly string[] },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields.name) {
    const raw = source.get(field);
    if (typeof raw === 'string' && raw !== '') out[field] = raw;
  }
  const config: Record<string, unknown> = {};
  for (const field of fields.money) {
    const raw = source.get(field);
    if (typeof raw !== 'string' || raw === '') continue;
    const value = Number(raw);
    config[field] = raw.trim() !== '' && Number.isFinite(value) ? value : raw;
  }
  // Absent, not empty. An empty `tradingConfig` is a different intent from no
  // configuration change at all, and the digest must tell them apart.
  return Object.keys(config).length > 0 ? { ...out, tradingConfig: config } : out;
}
