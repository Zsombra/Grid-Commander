import { createElement } from 'react';
import { useFormStatus } from 'react-dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rendered } from './support/render.js';
import { resetPending, setPending } from './support/form-status.js';

/**
 * Reaching the state a server-action form is in while it is working.
 *
 * `#153` records that every confirmation page sits there between the click and
 * the redirect, and that the button primitive's declared `loading` state is
 * implemented by nothing. Fixing that needs `useFormStatus()`, which needs a
 * client component, which the walker cannot call — so the item was priced for a
 * renderer migration across 36 test files.
 *
 * It does not need one, and a renderer would not have helped. Both halves are
 * pinned below.
 */

vi.mock('react-dom', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  useFormStatus: (await import('./support/form-status.js')).formStatus,
}));

/** A submit button of the shape a confirmation page would use. */
function Submit() {
  const { pending } = useFormStatus();
  return createElement(
    'button',
    { type: 'submit', disabled: pending },
    pending ? 'Archiving...' : 'Archive it',
  );
}

beforeEach(() => {
  // Module state. A test that threw half way through would otherwise leak
  // `pending: true` into a neighbour, and the failure would surface in a file
  // that never mentions forms.
  resetPending();
});

describe('the walker, once the hook is mocked', () => {
  it('calls a client component instead of throwing', async () => {
    const r = await rendered(createElement('form', {}, createElement(Submit, {})));
    expect(r.text).toContain('Archive it');
  });

  it('reaches the state that only exists mid-submission', async () => {
    setPending(true);
    const r = await rendered(createElement('form', {}, createElement(Submit, {})));
    expect(r.text).toContain('Archiving');
    expect(r.text).not.toContain('Archive it');
  });

  it('is idle again for the next test', async () => {
    const r = await rendered(createElement('form', {}, createElement(Submit, {})));
    expect(r.text).toContain('Archive it');
  });
});

describe('why the mock exists, pinned rather than argued in prose', () => {
  it('a real server render reports a form that is not pending', async () => {
    /**
     * The load-bearing fact, and the reason mocking is not a shortcut around a
     * weak harness. `useFormStatus` is a **client runtime** state: it becomes
     * true after hydration, when a submission is in flight. React's own server
     * renderer reports `false`, so replacing this project's walker with
     * `react-dom/server` would have cost 36 files and still rendered exactly one
     * of the two states — never the one worth asserting.
     *
     * The **real** hook, taken past this file's mock with `importActual`,
     * because the claim under test is about React and not about the double.
     *
     * This is a tripwire as much as a test. If React ever lets a server render
     * report a pending form, it fails — and the mock stops being the only
     * route, which is worth being told rather than discovering years later.
     */
    const actual = await vi.importActual<{ useFormStatus: () => { pending: boolean } }>('react-dom');
    function Probe() {
      return createElement('span', {}, `pending=${String(actual.useFormStatus().pending)}`);
    }
    const html = renderToStaticMarkup(createElement('form', {}, createElement(Probe, {})));
    expect(html).toContain('pending=false');
  });
});
