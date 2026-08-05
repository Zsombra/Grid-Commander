/**
 * What a model proposed, against what will actually happen.
 *
 * This is the one place the whole change can go quietly wrong, so it is stated
 * carefully.
 *
 * A proposal stores **no snapshot of the world** — deliberately, because a
 * stored copy is stale by the time anyone reads it. So "the difference" here is
 * not a before-and-after diff against what the model saw. There is no such
 * record, and inventing one would be the exact staleness this design avoids.
 *
 * What can be compared is **the proposal against the target as it is now**, and
 * that has three honest outcomes per value:
 *
 * - `will-change` — the target holds something else, and agreeing changes it.
 * - `already-true` — the target already holds this. Agreeing does nothing here.
 * - `refused`      — the product or the platform will not take it.
 *
 * The page shows all three, side by side, and never merges them. A page that
 * silently dropped the `already-true` ones would report a smaller change than
 * was proposed; one that dropped the `refused` ones would report a larger one.
 * Both are the product agreeing on the operator's behalf.
 */

export type ValueDisposition =
  | {
      readonly key: string;
      readonly kind: 'will-change';
      readonly proposed: unknown;
      readonly current: unknown;
    }
  | { readonly key: string; readonly kind: 'already-true'; readonly proposed: unknown }
  | { readonly key: string; readonly kind: 'refused'; readonly proposed: unknown; readonly reason: string };

/**
 * Compared structurally, not by reference.
 *
 * A proposed `{smallPct: 30, mediumPct: 40}` equal in content to what the agent
 * holds must read as `already-true`, or every nested value would render as a
 * change and the operator would be asked to agree to nothing.
 */
function same(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(sortDeep(a)) === JSON.stringify(sortDeep(b));
}

/** Key order is not meaning; two objects differing only in it are the same value. */
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortDeep(v)]),
  );
}

export function reconcile(params: {
  /** What the model asked for. */
  readonly proposed: Readonly<Record<string, unknown>>;
  /** What the target holds right now, read fresh. */
  readonly current: Readonly<Record<string, unknown>>;
  /** What the product or platform will not accept, from the fresh describe. */
  readonly refused: readonly { readonly field: string; readonly reason: string }[];
}): readonly ValueDisposition[] {
  const refusedBy = new Map(params.refused.map((r) => [r.field, r.reason]));

  return Object.entries(params.proposed).map(([key, proposed]): ValueDisposition => {
    const reason = refusedBy.get(key);
    // Refusal wins over everything. A value the platform will not take is not
    // "already true" even when it happens to match — reporting it as settled
    // would tell an operator a rejected field is fine.
    if (reason !== undefined) return { key, kind: 'refused', proposed, reason };

    // A key the target does not carry at all is a change, not a match. `same`
    // would call `undefined === undefined` equal, which would silently hide a
    // value being introduced.
    if (key in params.current && same(proposed, params.current[key])) {
      return { key, kind: 'already-true', proposed };
    }
    return { key, kind: 'will-change', proposed, current: params.current[key] };
  });
}

/**
 * Whether agreeing would change anything at all.
 *
 * A proposal every part of which is already true or refused leaves the account
 * untouched, and the page must say so rather than offering a confirmation that
 * performs nothing. The operator agreeing to a no-op learns nothing and is
 * charged a decision for it.
 */
export function changesAnything(dispositions: readonly ValueDisposition[]): boolean {
  return dispositions.some((d) => d.kind === 'will-change');
}

/** True when the fresh read disagreed with the proposal in any way. */
export function departsFromProposal(dispositions: readonly ValueDisposition[]): boolean {
  return dispositions.some((d) => d.kind !== 'will-change');
}
