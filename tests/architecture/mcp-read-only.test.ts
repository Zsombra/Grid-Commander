import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOOLS, READ_ONLY_NOTICE } from '@/mcp/tools.js';
import {
  canMutate,
  mutatingPortMethods,
  mutatingToolNames,
  useCaseWiring,
} from '../support/write-reachability.js';

/**
 * The MCP surface changes nothing on the operator's BattleGrid account, and
 * this is what makes that true.
 *
 * The safety argument for exposing this product to a language model rests
 * entirely on the absence of writes. Every write goes through describe →
 * confirm → perform with a token digest-bound to the values it was formed
 * against — a design that assumes **a human reads the consequence before
 * agreeing**. Over MCP a model occupies that seat, and nothing in the protocol
 * compels it to show the operator "this will archive Apex and stop three
 * deployments" before calling perform.
 *
 * ## Why this was rewritten
 *
 * The first version derived mutating use-cases from a **name prefix**:
 * `/^(describe|perform|create|update|…)/`. That was correct while no tool
 * touched any of them, and it has two failures that only appear now.
 *
 * It is **too loose**: a tool named `stopTrading` wired to `updateAgent` never
 * matches the prefix and sails through, while being exactly the thing this
 * file exists to stop. A guard you can defeat by choosing a name is a naming
 * convention, not a guard.
 *
 * It is also **too tight** for where this product is going.
 * `the-model-can-propose-and-only-a-human-agrees` records a proposal in this
 * product's own store, contacting BattleGrid not at all. The prefix rule would
 * forbid that on the strength of the word "record" appearing nowhere in it —
 * the wrong question asked of the wrong thing.
 *
 * So the question became **reachability**: can this use-case reach a tool
 * BattleGrid itself classifies as mutating? Derived end to end —
 *
 *   1. mutating tool names come from `docs/battlegrid-mcp-surface.json`,
 *      which records the *server's own* annotations;
 *   2. the adapters say which port method sends each tool;
 *   3. `composition.ts` says which file implements each use-case;
 *   4. a use-case that calls one of those port methods can mutate.
 *
 * Nothing in that chain is a list maintained by hand, which matters because
 * the sibling guard `live-writes.test.ts` shipped the same day matching tool
 * *names in test source* — and missed `apply-probe.test.ts` entirely, because
 * that file mutates through `ForkStrategyCommand` without naming a tool.
 * Derive from what code can reach, not from what it happens to spell.
 */

const composition = readFileSync('src/composition.ts', 'utf8');

/**
 * The four derivation steps live in `tests/support/write-reachability.ts`
 * now, because `live-writes.test.ts` needs the same answer — the recorder's
 * probe constructs a Command that provably cannot write, and the spelling
 * rule over there could only handle that by exemption. One derivation, two
 * guards; the regression knowledge moved with the code.
 */
const MUTATING_TOOLS = mutatingToolNames();

const PORT_METHODS = mutatingPortMethods(MUTATING_TOOLS);
const FILES = useCaseWiring(composition).byKey;

describe('the MCP surface cannot change anything on the account', () => {
  it('derived a real chain, at every link', () => {
    // Each of these going empty would make every assertion below vacuous, and
    // a vacuous safety guard is worse than none — it reports a property it is
    // not checking.
    expect(MUTATING_TOOLS.size, 'the surface record classifies mutating tools').toBeGreaterThan(20);
    expect(PORT_METHODS.size, 'adapters send some of them').toBeGreaterThan(8);
    expect(FILES.size, 'use-cases resolve to files').toBeGreaterThan(30);
    // Spot-check the chain end to end on a write everyone knows.
    expect(PORT_METHODS).toContain('updateAgent');
    expect(FILES.get('updateAgent')).toBe('src/application/use-cases/update-agent.command.ts');
  });

  it('does not mistake naming a tool for sending one', () => {
    /**
     * The named regression. `deploymentTimeframes` reads
     * `upsert_radar_deployment`'s *schema* to discover accepted timeframes —
     * `tools.find((t) => t.name === TOOLS.upsert)`. The first draft counted
     * that reference and made a read method mutating.
     *
     * Pinned by name because the fix is a syntactic exclusion, and a later
     * change to how adapters dispatch could silently reintroduce it.
     */
    expect(
      PORT_METHODS.has('deploymentTimeframes'),
      'comparing against a tool name is not sending it',
    ).toBe(false);
    /**
     * The second one, added 2026-08-06. `readCatalog` now resolves the brain
     * presets from the *schema* of `create_intelligence_agent`, which the server
     * classifies as a write — so a mutating tool is named inside the read that
     * builds the create form. The exclusion that saves it is the same syntactic
     * one: the reference is a comparison. Pinned so that rewriting the lookup
     * into a shape that is not a comparison fails here, loudly, rather than
     * making a read look like a write everywhere downstream.
     */
    expect(
      PORT_METHODS.has('readCatalog'),
      'reading a write tool’s schema is not calling it',
    ).toBe(false);
    // And the counterweight: the method that really does send it is still caught.
    expect(PORT_METHODS).toContain('upsertDeployment');
    expect(PORT_METHODS).toContain('createAgent');
  });

  it('found the writes it is guarding against', () => {
    const mutating = [...FILES].filter(([, f]) => canMutate(f, PORT_METHODS).length > 0);
    expect(mutating.length, 'some use-cases can reach a write').toBeGreaterThan(5);
    const keys = mutating.map(([k]) => k);
    expect(keys).toContain('updateAgent');
    expect(keys).toContain('applyPlan');
  });

  it('resolves every tool to a file it can actually check', () => {
    /**
     * The check below can only inspect a use-case it located. Skipping an
     * unresolvable one — which the first draft did, with a bare `continue` —
     * means a tool could pass by being unfindable rather than by being safe.
     * That is the same silent-skip this repository has now been bitten by
     * twice, so it fails here instead.
     */
    const unresolved = TOOLS.filter((t) => !FILES.has(t.useCase)).map(
      (t) => `${t.name} → ${t.useCase}`,
    );
    expect(
      unresolved,
      'a tool whose use-case cannot be located is unchecked, not proven safe',
    ).toEqual([]);
  });

  it('exposes no tool that can reach a BattleGrid write', () => {
    const offenders: string[] = [];
    for (const t of TOOLS) {
      const file = FILES.get(t.useCase);
      // Absence is a failure of the test above, not a pass here.
      if (!file) continue;
      const reached = canMutate(file, PORT_METHODS);
      if (reached.length > 0) offenders.push(`${t.name} → ${t.useCase} → ${reached.join(', ')}`);
    }
    expect(
      offenders,
      'a model must not be able to spend the operator’s money through this server',
    ).toEqual([]);
  });

  it('is stricter than the name-prefix rule it replaced', () => {
    /**
     * The counterweight, and the reason the rewrite was worth doing.
     *
     * `stopTrading` matches none of `describe|perform|create|update|…`, so the
     * old rule would have admitted it. It calls `updateAgent`, so this one
     * cannot. Asserted against the real derivation rather than a mock, so it
     * fails if the chain ever stops resolving.
     */
    const OLD = /^(describe|perform|create|update|set|retune|apply|fork|compile|start|complete|disconnect|rebind)/;
    const innocent = 'stopTrading';
    expect(OLD.test(innocent), 'the old rule would have let this through').toBe(false);

    const reached = canMutate('src/application/use-cases/update-agent.command.ts', PORT_METHODS);
    expect(reached.length, 'the new rule catches it by what it reaches').toBeGreaterThan(0);
  });

  it('names a use-case that actually exists, for every tool', () => {
    const known = new Set(
      [...composition
        .slice(composition.indexOf('export function app('))
        .matchAll(/^\s{4}([a-zA-Z][a-zA-Z0-9]*):\s/gm)].map((m) => m[1] as string),
    );
    const unknown = TOOLS.filter((t) => !known.has(t.useCase)).map((t) => t.name);
    expect(unknown, 'a tool naming a use-case that is gone would fail only when called').toEqual(
      [],
    );
  });

  it('declares every tool read-only to the client', () => {
    const source = readFileSync('src/mcp/server.ts', 'utf8');
    expect(source).toMatch(/readOnlyHint: true/);
    expect(source).toMatch(/destructiveHint: false/);
  });

  it('tells a model where changes are actually made', () => {
    expect(READ_ONLY_NOTICE).toMatch(/read-only/i);
    expect(READ_ONLY_NOTICE).toMatch(/web app/i);
  });

  it('reaches no port directly', () => {
    // The whole argument for this surface is that the use-cases already are
    // the data frame. A tool touching a port would be a second implementation
    // of the derivations and refusals beneath it — and would also route around
    // the reachability check above, since that reads use-case files.
    for (const file of ['src/mcp/tools.ts', 'src/mcp/server.ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/@\/ports\//);
    }
  });

  it('has unique tool names', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('describes every tool it offers', () => {
    for (const t of TOOLS) {
      expect(t.description.length, t.name).toBeGreaterThan(60);
    }
  });
});
