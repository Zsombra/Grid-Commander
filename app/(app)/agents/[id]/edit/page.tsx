import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { AgentEditForm } from '@/presentation/components/agent-edit.js';
import { requiredText } from '@/presentation/form.js';

/**
 * Edit the fields the agent owns.
 *
 * This page existed as a link for the whole life of the project and as a route
 * for none of it — `isEditable(agent)` rendered an "Edit" affordance pointing at
 * a 404. See `five-dead-links`.
 *
 * Scope is deliberately the agent-owned fields the domain already validates.
 * The trading-config section belongs to `agent-edit-form`, which stays open, and
 * is harder than it looks: three of BattleGrid's tradingConfig keys come back on
 * read and are rejected on write, and a position-management preset is a label
 * supplied alongside fourteen independent values rather than a shorthand for
 * them. Shipping a half-built config editor here would be worse than shipping
 * none.
 */
export default async function EditAgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { problem } = await searchParams;
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
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Edit {agent.displayName}</h1>
      <AgentEditForm agent={agent} action={updateAgent} problem={problem} />
    </main>
  );
}

/**
 * The four outcomes are rendered as four outcomes.
 *
 * `rejected` and `invalid` both name the fields at fault, and neither is a
 * generic failure: one means the field belongs to the strategy, the other that
 * the value is outside what the platform accepts. Collapsing them into "that
 * did not work" would leave the user guessing which of their inputs to change.
 */
export async function updateAgent(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const changes = { displayName: requiredText(formData, 'displayName') };

  // Propose first: the guard needs a confirmation bound to this agent, and the
  // thing that performs the write must not be the thing that authorises it.
  const proposed = await app.describeEdit.execute({ ...user.authority, agentId, changes });
  if (proposed.kind !== 'proposal') {
    const why =
      'reason' in proposed
        ? proposed.reason
        : proposed.rejected.map((r) => r.reason).join(' ');
    redirect(`/agents/${agentId}/edit?problem=${encodeURIComponent(why)}`);
  }

  const result = await app.updateAgent.execute({
    ...user.authority,
    agentId,
    changes,
    confirmationToken: proposed.proposal.confirmationToken,
  });

  if (result.kind === 'updated') redirect(`/agents/${agentId}`);

  const reasons =
    result.kind === 'rejected'
      ? result.rejected.map((r) => `${r.field}: ${r.reason}`)
      : result.kind === 'invalid'
        ? result.issues.map((i) => `${i.field}: ${i.reason}`)
        : [result.reason];

  redirect(`/agents/${agentId}/edit?problem=${encodeURIComponent(reasons.join(' · '))}`);
}
