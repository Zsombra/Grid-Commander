import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';

/**
 * Undeploying: the act that stops an agent scanning one market.
 *
 * The coin is a path segment, not a query — the deployment being removed is
 * the thing this page is about. Destructive on the platform
 * (`delete_radar_deployment`), reversible in substance: the agent stays
 * configured and can be redeployed, and the consequence says exactly that.
 * The describe reads the radar fresh, so the deployment it names and the
 * revision it carries are the platform's now, not a memory.
 */
export default async function UndeployPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; coin: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id, coin } = await params;
  const { problem } = await searchParams;

  const { roster } = await app.listAgents.execute(user.authority);
  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        <p role="alert" className="text-sm">{roster.reason}</p>
        <WhyNotLoaded cause={roster.cause} subject="this agent is" />
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

  const result = await app.describeUndeploy.execute({
    ...user.authority,
    agentId: agent.id,
    agentName: agent.displayName,
    coinId: decodeURIComponent(coin),
  });

  if (result.kind !== 'proposal') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot undeploy</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        <p className="text-sm">
          <a href={`/agents/${agent.id}`} className="underline">Back to the agent</a>
        </p>
      </main>
    );
  }

  const { proposal } = result;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">
        Remove {agent.displayName} from {proposal.coinId}?
      </h1>
      {problem ? (
        <p role="alert" className="rounded border p-3 text-sm">{problem}</p>
      ) : null}
      <p role="alert" className="rounded border p-4 text-sm">{proposal.consequence}</p>
      <form action={performUndeploy} className="flex flex-wrap gap-3">
        <input type="hidden" name="agentId" value={proposal.agentId} />
        <input type="hidden" name="coinId" value={proposal.coinId} />
        <input type="hidden" name="expectedRevision" value={proposal.expectedRevision} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Stop scanning {proposal.coinId}
        </button>
        <a href={`/agents/${proposal.agentId}`} className="px-4 py-2 text-sm underline">
          Keep it deployed
        </a>
      </form>
    </main>
  );
}

export async function performUndeploy(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const coinId = requiredText(formData, 'coinId');
  const result = await app.performUndeploy.execute({
    ...user.authority,
    agentId,
    coinId,
    expectedRevision: requiredInteger(formData, 'expectedRevision'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  if (result.kind === 'refused') {
    const target = `/agents/${agentId}/undeploy/${encodeURIComponent(coinId)}`;
    redirect(`${target}?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect(`/agents/${agentId}`);
}
