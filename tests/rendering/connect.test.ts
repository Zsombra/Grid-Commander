import { beforeEach, describe, expect, it, vi } from 'vitest';
import { actingWith } from './support/fake-acting.js';
import { rendered } from './support/render.js';

/**
 * The connect page answers the callback's bad news.
 *
 * The scenario "The user declines" (battlegrid-connection) promises an
 * explanation with the option to retry. The callback has always sent the
 * explanation — `?declined=` for a decline, `?error=` for a response it
 * refused — and for a while the page read neither, which made the callback's
 * own "they are told why" comment a claim its destination did not honor.
 * This suite is what notices if the page stops reading them again.
 */

let current: { app: unknown; user: unknown };

vi.mock('@/presentation/session.js', () => ({
  acting: async () => current,
  requestApp: async () => (current as { app: unknown }).app,
}));

async function connectRendered(search: Record<string, string> = {}) {
  const Page = (await import('../../app/connect/page.js')).default;
  return rendered(await Page({ searchParams: Promise.resolve(search) }));
}

beforeEach(() => {
  current = actingWith();
});

describe('/connect, branch by branch', () => {
  it('offers the honest consent summary and the way in', async () => {
    const r = await connectRendered();
    expect(r.headings[0]).toBe('Connect your BattleGrid account');
    expect(r.text).toContain('This is not view-only access.');
    expect(r.text).toContain('Continue to BattleGrid');
  });

  it('a personal deployment has nothing to connect and says so', async () => {
    current = {
      ...current,
      app: { ...(current.app as object), personal: { apiKey: 'k', scopes: [] } },
    };
    const r = await connectRendered();
    expect(r.headings[0]).toBe('There is nothing to connect');
    expect(r.text).not.toContain('Continue to BattleGrid');
  });

  it('a decline is answered in the platform’s words, and the retry stays on the page', async () => {
    const r = await connectRendered({ declined: 'access_denied' });
    expect(r.text).toContain('You declined the authorization at BattleGrid');
    expect(r.text).toContain('access_denied');
    expect(r.text).toContain('nothing was stored');
    // The retry the scenario promises is the consent form itself.
    expect(r.text).toContain('Continue to BattleGrid');
    expect(r.text).toContain('This is not view-only access.');
  });

  it('an incomplete callback says no connection was made', async () => {
    const r = await connectRendered({ error: 'incomplete' });
    expect(r.text).toContain('No connection was made');
    expect(r.text).toContain('missing the authorization it should have carried');
    expect(r.text).toContain('starting again below is safe');
  });

  it('an untrusted callback says it was rejected', async () => {
    const r = await connectRendered({ error: 'untrusted' });
    expect(r.text).toContain('did not match an authorization this product started');
    expect(r.text).toContain('rejected');
  });

  it('an unknown error value is named verbatim, never invented', async () => {
    const r = await connectRendered({ error: 'server_error' });
    expect(r.text).toContain('could not be completed');
    expect(r.text).toContain('server_error');
  });
});
