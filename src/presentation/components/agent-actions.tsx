import type { Agent } from '@/domain/agent/agent.js';
import { isArchivable, isEditable, isReactivatable, isRebindable } from '@/domain/agent/agent.js';

/**
 * What a user may do to an agent.
 *
 * Every affordance here is gated by what BattleGrid says about *this* agent.
 * There is no delete action and there will not be one: the live payload sets
 * `capabilities.canDelete: true` while the MCP surface offers no delete tool —
 * the flag describes what BattleGrid's own app can do, not this client. Adding
 * the button would ship an action that cannot work. See findings-agents F-1.
 */
export function AgentActions({ agent }: { agent: Agent }) {
  const actions: Array<{ href: string; label: string }> = [];

  if (isEditable(agent)) {
    actions.push({ href: `/agents/${agent.id}/edit`, label: 'Edit' });
  }
  if (isRebindable(agent)) {
    actions.push({ href: `/agents/${agent.id}/rebind`, label: 'Rebind to another strategy' });
  }
  if (isArchivable(agent)) {
    actions.push({ href: `/agents/${agent.id}/archive`, label: 'Archive' });
  }
  if (isReactivatable(agent)) {
    actions.push({ href: `/agents/${agent.id}/reactivate`, label: 'Reactivate' });
  }

  /**
   * Reading an agent is always offered, whatever its state.
   *
   * The four above are gated on what BattleGrid permits for *this* agent. These
   * three are not: an archived agent cannot be edited and its reasoning is still
   * worth reading — arguably more so, since "why did it do that before I retired
   * it" is the question archiving prompts.
   *
   * `thinking` and `limits` were built and linked from nowhere. Twenty routes,
   * and the only two an orphan check found were the two added the same
   * afternoon. That is `close-the-reachability-gap` mirrored: it fixed links
   * pointing at nothing, and this was a page nothing pointed at.
   */
  actions.push({ href: `/agents/${agent.id}/thinking`, label: 'What it decided' });
  actions.push({ href: `/agents/${agent.id}/trades`, label: 'What it did with the money' });
  actions.push({ href: `/agents/${agent.id}/pipeline`, label: "Why it did or didn't trade" });
  // The prospective sibling of the line above: the same gates, asked about now
  // rather than read off what already happened.
  actions.push({ href: `/agents/${agent.id}/qualification`, label: 'Would it take a coin' });
  actions.push({ href: `/agents/${agent.id}/limits`, label: 'What would stop it' });
  actions.push({ href: `/agents/${agent.id}/journal`, label: 'Journal' });

  return (
    <nav aria-label={`Actions for ${agent.displayName}`} className="mt-3">
      <ul className="flex flex-wrap gap-3 text-sm">
        {actions.map((a) => (
          <li key={a.href}>
            <a href={a.href} className="underline">
              {a.label}
            </a>
          </li>
        ))}
      </ul>
      {!isEditable(agent) && agent.status === 'ACTIVE' && (
        <p className="mt-2 text-xs">
          BattleGrid does not permit Grid-Commander to change this agent.
        </p>
      )}
    </nav>
  );
}
