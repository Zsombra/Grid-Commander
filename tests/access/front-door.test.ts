import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Where the root sends you.
 *
 * The reachability walk in `tests/architecture/reachability.test.ts` proves the
 * root *exists* and that the product can be reached from it. It reads text, so
 * it cannot see which branch runs — mutation confirmed this by swapping the
 * unconnected destination for `/agents` and leaving the whole suite green.
 *
 * That mutation is not cosmetic. A user with no session sent into the product
 * lands on a page that tells them they are not connected, one click further
 * from the thing they came to do, on the only URL anyone will ever hand them.
 */

const redirect = vi.fn();
const acting = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}));

vi.mock('@/presentation/session.js', () => ({
  acting: () => acting(),
}));

const { default: Root } = await import('../../app/page.js');

beforeEach(() => {
  redirect.mockClear();
  acting.mockClear();
});

describe('arriving at the root', () => {
  it('sends someone with no session to where connecting begins', async () => {
    acting.mockResolvedValue({ user: { kind: 'not-connected', message: 'not connected' } });
    await Root();
    expect(redirect).toHaveBeenCalledWith('/connect');
  });

  it('sends a connected user into the product', async () => {
    acting.mockResolvedValue({ user: { kind: 'acting', authority: {} } });
    await Root();
    // Agents rather than a dashboard: it is what someone came to check on, and
    // every exit criterion in the idea brief starts there.
    expect(redirect).toHaveBeenCalledWith('/agents');
  });

  it('never renders — it decides where you belong and hands off', async () => {
    acting.mockResolvedValue({ user: { kind: 'acting', authority: {} } });
    await Root();
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it('does not ask a connected user to connect again', async () => {
    acting.mockResolvedValue({ user: { kind: 'acting', authority: {} } });
    await Root();
    expect(redirect).not.toHaveBeenCalledWith('/connect');
  });
});
