import { describe, expect, it } from 'vitest';
import { AgentRoster } from '@/presentation/components/agent-roster.js';
import type { AgentDeployment } from '@/domain/agent/deployment.js';
import type { DeploymentSummaryResult } from '@/application/use-cases/read-deployments.query.js';
import { anAgent } from '../support/agent-fakes.js';
import { rendered } from './support/render.js';

/**
 * DT-0011's 2026-08-15 revision (#274) — the two treatments the eight new
 * states earned, structurally.
 *
 * Structural like DT-0022/0027's tests: a class name is a string on a prop,
 * so its presence is checkable here and what it looks like is not.
 * `render.ts` collects no attributes on purpose, which is why the walker
 * below is local to this file.
 *
 * The copy claims ride on the shared harness: the wording is pinned as
 * strings by `tests/agent/radar-resolution.test.ts` (through the derived
 * `resolutionNote`) and by `standing.test.ts` on the page — this file only
 * asserts the dress.
 */

const AGENT = anAgent({ id: 'a1' });

const holding: AgentDeployment = {
  coinTicker: 'TRUMP',
  timeframe: '1h',
  standing: 'holding-position',
  occupancy: 'active-agent-present',
  resolution: null,
};

const scanningBlocked: AgentDeployment = {
  coinTicker: 'WIF',
  timeframe: '1h',
  standing: 'on-duty',
  occupancy: 'active-agent-present',
  resolution: {
    qualified: false,
    qualificationBlock: 'AGGREGATE_BELOW_MIN',
    section: 'SCANNING',
    cooldownUntil: null,
    cooldownActive: null,
    regime: 'bear_ranging',
    regimeConviction: 'medium',
  },
};

const unrecognised: AgentDeployment = {
  coinTicker: 'HYPE',
  timeframe: '1h',
  standing: 'on-duty',
  occupancy: 'active-agent-present',
  resolution: {
    qualified: null,
    qualificationBlock: null,
    section: 'BLOCKED',
    cooldownUntil: null,
    cooldownActive: null,
    regime: null,
    regimeConviction: null,
  },
};

function roster(deployments: readonly AgentDeployment[]) {
  const summary: DeploymentSummaryResult = {
    kind: 'summary',
    byAgent: { [AGENT.id]: deployments },
  };
  return AgentRoster({
    roster: { kind: 'agents', agents: [AGENT], slots: null },
    creation: { kind: 'unknown' },
    deployments: summary,
  });
}

interface Reactish {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}

const isReactish = (n: unknown): n is Reactish =>
  typeof n === 'object' && n !== null && 'type' in n && 'props' in n;

/** Text under a node, joined bare — enough to identify an element. */
function textUnder(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textUnder).join('');
  if (isReactish(node)) {
    if (typeof node.type === 'function') {
      return textUnder((node.type as (p: unknown) => unknown)(node.props ?? {}));
    }
    return textUnder(node.props?.['children']);
  }
  return '';
}

/** Every element of an intrinsic type, function components expanded. */
function elementsOf(node: unknown, tag: string, out: Reactish[] = []): Reactish[] {
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) elementsOf(child, tag, out);
    return out;
  }
  if (!isReactish(node)) return out;
  if (typeof node.type === 'function') {
    elementsOf((node.type as (p: unknown) => unknown)(node.props ?? {}), tag, out);
    return out;
  }
  if (node.type === tag) out.push(node);
  elementsOf(node.props?.['children'], tag, out);
  return out;
}

describe('the standing with money behind it takes weight', () => {
  it('weights holding-position and only holding-position', () => {
    const tree = roster([holding, scanningBlocked]);
    const standings = elementsOf(tree, 'span').filter((s) =>
      /^(Holding the position|Scanning|Holds the|In the rotation)/.test(textUnder(s)),
    );
    const weight = (s: Reactish): string => String(s.props?.['className'] ?? '');
    // The separator wrapper shares its text with the standing span it wraps,
    // so the claim is quantified: some span carrying the holding sentence is
    // weighted, and none carrying the scanning sentence is.
    const held = standings.filter((s) => textUnder(s) === 'Holding the position on TRUMP (1h)');
    const scanning = standings.filter((s) => textUnder(s) === 'Scanning WIF (1h)');
    expect(held.length, 'the holding-position standing renders').toBeGreaterThan(0);
    expect(held.some((s) => weight(s).includes('font-medium'))).toBe(true);
    expect(scanning.length, 'the on-duty standing renders').toBeGreaterThan(0);
    expect(scanning.some((s) => weight(s).includes('font-medium'))).toBe(false);
  });

  it('leaves the wording of the standing line byte-identical', async () => {
    const r = await rendered(roster([holding, scanningBlocked]));
    expect(r.text).toContain('Holding the position on TRUMP (1h)');
    expect(r.text).toContain('Scanning WIF (1h)');
  });
});

describe('quoted platform identifiers wear mono', () => {
  it('dresses the qualification block token and nothing else in the sentence', () => {
    const tree = roster([scanningBlocked]);
    const codes = elementsOf(tree, 'code');
    expect(codes).toHaveLength(1);
    expect(textUnder(codes[0])).toBe('AGGREGATE_BELOW_MIN');
    expect(String(codes[0]?.props?.['className'])).toContain('font-mono');
    expect(String(codes[0]?.props?.['className'])).toContain('text-xs');
  });

  it('dresses an unrecognised section value the same way', () => {
    const tree = roster([unrecognised]);
    const codes = elementsOf(tree, 'code');
    expect(codes).toHaveLength(1);
    expect(textUnder(codes[0])).toBe('BLOCKED');
  });

  it('keeps regime names in the sentence face — no mono outside quoted identifiers', async () => {
    const tree = roster([scanningBlocked]);
    const codes = elementsOf(tree, 'code');
    expect(codes.map(textUnder)).toEqual(['AGGREGATE_BELOW_MIN']);
    // And the note's wording survives whole — the byte-identical claim is
    // pinned by radar-resolution.test.ts through the derived string; this
    // checks the pieces reached the page around the dressed token.
    const r = await rendered(roster([scanningBlocked]));
    expect(r.text).toContain('not qualifying — the platform gives');
    expect(r.text).toContain('AGGREGATE_BELOW_MIN');
    expect(r.text).toContain('regime bear_ranging (medium)');
  });

  it('renders nothing at all for a null resolution', () => {
    const tree = roster([holding]);
    expect(elementsOf(tree, 'code')).toHaveLength(0);
  });
});
