import { describe, expect, it } from 'vitest';
import { CapabilityCache, type DiscoverySource } from '@/infrastructure/battlegrid/capability-cache.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';

const source = (tools: readonly DiscoveredTool[]): DiscoverySource => ({
  discoverTools: async () => tools,
});

const failing: DiscoverySource = {
  discoverTools: async () => {
    throw new Error('tools/list unavailable');
  },
};

describe('CapabilityCache', () => {
  /** R5 — discovery happens at session start, from the live connection. */
  it('discovers_at_session_start', async () => {
    const view = await new CapabilityCache(
      source([{ name: 'get_account_state', annotations: { readOnlyHint: true } }]),
    ).load('at');
    expect(view.degraded).toBe(false);
    expect(view.classify('get_account_state').mutating).toBe(false);
  });

  /** R5 — a changed platform governs this session. */
  it('new_set_governs: a tool that has disappeared becomes unknown', async () => {
    const cache = new CapabilityCache(
      source([{ name: 'old_tool', annotations: { readOnlyHint: true } }]),
    );
    await cache.load('at');
    expect(cache.view().classify('old_tool').mutating).toBe(false);

    // Next session, the platform no longer offers it.
    const next = new CapabilityCache(source([{ name: 'new_tool', annotations: { readOnlyHint: true } }]));
    const view = await next.load('at');
    expect(view.classify('old_tool').basis).toBe('unknown');
    expect(view.classify('old_tool').destructive).toBe(true);
    expect(view.classify('new_tool').mutating).toBe(false);
  });

  it('classifies an undiscovered name as destructive even when discovery succeeded', async () => {
    const view = await new CapabilityCache(
      source([{ name: 'known', annotations: { readOnlyHint: true } }]),
    ).load('at');
    expect(view.classify('never_seen').destructive).toBe(true);
  });

  /** R5 — discovery failure degrades rather than breaks. */
  describe('degrades_to_readonly', () => {
    it('does not throw when discovery fails', async () => {
      const view = await new CapabilityCache(failing).load('at');
      expect(view.degraded).toBe(true);
    });

    it('still permits an allowlisted read', async () => {
      const view = await new CapabilityCache(failing).load('at');
      expect(view.classify('get_account_state').mutating).toBe(false);
    });

    it('refuses everything else', async () => {
      const view = await new CapabilityCache(failing).load('at');
      expect(view.classify('create_intelligence_agent').destructive).toBe(true);
      expect(view.classify('apply_strategy_plan').destructive).toBe(true);
    });
  });

  it('reports degraded before any load has happened', () => {
    expect(new CapabilityCache(failing).view().degraded).toBe(true);
  });
});
