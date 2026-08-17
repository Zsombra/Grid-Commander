import { describe, expect, it } from 'vitest';
import { mapDeployments } from '@/infrastructure/battlegrid/radar-adapter.js';
import { isRecognisedSection } from '@/domain/agent/deployment.js';
import { resolutionNote } from '@/presentation/components/agent-roster.js';
import type { AgentDeployment } from '@/domain/agent/deployment.js';

/**
 * What the platform resolved, carried and rendered without being interpreted.
 *
 * `resolvesNow` carries twenty-two fields and this product read two. On
 * 2026-08-13, live at v18.2.0, **fifteen of twenty deployments were not
 * qualifying** — `AGGREGATE_BELOW_MIN` ×14, `ATR_VOLATILITY_BELOW_MIN` ×1 —
 * and every one of them rendered as an ordinary scanning deployment.
 *
 * The fixtures use the values actually observed. The one that does not is
 * `BLOCKED`, which the platform declares and this account has never produced,
 * and which is here precisely to prove it renders honestly without having been
 * modelled.
 */

/** A policy row in the shape the platform sends. */
function policy(resolvesNow: Record<string, unknown> | null): unknown {
  return {
    policyId: 'p1',
    coinTicker: 'WIF',
    revision: 3,
    deploymentTimeframe: '1h',
    enabled: true,
    slots: [{ agentId: 'a1' }],
    ...(resolvesNow === null ? {} : { resolvesNow }),
  };
}

/** The observed shape, with whatever the test is about overridden. */
const observed = (over: Record<string, unknown> = {}) => ({
  section: 'SCANNING',
  onDutyAgentId: 'a1',
  openPositionAgentId: null,
  qualified: false,
  qualificationBlock: 'AGGREGATE_BELOW_MIN',
  regimeUsed: 'bull_ranging',
  regimeConviction: 'medium',
  cooldownUntil: null,
  ...over,
});

const view = (over: Partial<AgentDeployment> = {}): AgentDeployment => ({
  coinTicker: 'WIF',
  timeframe: '1h',
  standing: 'on-duty',
  occupancy: 'active-agent-present',
  resolution: null,
  ...over,
});

const mapped = (resolvesNow: Record<string, unknown> | null) =>
  mapDeployments([policy(resolvesNow)])[0]!;

describe('the mapper carries what the platform resolved', () => {
  it('reads the fields that were on the wire and discarded', () => {
    const r = mapped(observed()).resolution;
    expect(r).not.toBeNull();
    expect(r?.qualified).toBe(false);
    expect(r?.qualificationBlock).toBe('AGGREGATE_BELOW_MIN');
    expect(r?.section).toBe('SCANNING');
    expect(r?.regime).toBe('bull_ranging');
    expect(r?.regimeConviction).toBe('medium');
  });

  it('parses a cooldown the platform actually sent', () => {
    // One of the twenty rows carried one on 2026-08-13.
    const r = mapped(observed({ cooldownUntil: '2026-08-13T10:48:20.559Z' })).resolution;
    expect(r?.cooldownUntil?.toISOString()).toBe('2026-08-13T10:48:20.559Z');
  });

  it('keeps absent absent, and never defaults', () => {
    /**
     * The distinction the whole block exists for: *the platform declined* is
     * not *the platform was silent*. A missing `qualified` defaulted to `false`
     * would put fifteen made-up blocks on a healthy account.
     */
    const r = mapped({ onDutyAgentId: 'a1' }).resolution;
    expect(r?.qualified).toBeNull();
    expect(r?.qualificationBlock).toBeNull();
    expect(r?.section).toBeNull();
    expect(r?.cooldownUntil).toBeNull();
  });

  it('maps a row with no resolution at all, and does not fail it', () => {
    // `resolvesNow` is optional refinement; the row still has to arrive.
    const d = mapped(null);
    expect(d.resolution).toBeNull();
    expect(d.coinTicker).toBe('WIF');
  });

  it('does not parse a timestamp that is not one', () => {
    expect(mapped(observed({ cooldownUntil: 'soon' })).resolution?.cooldownUntil).toBeNull();
  });
});

describe('the surface names what it does not recognise', () => {
  it('says a deployment is not qualifying, in the platform’s own token', () => {
    const note = resolutionNote(view({ resolution: mapped(observed()).resolution }));
    expect(note).toContain('not qualifying');
    // Verbatim. Two block values from one account is not a vocabulary.
    expect(note).toContain('AGGREGATE_BELOW_MIN');
  });

  it('says nothing about blocking when the platform qualified it', () => {
    const r = mapped(observed({ qualified: true, qualificationBlock: null })).resolution;
    const note = resolutionNote(view({ resolution: r }));
    expect(note ?? '').not.toContain('not qualifying');
  });

  /**
   * The case this whole pass-through exists for.
   *
   * `BLOCKED` is declared by the platform, null on every row here across two
   * major versions, and has never been observed. A modelled union would have
   * had to either omit it or invent it; carrying the string lets it arrive and
   * be named the day it first appears.
   */
  it('names an unrecognised state rather than showing it as scanning or idle', () => {
    const r = mapped(observed({ section: 'BLOCKED' })).resolution;
    const note = resolutionNote(view({ resolution: r }));
    expect(isRecognisedSection('BLOCKED')).toBe(false);
    expect(note).toContain('does not recognise');
    expect(note).toContain('BLOCKED');
    expect(note ?? '').not.toMatch(/\bidle\b/i);
  });

  it('shows a block token it has never seen, without inventing a sentence', () => {
    const r = mapped(observed({ qualificationBlock: 'SOME_FUTURE_BLOCK' })).resolution;
    const note = resolutionNote(view({ resolution: r }));
    expect(note).toContain('SOME_FUTURE_BLOCK');
  });

  it('says the platform gave no reason, rather than guessing one', () => {
    const r = mapped(observed({ qualificationBlock: null })).resolution;
    expect(resolutionNote(view({ resolution: r }))).toContain('did not say why');
  });

  it('states a cooldown the read said is still running, and not one it did not', () => {
    /**
     * `cooldownActive` is decided in the read against the injected clock —
     * `tests/architecture/boundaries.test.ts` refuses a component that measures
     * its own time. So the surface is handed the decision, and these supply it
     * the way `deploymentsFor` would.
     */
    const base = mapped(observed({ cooldownUntil: '2099-01-01T00:00:00.000Z' })).resolution!;
    expect(resolutionNote(view({ resolution: { ...base, cooldownActive: true } }))).toContain(
      'cooldown',
    );
    expect(
      resolutionNote(view({ resolution: { ...base, cooldownActive: false } })) ?? '',
    ).not.toContain('cooldown');
  });

  it('the read decides whether the cooldown is running, not the mapper', () => {
    // The adapter has no clock, so it carries the timestamp and abstains.
    expect(mapped(observed({ cooldownUntil: '2099-01-01T00:00:00.000Z' })).resolution?.cooldownActive)
      .toBeNull();
  });

  it('says nothing at all when the platform resolved nothing', () => {
    // No resolution supports no statement in either direction — the same rule
    // the occupancy line follows for an unread lifecycle.
    expect(resolutionNote(view({ resolution: null }))).toBeNull();
  });
});
