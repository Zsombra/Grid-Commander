import { createHash } from 'node:crypto';

/**
 * A stable digest of a composed intent.
 *
 * Keys are sorted so that two structurally identical intents digest identically
 * regardless of how they were built — otherwise a re-render that reorders an
 * object would discard a perfectly good plan, or invalidate an agreement a user
 * had just given.
 *
 * **Lives in the domain because `confirmationTarget` needs it**, and a domain
 * rule may not import an application use case — `boundaries.test.ts` enforces
 * that direction. It was written inside `compile-plan.command.ts`, which was the
 * right home when the only thing that digested anything was the strategy compile
 * pipeline. Moving it is forced by the boundary, not preference.
 */
export function digestOf(value: unknown): string {
  return createHash('sha256').update(canonicalise(value)).digest('hex');
}

function canonicalise(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(',')}}`;
}
