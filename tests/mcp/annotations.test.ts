import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOOLS } from '@/mcp/tools.js';

/**
 * A tool's annotations must describe what it does.
 *
 * `readOnlyHint: true` was set on every tool without exception, and the comment
 * beside it said so proudly. It stopped being true the moment
 * `propose_agent_change` shipped: recording a proposal writes a row to this
 * product's own store. Nothing reaches BattleGrid — that claim survives — but
 * `readOnlyHint` means "does not modify its environment", and a client using it
 * to decide what needs the operator's approval would have been reading a false
 * one.
 *
 * Being wrong in the safe direction is still being wrong, and it is the fifth
 * defect of this exact shape in this repository: a check, or a claim, that
 * matched how something was *spelled* rather than what it *reached*.
 */

const composition = readFileSync('src/composition.ts', 'utf8');

/**
 * Whether the use-case behind a tool is a write, according to the composition
 * root rather than according to the tool table.
 *
 * `Command` is this codebase's own word for the write side of a use-case, and
 * `Query` for the read side — the same derivation `live-writes.test.ts` uses to
 * decide which probes need the opt-in. Reading it out of `composition.ts` means
 * a tool cannot declare itself a read by omission: the wiring is what answers.
 */
function isCommand(useCase: string): boolean {
  const wiring = new RegExp(`\\b${useCase}:\\s*new\\s+(\\w+)`).exec(composition);
  expect(wiring, `${useCase} is wired in composition.ts`).toBeTruthy();
  return /Command$/.test(wiring?.[1] ?? '');
}

describe('what a client is told each tool does', () => {
  it('has tools to check', () => {
    // Empty would pass everything below vacuously.
    expect(TOOLS.length).toBeGreaterThan(10);
  });

  it('declares `writes` for exactly the tools whose use-case is a Command', () => {
    const offenders = TOOLS.filter((t) => isCommand(t.useCase) !== (t.writes === true)).map(
      (t) => `${t.name} → ${t.useCase}: writes=${String(t.writes === true)}`,
    );
    expect(
      offenders,
      'a tool that reaches a Command persists something and must say so; one that reaches a ' +
        'Query must not claim to',
    ).toEqual([]);
  });

  it('serves the declaration rather than a constant', () => {
    /**
     * The table declaring `writes` buys nothing if the handler ignores it.
     * What a *client* receives is asserted in `server.test.ts`, over a real
     * transport; this is the cheaper half — that the annotation is a function
     * of the tool at all, which is what the old `readOnlyHint: true` literal
     * was not.
     */
    const source = readFileSync('src/mcp/server.ts', 'utf8');
    expect(source, 'annotations are computed per tool').toContain('annotationsFor(t)');
    expect(source, 'and read off the declaration').toMatch(/readOnlyHint:\s*tool\.writes/);
  });
});
