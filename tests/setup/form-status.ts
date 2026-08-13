import { vi } from 'vitest';

/**
 * `useFormStatus`, mocked for the whole suite.
 *
 * `PerformButton` is a client component, and the rendering harness calls
 * components directly rather than through a render pass, so a hook there has no
 * dispatcher and throws. That is not a harness weakness to route around — React's
 * own server renderer reports `pending: false` too, pinned by
 * `tests/rendering/form-status.test.ts`, so mocking is the only way to reach the
 * pending branch at all short of driving a browser.
 *
 * **Registered once here rather than per file.** The alternative was a `vi.mock`
 * at the top of every test that renders a page carrying a perform form — which
 * is every ceremony page, and growing. One forgotten mock is a red suite in a
 * file that never mentions forms, and the failure names React rather than the
 * cause. This is the same reasoning `control.ts` gives for one constant over
 * seven copies.
 *
 * The default is `pending: false`, which is what every test wants unless it says
 * otherwise: a page at rest. `setPending(true)` from
 * `tests/rendering/support/form-status.ts` drives the other branch, and
 * `resetPending()` in a `beforeEach` keeps that from leaking sideways.
 */
vi.mock('react-dom', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useFormStatus: (await import('../rendering/support/form-status.js')).formStatus,
}));
