import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { AuthorityLost } from '@/presentation/components/authority-lost.js';

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
  searchParams: Promise<{ problem?: string; authority?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id, coin } = await params;
  const { problem, authority } = await searchParams;

  // Authority, not this operation. Rendered before anything is described,
  // because there is nothing to describe when no call can succeed — and no
  // form, because a control that cannot work is not made honest by the
  // sentence above it.
  if (authority) return <AuthorityLost reason={authority} remedy={app.remedy} />;


  const { roster } = await app.listAgents.execute(user.authority);
  if (roster.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Could not load this agent</h1>
        <CarriedProblem problem={problem} />
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
        <CarriedProblem problem={problem} />
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
        {/* A bounced perform rode in with its reason; the fresh refusal must
            not eat it. Both are the outcome the person is owed. */}
        <CarriedProblem problem={problem} />
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
      <CarriedProblem problem={problem} />
      <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm text-text-primary">{proposal.consequence}</p>
      <form action={performUndeploy} className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
        <input type="hidden" name="agentId" value={proposal.agentId} />
        <input type="hidden" name="coinId" value={proposal.coinId} />
        <input type="hidden" name="expectedRevision" value={proposal.expectedRevision} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <button type="submit" className={`${BUTTON_PRIMARY} w-full tablet:w-auto`}>
          Stop scanning {proposal.coinId}
        </button>
        <a href={`/agents/${proposal.agentId}`} className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
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
  // Lost authority is not a refusal of this operation — nothing on this account
  // will work until it is fixed — so it travels under its own name and the page
  // renders no form for it.
  if (result.kind === 'authority-lost') {
    const target = `/agents/${agentId}/undeploy/${encodeURIComponent(coinId)}`;
    redirect(`${target}?authority=${encodeURIComponent(result.reason)}`);
  }
  if (result.kind === 'refused') {
    const target = `/agents/${agentId}/undeploy/${encodeURIComponent(coinId)}`;
    redirect(`${target}?problem=${encodeURIComponent(result.reason)}`);
  }
  redirect(`/agents/${agentId}`);
}
