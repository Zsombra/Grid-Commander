import { describe, expect, it } from 'vitest';
import { CANNOT_CHANGE_ANYTHING, isReachable, readOnlyToolset } from '@/domain/assistant/toolset.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';

/** Shaped from the real `tools/list`, including the three interesting cases. */
const DISCOVERED: readonly DiscoveredTool[] = [
  { name: 'list_intelligence_agents', annotations: { readOnlyHint: true } },
  { name: 'list_strategies', annotations: { readOnlyHint: true } },
  { name: 'get_agent_journal', annotations: { readOnlyHint: true } },
  // Mutates on mcp:read — the class that makes scope useless as a boundary.
  { name: 'create_intelligence_agent', annotations: { readOnlyHint: false } },
  { name: 'rebind_intelligence_agent', annotations: { readOnlyHint: false, destructiveHint: true } },
  // Spends.
  { name: 'submit_agent_grid', annotations: { readOnlyHint: false, destructiveHint: true } },
  // The server said nothing.
  { name: 'some_new_tool' },
  { name: 'another_new_tool', annotations: {} },
];

/**
 * A-A. Read-only here is a filtered toolset, not an instruction.
 *
 * A model told not to write is a model that will not write until something in
 * its context suggests otherwise — including text it just read out of a strategy
 * field a user typed into. So it is never given the tool.
 */
describe('the assistant is handed only tools that read', () => {
  const toolset = readOnlyToolset(DISCOVERED);

  it('keeps the read-only tools', () => {
    expect(toolset.tools.map((t) => t.name)).toEqual([
      'list_intelligence_agents',
      'list_strategies',
      'get_agent_journal',
    ]);
  });

  it('excludes every mutating tool, destructive or not', () => {
    for (const name of ['create_intelligence_agent', 'rebind_intelligence_agent', 'submit_agent_grid']) {
      expect(isReachable(toolset, name), `${name} must be unreachable`).toBe(false);
    }
  });

  /**
   * "The server told us nothing" is not "the server told us it is safe" — the
   * same reading `classifyTool` takes everywhere else in the product.
   */
  it('excludes a tool whose effect the platform did not state', () => {
    expect(isReachable(toolset, 'some_new_tool')).toBe(false);
    expect(isReachable(toolset, 'another_new_tool')).toBe(false);
    expect(toolset.excluded.filter((e) => e.because === 'unknown-effect')).toHaveLength(2);
  });

  it('says why each tool was excluded, so the assistant can explain itself', () => {
    const byName = new Map(toolset.excluded.map((e) => [e.name, e.because]));
    expect(byName.get('rebind_intelligence_agent')).toBe('mutates');
    expect(byName.get('some_new_tool')).toBe('unknown-effect');
  });

  it('excludes everything when the platform describes nothing', () => {
    // A deployment that changed every annotation must not open the assistant up.
    const blind = readOnlyToolset([{ name: 'a' }, { name: 'b' }]);
    expect(blind.tools).toEqual([]);
    expect(blind.excluded).toHaveLength(2);
  });

  it('holds nothing when there is nothing to hold', () => {
    expect(readOnlyToolset([]).tools).toEqual([]);
  });

  /**
   * The property the whole capability rests on, stated as one assertion: no tool
   * the guard sequence would classify as mutating can appear in the set.
   */
  it('has no overlap with the mutating half of the surface', () => {
    const mutating = DISCOVERED.filter((t) => t.annotations?.readOnlyHint === false).map((t) => t.name);
    const reachable = toolset.tools.map((t) => t.name);
    expect(reachable.filter((n) => mutating.includes(n))).toEqual([]);
  });
});

/**
 * The filter narrows *which* tools survive. It must not narrow what is known
 * about the ones that do — an implementation that has to call a tool needs the
 * server's argument schema, and it has no other route to it.
 */
describe('what survives the filter about each tool', () => {
  it('carries the argument schema through', () => {
    const [tool] = readOnlyToolset([
      {
        name: 'get_agent_journal',
        annotations: { readOnlyHint: true },
        inputSchema: { type: 'object', properties: { agent_id: { type: 'string' } } },
      },
    ]).tools;

    // Dropped, this left the assistant guessing argument names for every tool
    // on the surface, and every miss arrived as a failed read.
    expect(tool?.inputSchema).toEqual({
      type: 'object',
      properties: { agent_id: { type: 'string' } },
    });
  });

  it('keeps a read-only tool that reported no schema', () => {
    // The safety decision is made from the annotations. A missing schema is a
    // gap in what we can tell a caller, not a reason to withhold the tool.
    const { tools } = readOnlyToolset([{ name: 'list_strategies', annotations: { readOnlyHint: true } }]);
    expect(tools.map((t) => t.name)).toEqual(['list_strategies']);
    expect(tools[0]?.inputSchema).toBeUndefined();
  });
});

describe('what the assistant says when asked to act', () => {
  it('explains that it cannot, and where the change can be made', () => {
    expect(CANNOT_CHANGE_ANYTHING).toMatch(/only read/i);
    expect(CANNOT_CHANGE_ANYTHING).toMatch(/even if you ask/i);
    // Not a dead end: it points at the surfaces that can.
    expect(CANNOT_CHANGE_ANYTHING).toMatch(/compile → review → apply/);
  });
});
