import type { DiscoveredTool } from '@/domain/capability/tool-class.js';

/**
 * The values a discovered tool's own schema permits at one argument path.
 *
 * `RadarPort.deploymentTimeframes` and `MarketPort.rankingVocabulary` each walk
 * their own schema by hand, and can: their fields sit at the top level of a
 * plain object. `brain.preset` does not — it lives inside one branch of a
 * discriminated union — so the walk here is the general one, and is deliberately
 * the same walk `tools/probe_mcp_surface.py` performs to build the
 * `input_constants` that `wire-values.test.ts` checks payloads against. Two
 * walks that disagree about what a schema permits would let a value pass one and
 * fail the other, which is worse than having only the strict one.
 *
 * Three properties are carried over from it, each for a reason the dump shows:
 *
 * - **Union branches contribute to the same path.** `brain.kind` is
 *   `const: "PRESET"` on one branch and `const: "CUSTOM"` on the other; a walk
 *   that took the first branch would report half the declaration.
 * - **Local `$ref`s are followed.** The 2026-08-06 dump carries 370 of them —
 *   zod's dedup output. A walk that stops at a ref records nothing where one
 *   stands, and BattleGrid re-emits these schemas on every deployment: the brain
 *   branches are inline today and a dedup that moved them behind a ref would
 *   otherwise empty this list silently.
 * - **A ref chain that re-enters itself ends.** Recursive schemas exist in this
 *   surface, and a walk without this does not return.
 *
 * Empty when the declaration cannot answer — no such tool, no schema, no such
 * path, nothing pinned there. Callers treat that as *not declared*, never as
 * *there are none*.
 */
export function declaredValues(tool: DiscoveredTool | undefined, path: string): readonly string[] {
  const root = tool?.inputSchema;
  if (root === undefined) return [];
  const found: string[] = [];
  walk(root, root, '', path, found, new Set());
  return found;
}

function walk(
  node: unknown,
  root: Record<string, unknown>,
  at: string,
  want: string,
  out: string[],
  active: ReadonlySet<string>,
): void {
  const here = resolve(node, root, active);
  if (here === null) return;
  const { schema, seen } = here;

  if (at === want) {
    collect(schema['enum'], out);
    if ('const' in schema) collect([schema['const']], out);
  }

  const properties = schema['properties'];
  if (typeof properties === 'object' && properties !== null) {
    for (const [key, child] of Object.entries(properties as Record<string, unknown>)) {
      const next = at === '' ? key : `${at}.${key}`;
      // Descend only where the wanted path is still reachable. The alternative —
      // collecting every path like the probe does and then indexing — walks
      // 110 schemas' worth of subtree to answer one question.
      if (leadsTo(next, want)) walk(child, root, next, want, out, seen);
    }
  }

  const items = schema['items'];
  if (typeof items === 'object' && items !== null) {
    const next = `${at}[]`;
    if (leadsTo(next, want)) walk(items, root, next, want, out, seen);
  }

  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branches = schema[key];
    if (!Array.isArray(branches)) continue;
    for (const branch of branches) walk(branch, root, at, want, out, seen);
  }
}

const leadsTo = (path: string, want: string): boolean =>
  want === path || want.startsWith(`${path}.`) || want.startsWith(`${path}[`);

/**
 * Strings only, in declaration order, without repeats.
 *
 * A union whose branches pin the same field twice would otherwise report it
 * twice. Non-strings are dropped rather than stringified — `signalTimeoutMinutes`
 * is an enum of numbers, and a caller offering "5" where the platform expects 5
 * is the class of defect this whole file exists to remove.
 */
function collect(values: unknown, out: string[]): void {
  if (!Array.isArray(values)) return;
  for (const value of values) {
    if (typeof value === 'string' && !out.includes(value)) out.push(value);
  }
}

/**
 * Follow a chain of local `$ref` pointers to the node they name.
 *
 * `active` is the set of pointers already being expanded on this path. Meeting
 * one again means the schema recurses through itself, and the branch ends —
 * the same guard the probe applies, for the same schemas.
 */
function resolve(
  node: unknown,
  root: Record<string, unknown>,
  active: ReadonlySet<string>,
): { schema: Record<string, unknown>; seen: ReadonlySet<string> } | null {
  let current = node;
  let seen = active;
  while (isObject(current) && typeof current['$ref'] === 'string') {
    const pointer = current['$ref'];
    // Only local pointers. A remote `$ref` is a fetch, and this walk reads what
    // the session already discovered rather than reaching for more.
    if (!pointer.startsWith('#/') || seen.has(pointer)) return null;
    seen = new Set([...seen, pointer]);
    current = jump(root, pointer);
  }
  return isObject(current) ? { schema: current, seen } : null;
}

/** The node a local JSON pointer names, or undefined. */
function jump(root: Record<string, unknown>, pointer: string): unknown {
  let node: unknown = root;
  for (const raw of pointer.slice(2).split('/')) {
    const part = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (Array.isArray(node)) {
      const index = Number(part);
      node = Number.isInteger(index) ? node[index] : undefined;
    } else if (isObject(node)) {
      node = node[part];
    } else {
      return undefined;
    }
    if (node === undefined) return undefined;
  }
  return node;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
