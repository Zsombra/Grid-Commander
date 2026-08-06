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

  it('states no count of things the platform owns', () => {
    /**
     * A tool description is a **static string served to a language model**,
     * which will repeat it to an operator with the tool's own authority — while
     * the tool itself returns the live list.
     *
     * Two of them counted, and both went wrong without anything failing:
     * "All 82 signals a strategy rule can reference" and "The 75 metrics a
     * report column can be built from". Counted live against v9.0.0 on
     * 2026-08-06 by sweeping every category: **84 and 84**. True when written,
     * false since, and nothing checks a sentence.
     *
     * This repository's loudest lesson is that BattleGrid's tool count never
     * moves while everything under it does — four deployments, 110 tools every
     * time, and a section of the surface map called "The count is not the
     * check". Then we wrote counts of our own into what we serve.
     *
     * The list is the count.
     *
     * It caught a third the moment it ran: `simulate_aggregate` said "At most
     * 20 signals" while its own input schema already declared `maxItems: 20`.
     * Two copies of one number, and a client reads the schema. **A limit
     * belongs in the schema; a description says what happens when you exceed
     * it** — which for that tool is "refused rather than truncated", the part
     * the schema cannot express and the only part worth writing.
     */
    const COUNTED = /\b\d+\s+(signals?|metrics?|tools?|modules?|families|categories|strategies|agents)\b/i;
    const offenders = TOOLS.filter((t) => COUNTED.test(t.description)).map(
      (t) => `${t.name}: "${COUNTED.exec(t.description)?.[0]}"`,
    );
    expect(
      offenders,
      'a description that counts is true the day it is written and silently wrong after',
    ).toEqual([]);
  });
});
