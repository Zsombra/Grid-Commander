/**
 * The serialisation `probe_mcp_surface.py` digests the vocabulary with:
 * keys sorted, compact separators, unicode raw. `JSON.stringify` alone
 * neither sorts nor matches Python's defaults — this reproduces the exact
 * bytes so a digest mismatch means the content moved, never the formatting.
 *
 * Its own module on purpose. `live-writes.test.ts` attributes write-reach
 * per helper *module*, and `recorded-surface.ts` names a mutating tool in
 * code (to count that tool's schema fields in the record). Housing this
 * beside it marked every importer of a pure serialiser as able to write —
 * which would have put the freshness guard, whose whole design is to run on
 * a key alone, behind the write opt-in.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => JSON.stringify(k) + ':' + canonicalJson(v));
  return '{' + entries.join(',') + '}';
}
