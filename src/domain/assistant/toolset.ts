import { classifyTool } from '../capability/classify.js';
import type { DiscoveredTool } from '../capability/tool-class.js';

/**
 * What the assistant is allowed to reach.
 *
 * Read-only here is a **filtered toolset, not an instruction**. A model told not
 * to write is a model that will not write until something in its context
 * suggests otherwise — a user asking firmly, a tool description that reads like
 * an invitation, or text the model just read out of a strategy field a user
 * typed into. The third is not exotic; it is a supported feature.
 *
 * So the assistant is never given a mutating tool. The decision is made by the
 * same `classifyTool` the guard sequence uses, from the server's own annotations,
 * per session — which means a tool that changes under a deployment changes here
 * too, and a tool the server says nothing about is excluded rather than guessed
 * at. See design A-A.
 */

export interface ReadOnlyTool {
  readonly name: string;
  readonly description: string | undefined;
}

export interface ReadOnlyToolset {
  readonly tools: readonly ReadOnlyTool[];
  /** Named so the assistant can say what it cannot do rather than attempting it. */
  readonly excluded: readonly ExcludedTool[];
}

export interface ExcludedTool {
  readonly name: string;
  readonly because: 'mutates' | 'unknown-effect';
}

/**
 * Narrow a discovered tool list to the ones that only read.
 *
 * The only way an assistant toolset is constructed. A caller assembling its own
 * list would make the guarantee a convention, and conventions are what this
 * whole product exists not to rely on.
 */
export function readOnlyToolset(discovered: readonly DiscoveredTool[]): ReadOnlyToolset {
  const tools: ReadOnlyTool[] = [];
  const excluded: ExcludedTool[] = [];

  for (const tool of discovered) {
    const classification = classifyTool(tool);

    if (classification.basis !== 'annotations') {
      // The server told us nothing about this tool. That is not the same as
      // telling us it is safe — the same reading `classifyTool` takes.
      excluded.push({ name: tool.name, because: 'unknown-effect' });
      continue;
    }
    if (classification.mutating) {
      excluded.push({ name: tool.name, because: 'mutates' });
      continue;
    }

    tools.push({ name: tool.name, description: tool.description });
  }

  return { tools, excluded };
}

/**
 * Whether a name is reachable by the assistant.
 *
 * Used to refuse a call the model asked for that is not in its set — which
 * should be impossible, and is checked anyway, because "impossible" here rests
 * on a model honouring the list it was handed.
 */
export function isReachable(toolset: ReadOnlyToolset, name: string): boolean {
  return toolset.tools.some((t) => t.name === name);
}

/** What the assistant says when asked to do something it cannot. */
export const CANNOT_CHANGE_ANYTHING =
  'I can only read your BattleGrid account — I have no way to change anything, ' +
  'even if you ask me to. Agents are changed from the agent pages and strategies ' +
  'through compile → review → apply, where you see what a change would do before ' +
  'it happens.';
