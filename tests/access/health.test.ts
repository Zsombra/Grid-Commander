import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The health route: 200 when the database answers, 503 when it does not,
 * and a body that leaks nothing either way. The composition is mocked at
 * the seam the route imports — everything below `checkHealth` is one
 * `select 1`, held by the serving gate against the real server.
 */

const health = vi.hoisted(() => ({ fail: false }));

vi.mock('@/composition.js', () => ({
  checkHealth: async () => {
    if (health.fail) throw new Error('connect ECONNREFUSED 127.0.0.1:5432');
  },
}));

beforeEach(() => {
  health.fail = false;
});

describe('the health check checks', () => {
  it('answers 200 ok when the database answers', async () => {
    const { GET } = await import('../../app/api/health/route.js');
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('answers 503 when the database has gone away', async () => {
    health.fail = true;
    const { GET } = await import('../../app/api/health/route.js');
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'unavailable' });
  });

  it('leaks nothing — the body is the status word and only that', async () => {
    for (const fail of [false, true]) {
      health.fail = fail;
      const { GET } = await import('../../app/api/health/route.js');
      const body = (await (await GET()).json()) as Record<string, unknown>;
      expect(Object.keys(body)).toEqual(['status']);
    }
  });
});
