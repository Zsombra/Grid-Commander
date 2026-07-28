import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionResult, SessionValue } from '@/domain/session/session.js';
import { decodePayload, encodePayload, isExpired, SESSION_TTL_SECONDS } from '@/domain/session/session.js';
import type { SessionPort } from '@/ports/session.js';
import type { Clock } from '@/ports/clock.js';

/**
 * The session, as a signed cookie.
 *
 * `payload.signature`, where the signature is an HMAC-SHA256 over the payload
 * with a server-held secret. The payload is a user id and an issue time; it
 * carries no BattleGrid authority (design W-A), so this cookie is not a
 * credential for anything outside Grid-Commander.
 */

export const SESSION_COOKIE = 'gc_session';

/** The store this adapter needs from the framework. Kept small on purpose. */
export interface CookieStore {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  delete(name: string): void;
}

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
}

export interface CookieSessionDeps {
  readonly cookies: CookieStore;
  readonly secret: string;
  readonly clock: Clock;
  /** Whether the connection is HTTPS. Only false in local development. */
  readonly secure?: boolean | undefined;
}

export class CookieSession implements SessionPort {
  constructor(private readonly deps: CookieSessionDeps) {}

  async read(): Promise<SessionResult> {
    const raw = this.deps.cookies.get(SESSION_COOKIE);
    if (!raw) return { kind: 'rejected', reason: 'absent' };

    const separator = raw.lastIndexOf('.');
    if (separator <= 0) return { kind: 'rejected', reason: 'malformed' };

    const payload = raw.slice(0, separator);
    const signature = raw.slice(separator + 1);
    if (!this.verify(payload, signature)) {
      // Covers both a forged cookie and a tampered one: without the secret,
      // neither can produce a signature over the payload it wants.
      return { kind: 'rejected', reason: 'bad-signature' };
    }

    const session = decodePayload(payload);
    if (!session) return { kind: 'rejected', reason: 'malformed' };
    if (isExpired(session, this.deps.clock.now())) {
      return { kind: 'rejected', reason: 'expired' };
    }

    return { kind: 'valid', session };
  }

  async issue(session: SessionValue): Promise<void> {
    const payload = encodePayload(session);
    this.deps.cookies.set(SESSION_COOKIE, `${payload}.${this.sign(payload)}`, {
      // The three that matter, and why: httpOnly keeps it out of scripts,
      // secure keeps it off plaintext connections, sameSite lax stops another
      // site's form from carrying it into a mutation here.
      httpOnly: true,
      secure: this.deps.secure ?? true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  async clear(): Promise<void> {
    this.deps.cookies.delete(SESSION_COOKIE);
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.deps.secret).update(payload).digest('base64url');
  }

  /**
   * Constant-time comparison.
   *
   * `===` on a signature leaks, through timing, how many leading bytes were
   * right — which is enough to forge one a byte at a time given enough
   * attempts.
   */
  private verify(payload: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(payload));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  }
}
