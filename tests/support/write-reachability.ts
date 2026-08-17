import { readdirSync, readFileSync } from 'node:fs';

/**
 * Can this code reach a BattleGrid write? — derived, in one place.
 *
 * Two architecture guards ask that question: `mcp-read-only.test.ts` of the
 * tools a model may call, and `live-writes.test.ts` of the probes a key in
 * the environment lets run. Both used to answer it separately —
 * `live-writes` by matching the *spelling* `*Command` in probe source, which
 * is exactly the check-the-spelling defect shape this repository keeps
 * finding in itself. The recorder was the honest case that broke it:
 * `CaptureSignalsCommand` writes only to this product's own store, and the
 * spelling rule would have demanded a write opt-in for a probe that cannot
 * write.
 *
 * So the derivation lives here, once, and both guards read it:
 *
 *   1. mutating tool names come from `docs/battlegrid-mcp-surface.json`,
 *      which records the *server's own* annotations;
 *   2. the adapters say which port method sends each tool;
 *   3. `composition.ts` says which file implements each use-case class;
 *   4. code that calls one of those port methods can mutate — and a class
 *      this derivation cannot resolve is treated as mutating, because
 *      unfindable must never mean safe.
 */

interface Surface {
  tools: Array<{ name: string; classification: string }>;
}

/** Step 1 — what BattleGrid says changes things. Never inferred from a name. */
export function mutatingToolNames(): Set<string> {
  return new Set(
    (JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as Surface).tools
      .filter((t) => t.classification !== 'read')
      .map((t) => t.name),
  );
}

/**
 * Step 2 — the port methods that send one.
 *
 * Adapters name tools through a local `TOOLS` alias map, so the alias is
 * resolved to the tool string first and the method is attributed to whichever
 * `async name(` most recently opened above the reference.
 *
 * Two shapes name a tool without dispatching it, and both are excluded on
 * **syntax**, not by tool name: a compared reference (`t.name === TOOLS.x` —
 * how `deploymentTimeframes` and `readCatalog` read a write tool's *schema*)
 * and a collected one (`new Set([TOOLS.compile, …])` deciding response
 * handling). An exclusion list of tool names is the thing this module exists
 * not to be.
 */
export function mutatingPortMethods(mutatingTools: Set<string>): Set<string> {
  const methods = new Set<string>();
  const dir = 'src/infrastructure/battlegrid';
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(`${dir}/${file}`, 'utf8');

    const alias = new Map<string, string>();
    for (const m of src.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*):\s*'([a-z_]+)',/gm)) {
      alias.set(m[1] as string, m[2] as string);
    }

    let current: string | null = null;
    for (const line of src.split('\n')) {
      const opened = /^\s{2}(?:async\s+)?([a-zA-Z][a-zA-Z0-9]*)\s*\(/.exec(line);
      if (opened) current = opened[1] as string;
      if (!current) continue;

      const names =
        [...alias.entries()].some(
          ([a, tool]) => mutatingTools.has(tool) && new RegExp(`TOOLS\\.${a}\\b`).test(line),
        ) || [...mutatingTools].some((tool) => line.includes(`'${tool}'`));
      if (!names) continue;

      const compared = /[=!]==/.test(line);
      const collected = /new Set\(/.test(line);
      if (compared || collected) continue;

      methods.add(current);
    }
  }
  return methods;
}

export interface UseCaseWiring {
  /** app() key → implementing file, e.g. `updateAgent` → its use-case file. */
  readonly byKey: Map<string, string>;
  /** Imported class name → implementing file, every use-case import. */
  readonly byClass: Map<string, string>;
}

/** Step 3 — what composition.ts wires, read from its own imports and body. */
export function useCaseWiring(composition: string): UseCaseWiring {
  const byClass = new Map<string, string>();
  for (const m of composition.matchAll(
    /import\s+\{([^}]+)\}\s+from\s+'\.\/(application\/use-cases\/[^']+)\.js'/g,
  )) {
    const file = `src/${m[2] as string}.ts`;
    for (const name of (m[1] as string).split(',')) byClass.set(name.trim(), file);
  }

  const byKey = new Map<string, string>();
  const body = composition.slice(composition.indexOf('export function app('));
  for (const m of body.matchAll(/^\s{4}([a-zA-Z][a-zA-Z0-9]*):\s*(?:\n\s*)?new\s+([A-Za-z]+)\(/gm)) {
    const file = byClass.get(m[2] as string);
    if (file) byKey.set(m[1] as string, file);
  }
  return { byKey, byClass };
}

/** Step 4 — the mutating port methods this file's code calls, if any. */
export function canMutate(file: string, methods: Set<string>): string[] {
  const src = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  return [...methods].filter((m) => new RegExp(`\\.${m}\\s*\\(`).test(src));
}

/**
 * The composed answer for a class name found in source: the mutating port
 * methods its use-case file reaches, or `null` for a class this derivation
 * does not know — which callers MUST treat as able to write. Unfindable is
 * not safe; it is unchecked.
 */
export function classWriteReach(composition: string): (className: string) => string[] | null {
  const { byClass } = useCaseWiring(composition);
  const methods = mutatingPortMethods(mutatingToolNames());
  const memo = new Map<string, string[]>();
  return (className: string): string[] | null => {
    const file = byClass.get(className);
    if (file === undefined) return null;
    const cached = memo.get(className);
    if (cached !== undefined) return cached;
    const reach = canMutate(file, methods);
    memo.set(className, reach);
    return reach;
  };
}
