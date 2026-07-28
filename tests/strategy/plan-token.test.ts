import { describe, expect, it } from 'vitest';
import {
  describeRefusal,
  parsePlanToken,
  refuseLocally,
  type ParsedToken,
} from '@/domain/strategy/plan-token.js';

const USER = '0eccbf37-d90b-4933-88f2-d120627b23f7';
const STRATEGY = '9fc7be37-8330-4d60-a28f-287dd695187f';
const EXPIRES = 1785200930257;

function tokenWith(overrides: Record<string, unknown> = {}): string {
  const claims = {
    authoringCatalogDigest: '2d35afc7',
    credentialId: '9a022f12-7b6f-4a8d-bad2-494891ff37cd',
    expectedRevision: 1,
    expiresAtEpochMs: EXPIRES,
    materializationFenceDigest: '4f53cda1',
    operation: 'UPDATE',
    postStateDigest: 'fee760f6',
    proposedRevision: 2,
    strategyId: STRATEGY,
    userId: USER,
    version: 1,
    ...overrides,
  };
  const body = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `bgsp1.${body}.c2lnbmF0dXJl`;
}

const before = new Date(EXPIRES - 60_000);
const after = new Date(EXPIRES + 1);
const context = { userId: USER, strategyId: STRATEGY };

/** F-1: the claims are readable without a key. */
describe('reading a plan token', () => {
  it('reads the claims the real server issues', () => {
    const parsed = parsePlanToken(tokenWith());
    expect(parsed.kind).toBe('claims');
    if (parsed.kind !== 'claims') return;
    expect(parsed.claims.userId).toBe(USER);
    expect(parsed.claims.strategyId).toBe(STRATEGY);
    expect(parsed.claims.expectedRevision).toBe(1);
    expect(parsed.claims.proposedRevision).toBe(2);
    expect(parsed.claims.expiresAt.getTime()).toBe(EXPIRES);
  });

  /**
   * A layout we do not recognise is *unknown*, not invalid. Treating it as a
   * refusal would break every apply the day BattleGrid bumps the token version —
   * and the fallback, submitting and letting the server judge, is exactly the
   * behaviour we would have had without a parser.
   */
  it('reports an unfamiliar token as unknown rather than refusing it', () => {
    expect(parsePlanToken('bgsp2.something.else').kind).toBe('unknown');
    expect(parsePlanToken('not-a-token').kind).toBe('unknown');
    expect(parsePlanToken('bgsp1..sig').kind).toBe('unknown');
    expect(parsePlanToken(`bgsp1.${Buffer.from('{}').toString('base64url')}.sig`).kind).toBe('unknown');
  });
});

/**
 * S-B. The claims may only refuse. Every assertion below is that something is
 * *not* sent; none is that something is thereby valid.
 */
describe('refusing locally, with a reason', () => {
  it('refuses an expired plan and says when', () => {
    const refusal = refuseLocally(parsePlanToken(tokenWith()), context, after);
    expect(refusal?.kind).toBe('expired');
    expect(describeRefusal(refusal!)).toMatch(/expired/i);
    expect(describeRefusal(refusal!)).toMatch(/compile again/i);
  });

  it('refuses a plan compiled for another account', () => {
    const refusal = refuseLocally(parsePlanToken(tokenWith()), { ...context, userId: 'someone-else' }, before);
    expect(refusal?.kind).toBe('different-user');
  });

  it('refuses a plan compiled for another strategy', () => {
    const refusal = refuseLocally(parsePlanToken(tokenWith()), { ...context, strategyId: 's-other' }, before);
    expect(refusal?.kind).toBe('different-strategy');
  });

  it('refuses a plan compiled against a revision that has moved on', () => {
    const refusal = refuseLocally(
      parsePlanToken(tokenWith()),
      { ...context, currentRevision: 4 },
      before,
    );
    expect(refusal?.kind).toBe('superseded');
    // The message names both numbers, so the user can see what happened.
    expect(describeRefusal(refusal!)).toContain('1');
    expect(describeRefusal(refusal!)).toContain('4');
  });

  it('has no reason to refuse a plan that looks right', () => {
    expect(refuseLocally(parsePlanToken(tokenWith()), { ...context, currentRevision: 1 }, before)).toBeNull();
  });

  /**
   * The property that keeps this honest. An unreadable token yields no refusal,
   * which means it is submitted — the parser can subtract confidence and never
   * add it. If this ever returns a refusal for `unknown`, a token-format change
   * becomes an outage.
   */
  it('never refuses on the strength of a token it could not read', () => {
    const unknown: ParsedToken = { kind: 'unknown' };
    expect(refuseLocally(unknown, context, after)).toBeNull();
    expect(refuseLocally(unknown, { userId: 'x', strategyId: 'y' }, after)).toBeNull();
  });

  it('does not treat the absence of a refusal as validity', () => {
    // No current revision supplied: the staleness check cannot run, and its
    // silence must not read as "this plan is current".
    expect(refuseLocally(parsePlanToken(tokenWith()), context, before)).toBeNull();
  });
});
