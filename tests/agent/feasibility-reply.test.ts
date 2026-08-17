import { describe, expect, it } from 'vitest';
import type { CookieOptions, CookieStore } from '@/infrastructure/http/cookie-session.js';
import {
  FEASIBILITY_COOKIE,
  FeasibilityReplyCookie,
} from '@/infrastructure/http/feasibility-reply-cookie.js';
import { FEASIBILITY_REPLY_TTL_SECONDS } from '@/domain/agent/feasibility-reply.js';
import type { AdvisoryCoin, FeasibilityAdvisory } from '@/domain/agent/feasibility.js';
import { ReadFeasibilityReplyQuery } from '@/application/use-cases/read-feasibility-reply.query.js';
import { FakeClock } from '../support/fakes.js';

/**
 * The reply to a write, on its way across the redirect that follows it.
 *
 * The property under test is not "a cookie round-trips". It is that **the only
 * thing this product will render as BattleGrid's answer is an answer BattleGrid
 * gave** — so every way of arriving at figures the server did not write must
 * come out as nothing, and each of those ways gets its own case here.
 */

class MemoryCookies implements CookieStore {
  readonly jar = new Map<string, { value: string; options: CookieOptions }>();
  get(name: string): string | undefined {
    return this.jar.get(name)?.value;
  }
  set(name: string, value: string, options: CookieOptions): void {
    this.jar.set(name, { value, options });
  }
  delete(name: string): void {
    this.jar.delete(name);
  }
}

const anyOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 0,
};

function coin(ticker: string, min = 0.8): AdvisoryCoin {
  return {
    kind: 'priced',
    ticker,
    status: 'feasible',
    atrPct: 1,
    reachableMinPct: min,
    reachableMaxPct: 2.5,
    requestedMinAtrMultiple: 0.55,
    requestedMinPct: min,
    requestedMaxPct: 2.5,
    blockedBy: null,
    shortfallPct: null,
  };
}

function advisory(coins: readonly AdvisoryCoin[]): FeasibilityAdvisory {
  return {
    dials: { minStopLossAtrMultiple: 0.55, maxStopLossPct: 2.5, minRiskRewardRatio: 1.5 },
    counts: {
      total: coins.length,
      evaluated: coins.length,
      buildable: coins.length,
      volatilityUnavailable: 0,
    },
    coins,
  };
}

function harness(secret = 'server-secret') {
  const cookies = new MemoryCookies();
  const clock = new FakeClock();
  const replies = new FeasibilityReplyCookie({ cookies, secret, clock, secure: true });
  return {
    cookies,
    clock,
    replies,
    query: new ReadFeasibilityReplyQuery(replies, clock),
  };
}

describe('the reply survives the redirect', () => {
  it('reads back what was issued, for the agent it was issued about', () => {
    const h = harness();
    h.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });

    const read = h.query.execute({ agentId: 'a1' });
    expect(read?.agentId).toBe('a1');
    expect(read?.advisory.counts.buildable).toBe(1);
    expect(read?.coinsCarried).toBe(true);
  });

  it('is issued out of scripts, off plaintext, and not from another site’s form', () => {
    // The same three that matter on the session cookie, for the same reasons.
    const h = harness();
    h.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });
    const options = h.cookies.jar.get(FEASIBILITY_COOKIE)?.options;
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
    expect(options?.maxAge).toBe(FEASIBILITY_REPLY_TTL_SECONDS);
  });
});

describe('nothing renders that the server did not write', () => {
  it('shows nothing when no reply was carried', () => {
    expect(harness().query.execute({ agentId: 'a1' })).toBeNull();
  });

  it('shows nothing when the payload was tampered with', () => {
    /**
     * The case the whole design exists for: an operator editing the figures.
     * The signature no longer covers the payload, so it renders nothing —
     * rather than rendering a fleet size BattleGrid never reported.
     */
    const h = harness();
    h.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });

    const raw = h.cookies.jar.get(FEASIBILITY_COOKIE)!.value;
    const [body, signature] = raw.split('.') as [string, string];
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      advisory: FeasibilityAdvisory;
    };
    decoded.advisory = {
      ...decoded.advisory,
      counts: { ...decoded.advisory.counts, buildable: 99, total: 99 },
    };
    const forged = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url');
    h.cookies.set(FEASIBILITY_COOKIE, `${forged}.${signature}`, anyOptions);

    expect(h.query.execute({ agentId: 'a1' })).toBeNull();
  });

  it('shows nothing for a payload signed with a different secret', () => {
    const writer = harness('another-server');
    writer.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });

    const reader = harness('server-secret');
    reader.cookies.set(
      FEASIBILITY_COOKIE,
      writer.cookies.jar.get(FEASIBILITY_COOKIE)!.value,
      anyOptions,
    );
    expect(reader.query.execute({ agentId: 'a1' })).toBeNull();
  });

  it('shows nothing for a payload with no signature at all', () => {
    const h = harness();
    const body = Buffer.from(
      JSON.stringify({ a: 'a1', t: h.clock.now().getTime(), c: true, advisory: advisory([]) }),
      'utf8',
    ).toString('base64url');
    h.cookies.set(FEASIBILITY_COOKIE, body, anyOptions);
    expect(h.query.execute({ agentId: 'a1' })).toBeNull();
  });
});

describe('a verified reply is still refused where it does not belong', () => {
  it('is not shown on a different agent’s surface', () => {
    /**
     * A signature proves the server wrote it. It says nothing about whether the
     * reader is looking at the agent it was written about — and one agent's
     * tradeable universe under another agent's name is a false statement that
     * verifies perfectly.
     */
    const h = harness();
    h.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });
    expect(h.query.execute({ agentId: 'a2' })).toBeNull();
    expect(h.query.execute({ agentId: 'a1' })).not.toBeNull();
  });

  it('is not shown once it has gone stale', () => {
    const h = harness();
    h.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });

    h.clock.advance((FEASIBILITY_REPLY_TTL_SECONDS - 1) * 1000);
    expect(h.query.execute({ agentId: 'a1' })).not.toBeNull();

    h.clock.advance(2000);
    expect(h.query.execute({ agentId: 'a1' })).toBeNull();
  });

  it('is not shown when it claims to come from the future', () => {
    // A clock that moved under us leaves "how old is this" with no answer worth
    // rendering, on a figure whose whole meaning is how recent it is.
    const h = harness();
    h.replies.issue({ agentId: 'a1', advisory: advisory([coin('SOL')]) });
    h.clock.advance(-60_000);
    expect(h.query.execute({ agentId: 'a1' })).toBeNull();
  });
});

describe('a fleet too large to carry says so', () => {
  it('keeps the platform’s counts and drops the coins, rather than dropping the cookie', () => {
    /**
     * A cookie over the browser's cap is not truncated — it is dropped whole
     * and silently. So the overflow is handled here, where it can be reported:
     * the counts are BattleGrid's own and still complete, and `coinsCarried`
     * is false so the surface can say the detail is missing instead of
     * rendering a shorter fleet as though it were the whole one.
     */
    const h = harness();
    const huge = Array.from({ length: 400 }, (_, i) => coin(`COIN${String(i)}`, 0.5 + i / 100));
    h.replies.issue({ agentId: 'a1', advisory: advisory(huge) });

    const read = h.query.execute({ agentId: 'a1' });
    expect(read).not.toBeNull();
    expect(read?.coinsCarried).toBe(false);
    expect(read?.advisory.coins).toEqual([]);
    // The count an operator reads is BattleGrid's and is not the truncation.
    expect(read?.advisory.counts.total).toBe(400);
    expect(h.cookies.jar.get(FEASIBILITY_COOKIE)!.value.length).toBeLessThan(4096);
  });

  it('carries the coins when they fit', () => {
    const h = harness();
    h.replies.issue({
      agentId: 'a1',
      advisory: advisory([coin('SOL'), coin('BTC'), coin('ETH')]),
    });
    const read = h.query.execute({ agentId: 'a1' });
    expect(read?.coinsCarried).toBe(true);
    expect(read?.advisory.coins).toHaveLength(3);
  });
});
