import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FeasibilityAdvisory } from '@/domain/agent/feasibility.js';
import type { FeasibilityReply } from '@/domain/agent/feasibility-reply.js';
import { FEASIBILITY_REPLY_TTL_SECONDS } from '@/domain/agent/feasibility-reply.js';
import type { FeasibilityReplyPort } from '@/ports/feasibility-reply.js';
import type { Clock } from '@/ports/clock.js';
import type { CookieStore } from './cookie-session.js';

/**
 * The reply to an agent edit, as a signed cookie.
 *
 * `payload.signature`, where the payload is base64url JSON and the signature is
 * HMAC-SHA256 over it with the server-held secret — the same construction
 * `CookieSession` uses, deliberately and not by coincidence. A second signing
 * scheme in one codebase is a second thing to get wrong, and the one that gets
 * it wrong is always the one nobody reviewed twice.
 *
 * It is **not** a credential. It carries no token, no user id, and nothing that
 * authorises anything; it is a set of numbers about a fleet's tradeable coins.
 * The signature is not protecting a secret — it is protecting a *claim*, so
 * that what the product renders as BattleGrid's answer is an answer BattleGrid
 * actually gave.
 */

export const FEASIBILITY_COOKIE = 'gc_feasibility';

/**
 * The most bytes we will hand a browser for this.
 *
 * Browsers cap a cookie near 4096 bytes including its name and attributes, and
 * a cookie over the cap is not truncated — it is dropped, whole and silently.
 * So the ceiling is enforced here, where the drop can be *reported*: over it,
 * the coins are left behind and the platform's own counts still travel with
 * `coinsCarried: false`. The alternative is a fleet of forty rendering as a
 * fleet of nothing with no explanation.
 */
const MAX_PAYLOAD_BYTES = 3600;

interface WirePayload {
  a: string;
  t: number;
  c: boolean;
  advisory: FeasibilityAdvisory;
}

export interface FeasibilityReplyCookieDeps {
  readonly cookies: CookieStore;
  readonly secret: string;
  readonly clock: Clock;
  readonly secure?: boolean | undefined;
}

export class FeasibilityReplyCookie implements FeasibilityReplyPort {
  constructor(private readonly deps: FeasibilityReplyCookieDeps) {}

  issue(params: { agentId: string; advisory: FeasibilityAdvisory }): void {
    const full = this.encode({
      a: params.agentId,
      t: this.deps.clock.now().getTime(),
      c: true,
      advisory: params.advisory,
    });

    /**
     * The coins are what can overflow; the counts never can. So the fallback
     * drops exactly the part that grows with the fleet and keeps the part the
     * headline is made of, with `c: false` so the surface says the detail was
     * dropped rather than implying the fleet is smaller than it is.
     */
    const value =
      full.length <= MAX_PAYLOAD_BYTES
        ? full
        : this.encode({
            a: params.agentId,
            t: this.deps.clock.now().getTime(),
            c: false,
            advisory: { ...params.advisory, coins: [] },
          });

    this.deps.cookies.set(FEASIBILITY_COOKIE, value, {
      // Same three that matter as the session's, for the same reasons: out of
      // scripts, off plaintext, and not carried here by another site's form.
      httpOnly: true,
      secure: this.deps.secure ?? true,
      sameSite: 'lax',
      path: '/',
      // The browser's expiry. The check that decides is `isStale`, one layer in
      // — this only keeps a dead cookie from riding along on every request.
      maxAge: FEASIBILITY_REPLY_TTL_SECONDS,
    });
  }

  read(): FeasibilityReply | null {
    const raw = this.deps.cookies.get(FEASIBILITY_COOKIE);
    if (!raw) return null;

    const separator = raw.lastIndexOf('.');
    if (separator <= 0) return null;

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    // Covers a forged cookie and a tampered one alike: without the secret,
    // neither can produce a signature over the payload it wants.
    if (!this.verify(payload, signature)) return null;

    let decoded: unknown;
    try {
      decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      // A signature that verified over something that is not JSON means this
      // product wrote a payload it can no longer read — a format change, not an
      // attack. Nothing is shown either way.
      return null;
    }

    return readWire(decoded);
  }

  private encode(payload: WirePayload): string {
    const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${body}.${this.sign(body)}`;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.deps.secret).update(payload).digest('base64url');
  }

  /**
   * Constant-time comparison, for the reason `CookieSession` gives: `===` on a
   * signature leaks through timing how many leading bytes were right.
   */
  private verify(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
}

/**
 * The decoded payload → the reply, or nothing.
 *
 * A verified signature says this product wrote the bytes. It says nothing about
 * whether the bytes are still the shape this version reads, and a deploy that
 * changes the payload will meet cookies written by the one before it. Every
 * field is checked rather than trusted, for the same reason the platform's
 * payloads are.
 */
function readWire(decoded: unknown): FeasibilityReply | null {
  if (typeof decoded !== 'object' || decoded === null) return null;
  const p = decoded as Record<string, unknown>;

  if (typeof p['a'] !== 'string' || p['a'].length === 0) return null;
  if (typeof p['t'] !== 'number' || !Number.isFinite(p['t'])) return null;
  if (typeof p['c'] !== 'boolean') return null;
  if (typeof p['advisory'] !== 'object' || p['advisory'] === null) return null;

  return {
    agentId: p['a'],
    issuedAt: new Date(p['t']),
    advisory: p['advisory'] as FeasibilityAdvisory,
    coinsCarried: p['c'],
  };
}
