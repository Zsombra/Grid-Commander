import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOOLS, READ_ONLY_NOTICE } from '@/mcp/tools.js';

/**
 * The MCP surface changes nothing, and this is what makes that true.
 *
 * The safety argument for exposing this product to a language model rests
 * entirely on the absence of writes. Every write in this product goes
 * through describe → confirm → perform, with a token digest-bound to the
 * values it was formed against — a design that assumes **a human reads the
 * consequence before agreeing**. Over MCP a model occupies that seat, and
 * nothing in the protocol compels it to show the operator "this will
 * archive Apex and stop three deployments" before calling perform.
 *
 * So: no writes, until an approval channel exists. A comment saying so
 * decays. This does not.
 *
 * Both halves are **derived** — the mutating use-cases are read out of
 * `composition.ts`, not listed here. An allowlist would pass while the
 * next write was added, which is the failure mode every guard in this
 * directory carries a note about.
 */

const composition = readFileSync('src/composition.ts', 'utf8');

/**
 * Every key on `app`, taken from the composition root itself.
 *
 * Reading the source rather than importing `App` because a type has no
 * runtime presence to enumerate, and the point is to catch a use-case that
 * exists rather than one someone remembered to declare.
 */
function useCaseKeys(): string[] {
  const body = composition.slice(composition.indexOf('export function app('));
  return [...body.matchAll(/^\s{4}([a-zA-Z][a-zA-Z0-9]*):\s/gm)].map((m) => m[1] as string);
}

/**
 * A use-case that changes something, by the name it was given.
 *
 * `describe*` counts as mutating: a describe mints a confirmation token,
 * which is the first half of a write and the half a model would use to
 * manufacture consent for the second.
 */
const MUTATING = /^(describe|perform|create|update|set|retune|apply|fork|compile|start|complete|disconnect|rebind)/;

describe('the MCP surface cannot change anything', () => {
  const keys = useCaseKeys();
  const mutating = keys.filter((k) => MUTATING.test(k));

  it('found the real use-case table', () => {
    // Empty would pass every check below vacuously.
    expect(keys.length).toBeGreaterThan(30);
    expect(keys).toContain('listAgents');
    expect(keys).toContain('readPipeline');
  });

  it('found the writes it is guarding against', () => {
    // If this ever goes empty the regex has drifted and the guard is inert.
    expect(mutating.length).toBeGreaterThan(8);
    expect(mutating).toContain('applyPlan');
    expect(mutating).toContain('setLifecycle');
    expect(mutating).toContain('describeArchive');
  });

  it('exposes no tool that reaches a mutating use-case', () => {
    const offenders = TOOLS.filter((t) => MUTATING.test(t.useCase)).map(
      (t) => `${t.name} → ${t.useCase}`,
    );
    expect(
      offenders,
      'a model must not be able to spend the operator’s money through this server',
    ).toEqual([]);
  });

  it('names a use-case that actually exists, for every tool', () => {
    const unknown = TOOLS.filter((t) => !keys.includes(t.useCase)).map((t) => t.name);
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
    // A model asked to archive an agent should learn where that happens
    // rather than trying seventeen tool names.
    expect(READ_ONLY_NOTICE).toMatch(/read-only/i);
    expect(READ_ONLY_NOTICE).toMatch(/web app/i);
  });

  it('reaches no port directly', () => {
    // The whole argument for this surface is that the use-cases already
    // are the data frame. A tool touching a port would be a second
    // implementation of the derivations and refusals beneath it.
    for (const file of ['src/mcp/tools.ts', 'src/mcp/server.ts']) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/@\/ports\//);
    }
  });

  it('has unique tool names', () => {
    const names = TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('describes every tool it offers', () => {
    // The description is what a model reasons over. A thin one is a tool
    // that will be called wrongly or not at all.
    for (const t of TOOLS) {
      expect(t.description.length, t.name).toBeGreaterThan(60);
    }
  });
});
