import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A write with no confirmation to spend carries a dedupe key instead.
 *
 * Fourteen of the product's eighteen perform submits spend a single-use
 * `confirmationToken`, so a second press is refused by `consume`. Four do not,
 * and they are not equally safe:
 *
 * - `restore` sets `active: true` again — idempotent.
 * - `connect` mints a fresh OAuth state and redirects — no effect to repeat.
 * - `fork` is deduped by BattleGrid on a name collision. **Measured**, twice
 *   over — with a name and with the name omitted, which is the default path
 *   since the field is optional. The second call returns INTERNAL_ERROR.
 * - `create` has no confirmation, no natural idempotence, and no measured
 *   platform guard. It is the one that needed something.
 *
 * BattleGrid's own answer for it is `idempotencyKey`, whose live schema reads:
 * *"A retry with the same key returns the original result rather than repeating
 * the command."* Grid-Commander had it plumbed end to end — command, ports,
 * adapter, and a unique index on (userId, idempotencyKey) — and passed nothing,
 * so the index saw NULL, which Postgres does not dedupe.
 *
 * This is a scan rather than a rendering test because the defect it guards is
 * an *absence*: the create path worked perfectly without the key, and would
 * again. A second create surface added later would inherit the same silence,
 * which is exactly how this one lasted.
 */

const FORM = 'src/presentation/components/agent-form.tsx';
const PAGE = 'app/(app)/agents/new/page.tsx';
// The action module the page imports its create from, since
// `the-build-checks-what-next-generates` — the split is the point here:
// the page mints, the action only reads.
const ACTION = 'app/(app)/agents/new/actions.ts';

const read = (p: string): string => readFileSync(p, 'utf8');

describe('a create carries a dedupe key', () => {
  it('renders the key as a hidden input, so a resubmit sends the same one', () => {
    expect(read(FORM)).toMatch(
      /<input\s+type="hidden"\s+name="idempotencyKey"\s+value=\{idempotencyKey\}/,
    );
  });

  it('requires the key as a prop rather than defaulting it', () => {
    // Optional would let a second create surface ship without one and still
    // typecheck — which is the whole failure mode being guarded.
    const src = read(FORM);
    expect(src).toMatch(/\bidempotencyKey:\s*string;/);
    expect(src, 'an optional key is not a guarantee').not.toMatch(
      /\bidempotencyKey\?:\s*string/,
    );
  });

  it('mints the key where the form is rendered, not where it is submitted', () => {
    // The load-bearing detail. A key minted inside the server action is a new
    // key on every press: it would satisfy the type, pass every other check
    // here, and dedupe nothing at all.
    const page = read(PAGE);
    expect(page).toMatch(/import\s*\{\s*randomUUID\s*\}\s*from\s*'node:crypto'/);
    expect(page).toMatch(/idempotencyKey=\{randomUUID\(\)\}/);

    const action = read(ACTION);
    expect(action, 'the action must read the key, never mint one').not.toMatch(/randomUUID\(/);
    expect(action).toMatch(/idempotencyKey:\s*optionalText\(formData,\s*'idempotencyKey'\)/);
  });

  it('finds the files it is checking', () => {
    // Vacuity: a rename would make every assertion above pass by matching
    // nothing at all, which is the failure mode this repo has hit twice.
    expect(read(FORM).length).toBeGreaterThan(0);
    expect(read(PAGE)).toContain('<AgentForm');
    expect(read(ACTION)).toContain('createAgent.execute');
  });
});
