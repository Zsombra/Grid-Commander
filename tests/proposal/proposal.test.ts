import { describe, expect, it } from 'vitest';
import {
  checkProposal,
  isActionable,
  isProposable,
  isStale,
  OPERATIONS,
  partition,
  PROPOSABLE,
  STALE_AFTER_HOURS,
} from '@/domain/proposal/proposal.js';
import type { Proposal } from '@/domain/proposal/proposal.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';

const RECORDED = new Date('2026-08-05T09:00:00Z');
const hours = (n: number) => new Date(RECORDED.getTime() + n * 60 * 60 * 1000);

const aProposal = (over: Partial<Proposal> = {}): Proposal => ({
  id: 'p1',
  userId: 'u1',
  operation: 'edit',
  target: 'agent-1',
  proposedValues: { tradingMode: 'OFF' },
  recordedAt: RECORDED,
  status: 'open',
  resolvedAt: null,
  ...over,
});

describe('what a model may propose', () => {
  it('excludes applying a plan', () => {
    // DL-1. `DescribeApplyRequest` takes a CompiledPlan carrying a five-minute
    // plan token, so an apply's consequence cannot be recomputed when a human
    // finally opens it. Refused by name rather than quietly omitted.
    expect(isProposable('applyPlan')).toBe(false);
    expect(PROPOSABLE).not.toContain('applyPlan');
  });

  it('offers the seven whose describe can be re-run from target and values', () => {
    expect([...PROPOSABLE].sort()).toEqual(
      ['archiveAgent', 'archiveStrategy', 'deploy', 'edit', 'rebind', 'retuneRule', 'undeploy'],
    );
  });

  it('refuses anything else', () => {
    expect(isProposable('disconnect')).toBe(false);
    expect(isProposable('')).toBe(false);
  });
});

describe('the staleness horizon', () => {
  it('is not the confirmation TTL', () => {
    /**
     * The distinction DL-2 turns on. 300 seconds is how long an *agreement*
     * survives; the horizon is how long a *suggestion* stays worth showing.
     * Conflating them would make the common path an expiry.
     */
    expect(STALE_AFTER_HOURS * 3600).not.toBe(CONFIRMATION_TTL_SECONDS);
    expect(STALE_AFTER_HOURS * 3600).toBeGreaterThan(CONFIRMATION_TTL_SECONDS);
  });

  it('covers a weekend', () => {
    // Why 24 hours was rejected: a proposal made on Friday evening has to
    // survive until Monday morning.
    expect(STALE_AFTER_HOURS).toBeGreaterThanOrEqual(72);
  });

  it('is not "never"', () => {
    // A queue that only grows stops being read, which is the failure the
    // visibility requirement exists to prevent.
    expect(Number.isFinite(STALE_AFTER_HOURS)).toBe(true);
  });

  it('holds until the horizon and not past it', () => {
    const p = aProposal();
    expect(isStale(p, hours(STALE_AFTER_HOURS - 1))).toBe(false);
    expect(isStale(p, hours(STALE_AFTER_HOURS + 1))).toBe(true);
  });
});

describe('what an operator can still act on', () => {
  it('is an open proposal inside the horizon', () => {
    expect(isActionable(aProposal(), hours(1))).toBe(true);
  });

  it('is not one already resolved', () => {
    expect(isActionable(aProposal({ status: 'agreed' }), hours(1))).toBe(false);
    expect(isActionable(aProposal({ status: 'declined' }), hours(1))).toBe(false);
  });

  it('is not one past the horizon', () => {
    expect(isActionable(aProposal(), hours(STALE_AFTER_HOURS + 1))).toBe(false);
  });

  it('separates stale from actionable without losing either', () => {
    const fresh = aProposal({ id: 'fresh' });
    const old = aProposal({ id: 'old', recordedAt: new Date('2026-07-01T09:00:00Z') });
    const done = aProposal({ id: 'done', status: 'agreed' });
    const { actionable, stale } = partition([fresh, old, done], hours(1));
    expect(actionable.map((p) => p.id)).toEqual(['fresh']);
    // Stale is history, never deleted: "a model suggested stopping this agent
    // three days ago and nobody looked" is worth being able to find out.
    expect(stale.map((p) => p.id)).toEqual(['old']);
  });
});

describe('a proposal is checked before it is stored', () => {
  const ok = { operation: 'edit', target: 'agent-1', values: { changes: { tradingMode: 'OFF' } } };

  it('accepts a well-formed one', () => {
    expect(checkProposal(ok)).toBeNull();
  });

  it('refuses an operation it does not offer, and lists what it does', () => {
    const r = checkProposal({ ...ok, operation: 'disconnect' });
    expect(r?.kind).toBe('unknown-operation');
    expect(r?.reason).toContain('disconnect');
    expect(r?.reason).toContain('edit');
  });

  it('refusing an apply says where applying happens', () => {
    // The one exclusion an operator is most likely to trip over, so the
    // refusal teaches rather than just declining.
    const r = checkProposal({ ...ok, operation: 'applyPlan' });
    expect(r?.kind).toBe('unknown-operation');
    expect(r?.reason).toMatch(/web app/i);
    expect(r?.reason).toMatch(/five minutes/i);
  });

  it('refuses one that names no target', () => {
    const r = checkProposal({ ...ok, target: '  ' });
    expect(r?.kind).toBe('missing-target');
    expect(r?.reason).toContain('agent');
  });

  it('names exactly what is missing', () => {
    const r = checkProposal({ operation: 'deploy', target: 'agent-1', values: { coinId: 'BTC' } });
    expect(r?.kind).toBe('missing-values');
    expect(r && 'missing' in r ? r.missing : []).toEqual(['timeframe']);
    expect(r?.reason).toContain('deploy an agent to a coin');
  });

  it('treats an explicit undefined as missing', () => {
    const r = checkProposal({ ...ok, values: { changes: undefined } });
    expect(r?.kind).toBe('missing-values');
  });

  it('asks a model for nothing the world can answer later', () => {
    /**
     * The design property. A describe also needs the agent's current name and
     * revision — both read fresh when a human opens the proposal. Requiring a
     * model to supply them would freeze a copy of the world at proposal time,
     * which is the staleness this whole change exists to avoid.
     */
    for (const shape of Object.values(OPERATIONS)) {
      expect(shape.values).not.toContain('expectedRevision');
      expect(shape.values).not.toContain('agentName');
      expect(shape.values).not.toContain('confirmationToken');
    }
  });

  it('describes every operation it offers, and offers every one it describes', () => {
    // Two tables that must not drift: an operation with no shape cannot be
    // validated, and a shape with no operation is unreachable.
    expect(Object.keys(OPERATIONS).sort()).toEqual([...PROPOSABLE].sort());
  });
});
