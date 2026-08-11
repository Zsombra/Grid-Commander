import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * What the product sends, against what BattleGrid says it requires.
 *
 * The envelope defect made the case for this file. Every read returned an empty
 * object for the life of the product, through four production gates and 561
 * tests, because the one seam nothing modelled was the one that was wrong. The
 * fakes and the mappers agreed with each other and both disagreed with the
 * platform.
 *
 * `docs/battlegrid-mcp-surface.json` is a probe of the live server:
 * `inputSchema.required` and `outputSchema.properties` for all 110 tools, plus
 * the observed response shape for the 21 read tools callable with no arguments.
 * Across those 21, declared and observed agreed **exactly** — so the declared
 * schema is trustworthy enough to check the other 89 against without calling
 * them, which matters because 27 of them change things.
 *
 * This runs offline against that artifact. Re-probe with
 * `BATTLEGRID_API_KEY=… python3 tools/probe_mcp_surface.py` when the platform
 * deploys; the server says its own list goes stale, and a check against a stale
 * artifact is a check against fiction.
 */

interface Surface {
  tools: Array<{
    name: string;
    classification: string;
    input_required: string[];
    declared_output: string[];
  }>;
}

const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as Surface;
const byName = new Map(surface.tools.map((t) => [t.name, t]));

const AGENTS = readFileSync('src/infrastructure/battlegrid/agent-adapter.ts', 'utf8');
const STRATEGIES = readFileSync('src/infrastructure/battlegrid/strategy-adapter.ts', 'utf8');

/**
 * The arguments actually passed to `this.call(…)`, and nothing else.
 *
 * Narrowed twice, both times after a mutation slipped past.
 *
 * A **file-level** scan reported `confirm` as present for `archive_strategy`,
 * because `applyPlan` sends `confirm: true` two methods away.
 *
 * A **method-level** scan then reported `expectedRevision` as present after it
 * had been deleted from the call — because the method's own parameter type
 * declares `expectedRevision: number`. Every required argument that shares a
 * name with a parameter would have passed regardless of whether it was sent,
 * which is most of them.
 *
 * So this starts at `this.call(` and reads to the end of the method. A type
 * signature cannot reach in there.
 */
function argsAt(source: string, method: string): string {
  const start = source.indexOf(`async ${method}(`);
  if (start < 0) throw new Error(`no method ${method}`);
  const end = source.indexOf('\n  async ', start + 1);
  const body = source.slice(start, end < 0 ? undefined : end);

  const invocation = body.indexOf('this.call(');
  if (invocation < 0) throw new Error(`${method} never calls this.call()`);
  return body.slice(invocation);
}

const sends = (block: string, key: string): boolean =>
  new RegExp(`[{,\\s]${key}\\s*:`).test(block);

/** Every tool the product calls, with the method that builds its arguments. */
const CALL_SITES: Array<{ tool: string; source: string; method: string }> = [
  { tool: 'list_intelligence_agents', source: AGENTS, method: 'listAgents' },
  { tool: 'get_intelligence_agent', source: AGENTS, method: 'getAgent' },
  { tool: 'create_intelligence_agent', source: AGENTS, method: 'createAgent' },
  { tool: 'update_intelligence_agent', source: AGENTS, method: 'updateAgent' },
  { tool: 'rebind_intelligence_agent', source: AGENTS, method: 'rebindAgent' },
  { tool: 'get_agent_journal', source: AGENTS, method: 'readJournal' },
  { tool: 'list_strategies', source: STRATEGIES, method: 'listStrategies' },
  // compile_strategy_plan and apply_strategy_plan are omitted deliberately.
  // Their single required argument, `request`, is not built at the call site:
  // the private `call()` helper wraps the whole payload as `{ request }` for
  // the tools in ENVELOPED. Asserting on the call site would have reported
  // both as broken, which they are not — checked below instead.
  { tool: 'fork_strategy', source: STRATEGIES, method: 'forkStrategy' },
  { tool: 'list_strategy_categories', source: STRATEGIES, method: 'readVocabulary' },
  // Both built by setActive(), and both currently incomplete — see
  // `strategy-lifecycle-cannot-succeed`. Listed rather than omitted: a
  // conformance check that skips the calls it found broken is decoration.
  { tool: 'archive_strategy', source: STRATEGIES, method: 'setActive' },
  { tool: 'restore_strategy', source: STRATEGIES, method: 'setActive' },
  { tool: 'archive_intelligence_agent', source: AGENTS, method: 'setLifecycle' },
  { tool: 'activate_intelligence_agent', source: AGENTS, method: 'setLifecycle' },
];

describe('the product sends what BattleGrid requires', () => {
  it('has a live surface to check against', () => {
    // A vacuous pass here would be the same failure one level up.
    expect(surface.tools.length).toBeGreaterThan(100);
    expect(byName.get('list_intelligence_agents')?.input_required).toBeDefined();
  });

  for (const { tool, source, method } of CALL_SITES) {
    it(`${tool} — every required argument is built`, () => {
      const declared = byName.get(tool);
      expect(declared, `${tool} is not in the probed surface`).toBeDefined();

      const block = argsAt(source, method);
      const missing = (declared?.input_required ?? []).filter((k) => !sends(block, k));

      expect(missing, `${method}() never sends these, so the call cannot succeed`).toEqual([]);
    });
  }
});

describe('the enveloped tools are wrapped, not built', () => {
  /**
   * `compile_strategy_plan`, `apply_strategy_plan` and
   * `update_strategy_signal_rule` each require exactly one argument,
   * `request`, and no method constructs it — the private `call()` helper
   * wraps the payload for the tools in `ENVELOPED`. So the thing to check
   * is that the set still contains them, not that the key appears at the
   * call site. Getting this wrong in the checker reported two working calls
   * as broken, which is how a guard earns its way into being ignored.
   */
  it('requires exactly the one argument the wrapper supplies', () => {
    for (const tool of ['compile_strategy_plan', 'apply_strategy_plan', 'update_strategy_signal_rule']) {
      expect(byName.get(tool)?.input_required, tool).toEqual(['request']);
    }
  });

  it('still wraps all of them', () => {
    expect(STRATEGIES).toMatch(
      /ENVELOPED\s*=\s*new Set<string>\(\[TOOLS\.compile, TOOLS\.apply, TOOLS\.updateRule\]\)/,
    );
    expect(STRATEGIES).toMatch(/ENVELOPED\.has\(tool\) \? \{ request: payload \}/);
  });

  it('wraps every tool it calls that needs wrapping', () => {
    /**
     * Four tools take a bare `request` envelope: the pair above plus
     * `update_strategy_signal_rule` (called since the-scorecard-is-tunable)
     * and `get_strategy_section_template` (still uncalled). The first version
     * of this assertion claimed only two existed and failed on the truth — a
     * checker asserting a fact about the platform it had not looked up.
     *
     * The invariant that matters is narrower and survives: any enveloped tool
     * the product *calls* must be in `ENVELOPED`. Adding a call to either of the
     * unused two without adding it to the set is a validation error on every
     * request, and this is what would say so.
     */
    const needsWrapping = surface.tools
      .filter((t) => t.input_required.length === 1 && t.input_required[0] === 'request')
      .map((t) => t.name);
    expect(needsWrapping.length).toBeGreaterThanOrEqual(4);

    // `TOOLS = { compile: 'compile_strategy_plan', … }` → alias by tool name.
    const alias = new Map(
      [...STRATEGIES.matchAll(/(\w+):\s*'([a-z_]+)'/g)].map((m) => [m[2] as string, m[1] as string]),
    );
    const enveloped = new Set(
      [...(STRATEGIES.match(/ENVELOPED = new Set<string>\(\[([^\]]*)\]\)/)?.[1] ?? '').matchAll(
        /TOOLS\.(\w+)/g,
      )].map((m) => m[1] as string),
    );

    const called = needsWrapping.filter((name) => (AGENTS + STRATEGIES).includes(`'${name}'`));
    const unwrapped = called.filter((name) => !enveloped.has(alias.get(name) ?? ''));

    // Three since the-scorecard-is-tunable took up update_strategy_signal_rule
    // — the moment the comment above anticipated.
    expect(called, 'the product should still be calling the three it wraps').toHaveLength(3);
    expect(unwrapped, 'these are called but never wrapped as { request }').toEqual([]);
  });
});

describe('the product reads fields the tool actually returns', () => {
  const READS: Array<{ tool: string; field: string }> = [
    { tool: 'fork_strategy', field: 'strategy' },
    { tool: 'create_intelligence_agent', field: 'agent' },
    { tool: 'update_intelligence_agent', field: 'agent' },
    { tool: 'rebind_intelligence_agent', field: 'agent' },
    { tool: 'archive_intelligence_agent', field: 'agent' },
    { tool: 'activate_intelligence_agent', field: 'agent' },
    { tool: 'compile_strategy_plan', field: 'planToken' },
    { tool: 'compile_strategy_plan', field: 'approvedPlan' },
    { tool: 'compile_strategy_plan', field: 'reviewContext' },
    { tool: 'list_intelligence_agents', field: 'agents' },
    { tool: 'list_intelligence_agents', field: 'slotUsage' },
    { tool: 'list_strategies', field: 'strategies' },
    { tool: 'get_open_orders', field: 'orders' },
    { tool: 'get_agents_hub', field: 'summary' },
  ];

  for (const { tool, field } of READS) {
    it(`${tool} declares "${field}"`, () => {
      expect(byName.get(tool)?.declared_output).toContain(field);
    });
  }
});

describe('the product does not read fields no tool returns', () => {
  it('archive_strategy and restore_strategy declare no status or result', () => {
    // `setActive` branches on `payload['status'] ?? payload['result']` to detect
    // REPAIR_REQUIRED. Neither tool declares either key, so that branch cannot
    // fire — a lifecycle outcome the product claims to handle and cannot detect.
    // Recorded here rather than silently corrected: whether REPAIR_REQUIRED
    // arrives some other way is a question for the platform, not a guess to
    // encode. See `strategy-lifecycle-cannot-succeed`.
    for (const tool of ['archive_strategy', 'restore_strategy']) {
      const declared = byName.get(tool)?.declared_output ?? [];
      expect(declared).not.toContain('status');
      expect(declared).not.toContain('result');
    }
  });
});

/**
 * The value the probe writes when a tool carries no annotation.
 *
 * Named rather than written inline, so the proof at the bottom can assert this
 * is a word `tools/probe_mcp_surface.py` can actually emit. Compared against a
 * value the producer never writes, the rule below is a question nothing can
 * answer yes to — and it would stay green forever.
 */
const UNCLASSIFIED = 'unclassified';

describe('classification comes from the server, and the product agrees', () => {
  it('treats every tool the server calls destructive as destructive', () => {
    // The product never hardcodes a classification — it reads annotations at
    // runtime. This asserts the surface still contains them to read.
    const destructive = surface.tools.filter((t) => t.classification === 'destructive');
    expect(destructive.length).toBeGreaterThan(0);
    expect(destructive.map((t) => t.name)).toContain('apply_strategy_plan');
  });

  it('leaves nothing unclassified', () => {
    // An unannotated tool is treated as destructive by the guard. That is the
    // safe reading, but it would silently gate off working capability, so it is
    // worth knowing the moment it appears.
    expect(surface.tools.filter((t) => t.classification === UNCLASSIFIED)).toEqual([]);
  });
});

/**
 * The checkers, fed the shapes they exist to catch.
 *
 * Audited 2026-08-10 by mutation (GitHub #87). `sends()` replaced with
 * `() => true` left this file **green across all thirteen conformance checks**
 * while asserting nothing whatsoever.
 *
 * That is the permissive failure, and it is the one a corpus floor cannot see.
 * These rules are shaped as *nothing required is missing*, so `missing` is empty
 * both when every argument is built and when the matcher has stopped being able
 * to tell. The surface-length floor at the top of the file stays satisfied
 * throughout, because counting the tools on the surface says nothing about
 * whether the call sites were read.
 *
 * So each checker below is given an input it must accept and one it must reject.
 *
 *   node tools/mutate-guard.mjs tests/architecture/mcp-conformance.test.ts \
 *     'new RegExp(`[{,\\s]${key}\\s*:`).test(block)' 'true'
 */
describe('the checkers catch what they were written for', () => {
  it('sees an argument that is built at the call site', () => {
    expect(sends("this.call('t', { agentId: id, expectedRevision: rev })", 'agentId')).toBe(true);
    expect(sends("this.call('t', { agentId: id, expectedRevision: rev })", 'expectedRevision')).toBe(true);
    // Leading brace and leading comma both count as a key position.
    expect(sends('{ strategyId: s }', 'strategyId')).toBe(true);
  });

  it('does not see one that is absent', () => {
    // Without this the rule is satisfied by a `sends` that returns true for
    // everything — which is exactly how it was found, green and asserting
    // nothing across thirteen checks.
    expect(sends("this.call('t', { agentId: id })", 'expectedRevision')).toBe(false);
    // A name that merely appears is not a name that is sent. `expectedRevision`
    // read off an input is not `expectedRevision:` built into the payload.
    expect(sends('const v = input.expectedRevision;', 'expectedRevision')).toBe(false);
  });

  it('reads the call, not the type signature above it', () => {
    /**
     * The miss this file's own comment records. A method whose *parameter type*
     * declares `expectedRevision: number` satisfied the check even after the
     * argument had been deleted from the call — and most required arguments
     * share a name with a parameter, so most of the file was affected.
     */
    const source = [
      "  async updateAgent(input: { expectedRevision: number; agentId: string }): Promise<void> {",
      "    return this.call('update_intelligence_agent', { agentId: input.agentId });",
      '  }',
      '',
      '  async somethingElse(): Promise<void> {',
      "    return this.call('other', { expectedRevision: 1 });",
      '  }',
    ].join('\n');

    const block = argsAt(source, 'updateAgent');
    expect(sends(block, 'agentId'), 'the argument the call builds').toBe(true);
    expect(sends(block, 'expectedRevision'), 'declared in the signature, not sent').toBe(false);
  });

  it('refuses a method it cannot find rather than reporting it clean', () => {
    // Returning '' here would make every required argument look missing, which
    // is loud; returning the whole file would make every one look present,
    // which is not. It throws instead.
    expect(() => argsAt('async other() { this.call("t", {}) }', 'absent')).toThrow(/no method/);
    expect(() => argsAt('async lonely() { return 1; }', 'lonely')).toThrow(/never calls/);
  });

  it('has a classification to compare against, so the unclassified rule can fire', () => {
    /**
     * `leaves nothing unclassified` matches nothing today — there are no
     * unclassified tools — so the literal it compares against could be anything
     * at all and the check would stay green. A rule with nothing to find cannot
     * be proven by what it finds, only by showing the field it reads is real.
     */
    const values = new Set(surface.tools.map((t) => t.classification));
    expect(values.size, 'every tool carries the same classification — the field is not being read').toBeGreaterThan(1);
    expect([...values]).toContain('read');
    expect([...values]).toContain('destructive');
    expect(surface.tools.filter((t) => t.classification === 'read').length).toBeGreaterThan(50);

    // And the word the rule asks about is one the producer can write. Without
    // this, changing the literal to anything the probe never emits leaves the
    // rule green while asking a question with no possible yes — which is what
    // the mutation run found, and the reason this assertion exists.
    const probe = readFileSync('tools/probe_mcp_surface.py', 'utf8');
    expect(probe, 'the guard and the probe must mean the same word').toContain(`"${UNCLASSIFIED}"`);
  });
});
