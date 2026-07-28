import { describe, expect, it } from 'vitest';
import { DescribeGrantQuery } from '@/application/use-cases/describe-grant.query.js';
import { describeScope, REQUESTED_SCOPES } from '@/domain/connection/scope.js';

const grant = () => new DescribeGrantQuery().execute();

describe('DescribeGrantQuery', () => {
  /** R4 — the access must be described as what it is. */
  describe('names_configuration_authority', () => {
    it('says the access can create and change agents and strategies', () => {
      const text = grant().permissions.join(' ').toLowerCase();
      expect(text).toContain('create');
      expect(text).toContain('change');
      expect(text).toMatch(/agent/);
      expect(text).toMatch(/strateg/);
    });

    it('distinguishes it from committing funds, which is not requested', () => {
      const g = grant();
      expect(g.scopes).not.toContain('mcp:wager');
      expect(g.notRequested.join(' ').toLowerCase()).toContain('funds');
    });
  });

  /**
   * R4 — the prohibition, stated as a test.
   *
   * mcp:read can rebind an agent's entire configuration. Calling it read-only
   * in a consent screen would be untrue at the moment the user is deciding
   * whether to trust us. If this test is ever softened to let friendlier
   * wording through, that is a spec violation rather than a copy change.
   */
  describe('never_says_read_only', () => {
    const forbidden = [/read[-\s]?only/i, /view[-\s]?only/i, /just\s+read/i, /only\s+read/i];

    it('does not describe the granted access as read-only or view-only', () => {
      const text = grant().permissions.join(' ');
      for (const pattern of forbidden) expect(text).not.toMatch(pattern);
    });

    it('holds for every scope description, not only the ones we request', () => {
      for (const scope of ['mcp:read', 'mcp:wager'] as const) {
        const text = describeScope(scope);
        for (const pattern of forbidden) expect(text).not.toMatch(pattern);
      }
    });
  });

  it('describes exactly the scopes being requested', () => {
    expect(grant().scopes).toEqual(REQUESTED_SCOPES);
  });
});
