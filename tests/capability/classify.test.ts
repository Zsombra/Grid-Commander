import { describe, expect, it } from 'vitest';
import {
  buildClassificationMap,
  classifyDegraded,
  classifyTool,
  degradedAllowlist,
} from '@/domain/capability/classify.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';

const tool = (name: string, annotations?: DiscoveredTool['annotations']): DiscoveredTool =>
  annotations === undefined ? { name } : { name, annotations };

describe('classifyTool', () => {
  it('reads a read-only tool from its annotations', () => {
    const c = classifyTool(tool('get_account_state', { readOnlyHint: true }));
    expect(c.mutating).toBe(false);
    expect(c.destructive).toBe(false);
    expect(c.basis).toBe('annotations');
  });

  it('reads a mutating, non-destructive tool from its annotations', () => {
    const c = classifyTool(
      tool('create_intelligence_agent', { readOnlyHint: false, destructiveHint: false }),
    );
    expect(c.mutating).toBe(true);
    expect(c.destructive).toBe(false);
  });

  it('reads a destructive tool from its annotations', () => {
    const c = classifyTool(
      tool('rebind_intelligence_agent', { readOnlyHint: false, destructiveHint: true }),
    );
    expect(c.mutating).toBe(true);
    expect(c.destructive).toBe(true);
  });

  /** R6 — the scenario the whole classification layer exists for. */
  describe('unknown_is_destructive', () => {
    it('treats an undiscovered tool as destructive', () => {
      const c = classifyTool(undefined);
      expect(c.mutating).toBe(true);
      expect(c.destructive).toBe(true);
      expect(c.basis).toBe('unknown');
    });

    it('treats a tool with no annotations at all as destructive', () => {
      const c = classifyTool(tool('something_new'));
      expect(c.destructive).toBe(true);
      expect(c.basis).toBe('unknown');
    });

    it('treats a tool whose readOnlyHint is absent as destructive', () => {
      const c = classifyTool(tool('something_new', { idempotentHint: true }));
      expect(c.destructive).toBe(true);
      expect(c.basis).toBe('unknown');
    });

    it('assumes destructive when a mutating tool omits destructiveHint', () => {
      const c = classifyTool(tool('mutates_somehow', { readOnlyHint: false }));
      expect(c.mutating).toBe(true);
      expect(c.destructive).toBe(true);
    });
  });

  it('never calls a read-only tool destructive, even if the server says so', () => {
    // destructiveHint is only meaningful for a mutating tool. A read that
    // claims to be destructive is a server bug, not a reason to block a read.
    const c = classifyTool(tool('get_thing', { readOnlyHint: true, destructiveHint: true }));
    expect(c.mutating).toBe(false);
    expect(c.destructive).toBe(false);
  });

  it('honours a declared scope over the inferred one', () => {
    const c = classifyTool({
      name: 'submit_market_grid',
      annotations: { readOnlyHint: false, destructiveHint: false },
      declaredScope: 'mcp:wager',
    });
    expect(c.requiredScope).toBe('mcp:wager');
  });

  it('does not infer wager scope for an ordinary mutating tool', () => {
    // Most mutating BattleGrid tools run on read scope. Guessing wager would
    // make the product refuse work it is entitled to do.
    const c = classifyTool(tool('update_intelligence_agent', { readOnlyHint: false }));
    expect(c.requiredScope).toBe('mcp:read');
  });
});

describe('buildClassificationMap', () => {
  it('classifies every discovered tool', () => {
    const map = buildClassificationMap([
      tool('a', { readOnlyHint: true }),
      tool('b', { readOnlyHint: false, destructiveHint: true }),
    ]);
    expect(map.get('a')?.mutating).toBe(false);
    expect(map.get('b')?.destructive).toBe(true);
  });

  it('returns nothing for a name it never saw, so the caller must fail closed', () => {
    const map = buildClassificationMap([tool('a', { readOnlyHint: true })]);
    expect(map.get('b')).toBeUndefined();
    expect(classifyTool(map.get('b') ? undefined : undefined).destructive).toBe(true);
  });
});

describe('classifyDegraded', () => {
  it('permits an allowlisted getter', () => {
    const c = classifyDegraded('get_account_state');
    expect(c.mutating).toBe(false);
    expect(c.basis).toBe('degraded-allowlist');
  });

  it('refuses everything not on the allowlist', () => {
    for (const name of ['create_intelligence_agent', 'apply_strategy_plan', 'anything_at_all']) {
      expect(classifyDegraded(name).destructive).toBe(true);
    }
  });

  /**
   * The allowlist is a declared exception to policy P2, permitted only because
   * it can deny and never grant. If a mutating tool ever appears on it, the
   * exception stops being safe.
   */
  it('contains only tools it classifies as non-mutating', () => {
    for (const name of degradedAllowlist()) {
      expect(classifyDegraded(name).mutating).toBe(false);
    }
  });

  it('is small enough to audit by eye', () => {
    expect(degradedAllowlist().length).toBeLessThanOrEqual(10);
  });
});
