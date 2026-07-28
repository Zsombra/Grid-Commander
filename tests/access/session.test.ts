import { describe, expect, it } from 'vitest';
import {
  CookieSession,
  SESSION_COOKIE,
  type CookieOptions,
  type CookieStore,
} from '@/infrastructure/http/cookie-session.js';
import { SESSION_TTL_SECONDS } from '@/domain/session/session.js';
import { FakeClock } from '../support/fakes.js';

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

/** Options are irrelevant when a test is planting a cookie rather than issuing one. */
const anyOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 0,
};

function harness(secret = 'server-secret') {
  const cookies = new MemoryCookies();
  const clock = new FakeClock();
  return { cookies, clock, session: new CookieSession({ cookies, secret, clock }) };
}

/** A request acts for exactly one identified user. */
describe('a session identifies its user', () => {
  it('reads back the user it was issued for', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    const read = await h.session.read();
    expect(read.kind).toBe('valid');
    expect(read.kind === 'valid' && read.session.userId).toBe('u1');
  });

  it('rejects an absent session', async () => {
    const read = await harness().session.read();
    expect(read).toEqual({ kind: 'rejected', reason: 'absent' });
  });

  it('rejects a value this product did not issue', async () => {
    const h = harness();
    h.cookies.set(SESSION_COOKIE, 'u2.1753617600000.forged', anyOptions);
    expect((await h.session.read()).kind).toBe('rejected');
  });

  /**
   * The one that matters. Without a signature, a user id in a cookie is an
   * invitation to type someone else's.
   */
  it('rejects a session signed with a different secret', async () => {
    const attacker = harness('guessed-secret');
    await attacker.session.issue({ userId: 'victim', issuedAt: attacker.clock.now() });
    const forged = attacker.cookies.get(SESSION_COOKIE)!;

    const real = harness('server-secret');
    real.cookies.set(SESSION_COOKIE, forged, anyOptions);
    const read = await real.session.read();
    expect(read).toEqual({ kind: 'rejected', reason: 'bad-signature' });
  });

  it('rejects a tampered user id even with the original signature', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    const raw = h.cookies.get(SESSION_COOKIE)!;
    const signature = raw.slice(raw.lastIndexOf('.') + 1);
    h.cookies.set(SESSION_COOKIE, `u2.${h.clock.now().getTime()}.${signature}`, anyOptions);
    expect((await h.session.read()).kind).toBe('rejected');
  });

  it('rejects a session past its lifetime', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    h.clock.advance((SESSION_TTL_SECONDS + 1) * 1000);
    expect(await h.session.read()).toEqual({ kind: 'rejected', reason: 'expired' });
  });

  it('accepts one just inside its lifetime', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    h.clock.advance((SESSION_TTL_SECONDS - 60) * 1000);
    expect((await h.session.read()).kind).toBe('valid');
  });

  it('clearing it leaves nothing to present', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    await h.session.clear();
    expect(await h.session.read()).toEqual({ kind: 'rejected', reason: 'absent' });
  });
});

/** A session is not a BattleGrid credential. */
describe('the session carries no authority', () => {
  it('contains the user id and nothing else', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    const raw = h.cookies.get(SESSION_COOKIE)!;

    // Whatever else changes about the format, none of these may appear in it.
    for (const forbidden of ['mcp:read', 'bg_live', 'access_token', 'Bearer']) {
      expect(raw).not.toContain(forbidden);
    }
  });

  it('is not readable by scripts, not sent in the clear, and not cross-site', async () => {
    const h = harness();
    await h.session.issue({ userId: 'u1', issuedAt: h.clock.now() });
    const options = h.cookies.jar.get(SESSION_COOKIE)!.options;
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe('lax');
  });

  it('is secure unless explicitly told otherwise', async () => {
    // The default must be the safe one: a missing configuration flag cannot
    // silently produce a session that travels in the clear.
    const cookies = new MemoryCookies();
    const clock = new FakeClock();
    const insecure = new CookieSession({ cookies, secret: 's', clock, secure: false });
    await insecure.issue({ userId: 'u1', issuedAt: clock.now() });
    expect(cookies.jar.get(SESSION_COOKIE)!.options.secure).toBe(false);

    const defaulted = new CookieSession({ cookies, secret: 's', clock });
    await defaulted.issue({ userId: 'u1', issuedAt: clock.now() });
    expect(cookies.jar.get(SESSION_COOKIE)!.options.secure).toBe(true);
  });
});
