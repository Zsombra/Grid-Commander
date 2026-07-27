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
