import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { AgentActions } from '@/presentation/components/agent-actions.js';
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
