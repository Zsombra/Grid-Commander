import { describe, expect, it } from 'vitest';
import UnanticipatedFailure from '../../app/error.js';
import RootFailure from '../../app/global-error.js';
import { rendered } from './support/render.js';

/**
 * The floor under every route (#236).
 *
 * The property that matters most is a *negative* one: no control retries. It
 * is asserted by walking the tree for any prop holding the `reset` callback
 * itself — not for a spelling of the word — so a "Reload" button wired to
 * `reset` fails exactly as a "Try again" one would (the synonym-mutation
 * lens from the 2026-08-14 journal).
 */

const SECRET = 'ECONNREFUSED postgres://internal:5432 at DrizzleAuditRepository.begin';

function boundaryProps(digest?: string) {
  const error = Object.assign(new Error(SECRET), digest ? { digest } : {});
  let resetCalled = false;
  const reset = () => {
    resetCalled = true;
  };
  return { error, reset, wasCalled: () => resetCalled };
}

/** Every prop value on every element in the tree, flattened. */
function allPropValues(node: unknown, out: unknown[] = []): unknown[] {
  if (Array.isArray(node)) {
    for (const child of node) allPropValues(child, out);
    return out;
  }
  if (typeof node !== 'object' || node === null) return out;
  const props = (node as { props?: Record<string, unknown> | null }).props;
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k !== 'children') out.push(v);
      else allPropValues(v, out);
    }
  }
  return out;
}

describe('the floor says what is known, and no more', () => {
  it('names the unanticipated failure and the unknown outcome', async () => {
    const { error, reset } = boundaryProps();
    const r = await rendered(UnanticipatedFailure({ error, reset }));
    expect(r.headings[0]).toBe('Something failed that we did not anticipate');
    expect(r.text).toMatch(/nothing on this page can tell you whether your last action landed/i);
  });

  it('points at the activity log as the record that can answer', async () => {
    const { error, reset } = boundaryProps();
    const r = await rendered(UnanticipatedFailure({ error, reset }));
    expect(r.links).toContain('/audit');
    expect(r.text).toMatch(/activity log/i);
  });

  it('offers no control wired to reset, under any label', () => {
    const { error, reset } = boundaryProps();
    const tree = UnanticipatedFailure({ error, reset });
    // The idiom, not the spelling: no prop anywhere in the tree may hold the
    // reset callback. A retry control renamed "Reload" still fails here.
    expect(allPropValues(tree)).not.toContain(reset);
  });

  it('shows the digest and never the raw message', async () => {
    const { error, reset } = boundaryProps('gc-digest-abc123');
    const r = await rendered(UnanticipatedFailure({ error, reset }));
    expect(r.text).toContain('gc-digest-abc123');
    expect(r.text).not.toContain(SECRET);
    expect(r.text).not.toContain('DrizzleAuditRepository');
  });

  it('renders no dangling reference sentence when there is no digest', async () => {
    const { error, reset } = boundaryProps();
    const r = await rendered(UnanticipatedFailure({ error, reset }));
    expect(r.text).not.toMatch(/names the failure/i);
  });
});

describe('the floor under the root layout', () => {
  it('supplies its own document and keeps the same posture', async () => {
    const { error, reset } = boundaryProps('gc-digest-root');
    const tree = RootFailure({ error, reset });
    expect((tree as { type?: unknown }).type).toBe('html');

    const r = await rendered(tree);
    expect(r.text).toMatch(/did not anticipate/i);
    expect(r.text).toMatch(/whether your last action landed/i);
    expect(r.links).toContain('/audit');
    expect(r.text).toContain('gc-digest-root');
    expect(r.text).not.toContain(SECRET);
    expect(allPropValues(RootFailure({ error, reset }))).not.toContain(reset);
  });
});

describe('the floor sits where it covers every route', () => {
  // Existence at the exact level is the one thing the component tests cannot
  // see: they import what they are pointed at, wherever it lives. The failure
  // mode is the boundary at `app/(app)/error.tsx`, covering less than every
  // route (design decision: one boundary at `app/`).
  it('both files exist at the app root and are client components', async () => {
    const { readFileSync } = await import('node:fs');
    for (const p of ['app/error.tsx', 'app/global-error.tsx']) {
      const src = readFileSync(p, 'utf8');
      expect(src.startsWith("'use client'"), `${p} must open with 'use client'`).toBe(true);
    }
  });
});
