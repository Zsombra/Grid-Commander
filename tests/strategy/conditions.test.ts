import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildingBlocks,
  directionalCalls,
  hasUnrecognisedPart,
  unresolvedReferences,
} from '@/domain/strategy/condition.js';
import type { StrategyCondition } from '@/domain/strategy/condition.js';
import { mapConditions, mapDefinition } from '@/infrastructure/battlegrid/condition-mapper.js';

/**
 * The condition layer, read from the platform's own payload.
 *
 * The fixture below is **Berlin's real `FULL_SEND_DOWN`**, copied from
 * `get_strategy` on 2026-08-04, not invented. It is the hardest shape the
 * account actually holds: a threshold group mixing references, a nested
 * negation, and plain clauses. If a change flattens nesting or loses the
 * negation, this is where it fails — and the consequence of losing it is that
 * the page reads "flow must be rising" for a rule that says the opposite.
 */

const BERLIN_FULL_SEND_DOWN = {
  conditionKey: 'FULL_SEND_DOWN',
  name: 'Full send — down',
  verdict: 'DOWN',
  definition: {
    kind: 'group',
    op: 'N_OF',
    n: 3,
    members: [
      { kind: 'conditionRef', conditionKey: 'REGIME_DOWN' },
      { kind: 'conditionRef', conditionKey: 'WINDOW_OPEN' },
      { kind: 'group', op: 'NOT', members: [{ kind: 'conditionRef', conditionKey: 'FLOW_UP' }] },
      {
        kind: 'clause',
        column: { sectionKey: 'includeHigherTimeframe', header: 'MAalign_htf' },
        op: 'is',
        label: 'bearish',
      },
      {
        kind: 'clause',
        column: { sectionKey: 'includeOpenInterest', header: 'oiRegime' },
        op: 'is',
        label: 'new shorts',
      },
      {
        kind: 'clause',
        column: { sectionKey: 'includeCvd', header: 'CVD_trend' },
        op: 'is',
        label: 'falling',
      },
    ],
  },
};

const REGIME_DOWN = {
  conditionKey: 'REGIME_DOWN',
  name: 'Regime trending down',
  verdict: null,
  definition: {
    kind: 'clause',
    column: { sectionKey: 'includeRegimeContext', header: 'regTrend_now' },
    op: 'is',
    label: 'trending down',
  },
};

describe('the platform payload becomes the domain shape', () => {
  it('reads Berlin’s threshold group without flattening it', () => {
    const [c] = mapConditions([BERLIN_FULL_SEND_DOWN]);
    expect(c?.conditionKey).toBe('FULL_SEND_DOWN');
    expect(c?.verdict).toBe('DOWN');
    const d = c?.definition;
    expect(d?.kind).toBe('group');
    if (d?.kind !== 'group') throw new Error('unreachable');
    expect(d.op).toBe('N_OF');
    expect(d.n).toBe(3);
    expect(d.members).toHaveLength(6);
  });

  it('keeps the negation as a negation', () => {
    const [c] = mapConditions([BERLIN_FULL_SEND_DOWN]);
    const d = c?.definition;
    if (d?.kind !== 'group') throw new Error('unreachable');
    const not = d.members.find((m) => m.kind === 'group' && m.op === 'NOT');
    expect(not, 'the NOT survives the mapping').toBeDefined();
    if (not?.kind !== 'group') throw new Error('unreachable');
    // The whole point: FLOW_UP is inside a NOT, not a sibling requirement.
    expect(not.members).toHaveLength(1);
    expect(not.members[0]).toEqual({ kind: 'ref', conditionKey: 'FLOW_UP' });
    expect(d.members).not.toContainEqual({ kind: 'ref', conditionKey: 'FLOW_UP' });
  });

  it('reads every clause form the platform actually uses', () => {
    const col = { sectionKey: 'includeRsi', header: 'RSI14_now' };
    expect(mapDefinition({ kind: 'clause', column: col, op: 'gt', value: 50 })).toEqual({
      kind: 'compare',
      column: { sectionKey: 'includeRsi', header: 'RSI14_now' },
      op: 'gt',
      value: 50,
    });
    expect(mapDefinition({ kind: 'clause', column: col, op: 'between', low: 1, high: 9 })).toEqual({
      kind: 'between',
      column: { sectionKey: 'includeRsi', header: 'RSI14_now' },
      low: 1,
      high: 9,
    });
    expect(mapDefinition({ kind: 'clause', column: col, op: 'is', label: 'rising' })).toEqual({
      kind: 'is',
      column: { sectionKey: 'includeRsi', header: 'RSI14_now' },
      label: 'rising',
    });
    expect(
      mapDefinition({ kind: 'clause', column: col, op: 'in', labels: ['trending', 'extreme'] }),
    ).toEqual({
      kind: 'in',
      column: { sectionKey: 'includeRsi', header: 'RSI14_now' },
      labels: ['trending', 'extreme'],
    });
  });

  it('carries a column with no owning section rather than inventing one', () => {
    const d = mapDefinition({
      kind: 'clause',
      column: { sectionKey: null, header: 'CLOSE' },
      op: 'gt',
      value: 1,
    });
    if (d.kind !== 'compare') throw new Error('unreachable');
    expect(d.column.sectionKey).toBeNull();
  });

  it('reports a form it does not model instead of dropping or guessing', () => {
    const d = mapDefinition({ kind: 'group', op: 'XOR', members: [] });
    expect(d.kind).toBe('unrecognised');
    if (d.kind !== 'unrecognised') throw new Error('unreachable');
    // The reason is read by a person on the strategy page, so it names the
    // operator rather than saying "invalid".
    expect(d.reason).toContain('XOR');
  });

  it('does not follow a payload that nests into itself forever', () => {
    // The platform's schema does not forbid a cycle, and a recursive read of
    // one would not return.
    let deep: Record<string, unknown> = { kind: 'clause', column: { header: 'X' }, op: 'gt', value: 1 };
    for (let i = 0; i < 50; i++) deep = { kind: 'group', op: 'ALL', members: [deep] };
    expect(() => mapDefinition(deep)).not.toThrow();
    expect(JSON.stringify(mapDefinition(deep))).toContain('unrecognised');
  });

  it('drops a condition with no key, because a reference could never name it', () => {
    expect(mapConditions([{ name: 'nameless', definition: {}, verdict: 'UP' }])).toEqual([]);
  });

  it('treats an unknown verdict as a building block, never as a direction', () => {
    const [c] = mapConditions([{ ...REGIME_DOWN, verdict: 'SIDEWAYS' }]);
    // Understating a strategy is recoverable. Telling an operator it calls a
    // direction it does not is not.
    expect(c?.verdict).toBeNull();
  });

  it('reads NEITHER as the directional call it is', () => {
    const [c] = mapConditions([{ ...REGIME_DOWN, verdict: 'NEITHER' }]);
    expect(c?.verdict).toBe('NEITHER');
    expect(directionalCalls([c as StrategyCondition])).toHaveLength(1);
  });
});

describe('calls and building blocks are counted apart', () => {
  const conditions = mapConditions([BERLIN_FULL_SEND_DOWN, REGIME_DOWN]);

  it('counts only the conditions that decide direction', () => {
    expect(directionalCalls(conditions).map((c) => c.conditionKey)).toEqual(['FULL_SEND_DOWN']);
    expect(buildingBlocks(conditions).map((c) => c.conditionKey)).toEqual(['REGIME_DOWN']);
  });

  it('surfaces a reference to a condition the strategy does not define', () => {
    // Berlin defines WINDOW_OPEN and FLOW_UP; this fixture carries only
    // REGIME_DOWN, so the other two are dangling and must be named.
    expect(unresolvedReferences(conditions)).toEqual(['FLOW_UP', 'WINDOW_OPEN']);
  });

  it('finds an unrecognised part however deeply it is buried', () => {
    const [c] = mapConditions([
      {
        conditionKey: 'MIXED',
        name: 'Mixed',
        verdict: 'UP',
        definition: {
          kind: 'group',
          op: 'ALL',
          members: [
            { kind: 'conditionRef', conditionKey: 'A' },
            { kind: 'group', op: 'ANY', members: [{ kind: 'somethingNew' }] },
          ],
        },
      },
    ]);
    expect(hasUnrecognisedPart(c!.definition)).toBe(true);
  });
});

describe('this product never decides whether a condition holds', () => {
  it('exposes nothing that evaluates one', () => {
    /**
     * Derived, not a spot check. Any export that took a condition and answered
     * true/false would be this product forming a second opinion about market
     * data it does not hold — the `get_agent_performance` defect wearing new
     * clothes. The domain may classify a condition (call vs block) and walk it
     * (references, unrecognised parts); it may not resolve one.
     */
    const surface = { buildingBlocks, directionalCalls, hasUnrecognisedPart, unresolvedReferences };
    for (const [name, fn] of Object.entries(surface)) {
      const src = fn.toString();
      expect(src, `${name} reads no column value`).not.toMatch(/\boperand\b|\bliteral\b/);
      expect(src, `${name} decides no outcome`).not.toMatch(/['"](TRUE|FALSE)['"]/);
    }
  });

  it('has no mapper path that invents an outcome', () => {
    const src = readFileSync('src/infrastructure/battlegrid/condition-mapper.ts', 'utf8');
    expect(src).not.toMatch(/['"](TRUE|FALSE)['"]/);
    expect(src, 'outcomes are not read here at all').not.toContain('conditionOutcomes');
  });
});
