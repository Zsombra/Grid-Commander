import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { AgentActions } from '@/presentation/components/agent-actions.js';
import { AgentRenameForm } from '@/presentation/components/agent-edit.js';
import { MoneySummary } from '@/presentation/components/money-summary.js';
import { AgentRecord } from '@/presentation/components/record.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { requiredText } from '@/presentation/form.js';

/**
 * One agent: what it is, what it inherits, and what may be done to it.
 *
 * The inherited configuration is shown as inherited and is not editable here —
 * the platform does not permit it, and presenting a field the platform will
 * refuse is worse than not offering it.
 */
export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { problem } = await searchParams;
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

      {/**
       * How it has done, from the block the roster payload already carried and
       * this product discarded on every load. Null means the record was absent,
       * which the component never sees — an agent that has played nothing
       * reports a record full of zeroes and says so in its own words.
       */}
      {agent.performance && <AgentRecord performance={agent.performance} />}

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
          {/*
            "configured" used to mean `tradingConfig != null` — that an object
            came back, not that limits were set. The live agent carries a full
            twenty-field config in which two of three caps are zero, which
            BattleGrid reads as no cap, and this line called it configured.
          */}
          Money limits: <MoneySummary agent={agent} />
        </p>
      </section>

      {problem ? (
        <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-3 text-sm text-text-primary">
          {problem}
        </p>
      ) : null}

      <AgentRenameForm agent={agent} action={rename} />

      <AgentActions agent={agent} />
    </main>
  );
}

/**
 * Rename an agent — propose, then perform.
 *
 * Two calls, not one, and the first is not ceremony. BattleGrid marks
 * `update_intelligence_agent` destructive, so the guard demands a confirmation
 * bound to this agent. `describeEdit` mints it alongside the sentence naming
 * what will change; `updateAgent` consumes it. Nothing here issues a token to
 * itself.
 *
 * This action used to `await` the update and throw the result away, then
 * redirect. Every refusal — archived agent, rejected field, and the missing
 * confirmation that made all of them moot — arrived as a page that simply
 * reloaded with the old name. The operator had no way to tell a refusal from
 * being ignored.
 */
export async function rename(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const changes = { displayName: requiredText(formData, 'displayName') };

  const proposed = await app.describeEdit.execute({ ...user.authority, agentId, changes });
  if (proposed.kind !== 'proposal') {
    redirect(`/agents/${agentId}?problem=${encodeURIComponent(reasonOf(proposed))}`);
  }

  const result = await app.updateAgent.execute({
    ...user.authority,
    agentId,
    changes,
    confirmationToken: proposed.proposal.confirmationToken,
  });

  if (result.kind === 'updated') redirect(`/agents/${agentId}`);
  redirect(`/agents/${agentId}?problem=${encodeURIComponent(reasonOf(result))}`);
}

/** The reason an operation gave, rather than a generic failure. */
function reasonOf(
  result:
    | { kind: 'not-editable'; reason: string }
    | { kind: 'no-op'; reason: string }
    | { kind: 'rejected'; rejected: readonly { field: string; reason: string }[] }
    | { kind: 'invalid'; issues: readonly { field: string; reason: string }[] }
    | { kind: string },
): string {
  if ('reason' in result && typeof result.reason === 'string') return result.reason;
  if ('rejected' in result) return result.rejected.map((r) => r.reason).join(' ');
  if ('issues' in result) return result.issues.map((i) => i.reason).join(' ');
  return 'That change could not be made.';
}
