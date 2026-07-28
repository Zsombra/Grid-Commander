import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { AgentActions } from '@/presentation/components/agent-actions.js';
import { isEditable } from '@/domain/agent/agent.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { requiredText } from '@/presentation/form.js';

/**
 * One agent: what it is, what it inherits, and what may be done to it.
 *
 * The inherited configuration is shown as inherited and is not editable here —
 * the platform does not permit it, and presenting a field the platform will
 * refuse is worse than not offering it.
 */
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { roster } = await app.listAgents.execute(user.authority);

  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        <p role="alert" className="text-sm">{roster.reason}</p>
      </main>
    );
  }

  const agent = roster.kind === 'agents' ? roster.agents.find((a) => a.id === id) : undefined;
  if (!agent) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such agent</h1>
        <p className="text-sm">
          <a href="/agents" className="underline">Back to your agents</a>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">{agent.displayName}</h1>
        <p className="text-sm">{agent.status}</p>
      </div>

      <section className="space-y-1">
        <h2 className="font-medium">Inherited from its strategy</h2>
        <p className="text-sm">
          {agent.binding.strategyName} at revision {agent.binding.strategyRevision}. Its
          context sources, signal rules, prose and timeframe come from there and are
          changed by editing that strategy, or by rebinding — which replaces all of
          them.
        </p>
      </section>

      <section className="space-y-1">
        <h2 className="font-medium">Owned by the agent</h2>
        <p className="text-sm">
          Brain:{' '}
          {agent.brain.kind === 'preset' ? agent.brain.preset : agent.brain.modelId}
        </p>
        <p className="text-sm">
          Money limits: {agent.tradingConfig ? 'configured' : 'not configured'}
        </p>
      </section>

      {/*
        Renaming is the one agent-owned field editable from this page. The rest
        live behind /edit. Gated on `isEditable` for the same reason every other
        affordance is: offering an action BattleGrid will refuse is worse than
        not offering it.
      */}
      {isEditable(agent) && (
        <form action={rename} className="space-y-2">
          <input type="hidden" name="agentId" value={agent.id} />
          <label htmlFor="displayName" className="block text-sm font-medium">
            Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            defaultValue={agent.displayName}
            maxLength={80}
            required
            className="w-full rounded border p-2"
          />
          <button type="submit" className="rounded border px-4 py-2 text-sm">
            Rename
          </button>
        </form>
      )}

      <AgentActions agent={agent} />
    </main>
  );
}

export async function rename(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  await app.updateAgent.execute({
    ...user.authority,
    agentId,
    changes: { displayName: requiredText(formData, 'displayName') },
  });
  redirect(`/agents/${agentId}`);
}
