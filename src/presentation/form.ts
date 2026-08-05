import type { CompiledPlan } from '@/domain/strategy/compiled-plan.js';
import { compileUpdateIntent } from '@/domain/strategy/compiled-plan.js';

/**
 * The compile UPDATE request, for the route layer (which may not import the
 * domain — W-D). One re-export, same reasoning as `presetPosition`.
 */
export const updateCompileIntent = compileUpdateIntent;
import type { Behavior } from '@/domain/agent/brain.js';
import { isConviction, isOutlook, isRisk } from '@/domain/agent/brain.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import {
  POSITION_MANAGEMENT_FIELDS,
  positionFieldKind,
  positionManagementForPreset,
} from '@/domain/agent/trading-config.js';

/**
 * The catalog's own values for a named preset, for the route layer — which
 * may not import the domain (W-D) and so reaches the one rule it needs
 * through here, exactly as it reaches `editIntent`. Null when the catalog
 * cannot answer, and the caller refuses rather than substituting.
 */
export function presetPosition(
  catalog: Catalog,
  preset: string,
): Readonly<Record<string, unknown>> | null {
  return positionManagementForPreset(catalog, preset);
}

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

/**
 * The position-management object, off its `pm.*` transport fields.
 *
 * One typed coercion for both requests that read it — the review (query
 * string) and the apply (FormData) — because the confirmation is bound to a
 * digest of the values, and two coercions that disagree about `"3"` versus
 * `3` refuse every honest edit (DL-5, applied before it can bite here).
 *
 * All-or-nothing: absent entirely means "no position change" and returns
 * null; present but missing a field is a malformed submission and refuses.
 * A partial object must never reach the platform — `positionManagement` is
 * replaced wholesale, so an omission is a silent reset.
 */
const PM_KEYS = ['positionManagementPreset', ...POSITION_MANAGEMENT_FIELDS] as const;

export function positionFromTransport(
  source: { get(name: string): string | null | undefined },
): Record<string, unknown> | null {
  const raw = new Map<string, string>();
  for (const key of PM_KEYS) {
    const value = source.get(`pm.${key}`);
    if (typeof value === 'string' && value !== '') raw.set(key, value);
  }
  if (raw.size === 0) return null;

  const out: Record<string, unknown> = {};
  for (const key of PM_KEYS) {
    const value = raw.get(key);
    const kind = positionFieldKind(key);
    if (kind === 'boolean') {
      // A checkbox submits nothing when unchecked; the confirm form writes
      // 'true'/'false' explicitly. Both spellings land here, and 'false' —
      // like absence — is false.
      out[key] = value === 'true' || value === 'on';
      continue;
    }
    if (value === undefined) {
      throw new FormError(`pm.${key}`, `position management arrived without "${key}"`);
    }
    if (kind === 'text') {
      out[key] = value;
      continue;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new FormError(`pm.${key}`, `"${key}" must be a number`);
    }
    out[key] = parsed;
  }
  return out;
}

/**
 * One composed intent, split into the two arguments `UpdateAgentCommand` takes.
 *
 * `tradingConfig` cannot travel inside `changes`. It is the platform's one
 * partial-is-destructive field: every one of its twenty members is required
 * once the object is present, and a send that omits nineteen does not error —
 * it resets them to BattleGrid's defaults. `UpdateAgentCommand` guards that by
 * merging `tradingConfigChanges` onto the agent's current config, checking the
 * merge is complete and validating it against the catalog. A caller that puts
 * the object in `changes` instead walks straight past all three.
 *
 * Shared rather than written twice because it already was. The edit form split
 * it inline; `/pending/[id]` did not, so a model proposing `tradingMode: OFF`
 * would, on agreement, have cleared every loss cap the agent ran under. Found
 * by walking the live loop — the proposal the whole change exists to serve is
 * the one that triggered it.
 *
 * The digest is unaffected: `confirmationTarget.agentEdit` sorts keys, so
 * `{tradingConfig: X}` and `{...rest, tradingConfig: X}` bind identically —
 * which is what lets the split happen after the token was minted.
 */
export function editArguments(intent: Readonly<Record<string, unknown>>): {
  readonly changes: Readonly<Record<string, unknown>>;
  readonly tradingConfigChanges: Readonly<Record<string, unknown>> | undefined;
} {
  const { tradingConfig, ...changes } = intent;
  return {
    changes,
    // Absent, not empty — `editIntent` is careful about that distinction and
    // discarding it here would undo it.
    tradingConfigChanges:
      typeof tradingConfig === 'object' && tradingConfig !== null
        ? (tradingConfig as Readonly<Record<string, unknown>>)
        : undefined,
  };
}

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
