import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { PerformButton } from '@/presentation/components/perform-button.js';
import {
  BUTTON_SECONDARY,
  CONTROL,
  LABEL,
} from '@/presentation/components/control.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { nullableInteger, requiredText } from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { AuthorityLost } from '@/presentation/components/authority-lost.js';

/**
 * Deploying: the act that starts an agent scanning a market.
 *
 * Two steps on one route. Without a chosen market the page is a chooser —
 * coin and timeframe, the timeframes read from BattleGrid's own runtime
 * declaration, never a list compiled in. With a choice made, the describe
 * runs: it reads the radar fresh, states the consequence (naming who is
 * replaced if the coin is occupied), and mints the token the confirm form
 * spends. The consequence on screen is the string stored with the token.
 */
export default async function DeployPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coin?: string; timeframe?: string; problem?: string; authority?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { coin, timeframe, problem, authority } = await searchParams;

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

  if (!coin || !timeframe) {
    const timeframes = await app.describeDeploy.timeframes(user.authority);
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Deploy {agent.displayName} to a market</h1>
        <CarriedProblem problem={problem} />
        {timeframes.length === 0 ? (
          <p role="alert" className="text-sm">
            BattleGrid did not declare the permitted timeframes, so a deployment
            cannot be composed right now.
          </p>
        ) : (
          <form method="get" className="space-y-3">
            <p className="text-sm">
              Name a market to deploy to. If it already carries a deployment, the
              replacement is named before anything is agreed to.
            </p>
            <label className={LABEL}>
              Coin
              <input type="text" name="coin" required placeholder="HYPE" className={CONTROL} />
            </label>
            <label className={LABEL}>
              Timeframe
              <select name="timeframe" className={CONTROL}>
                {timeframes.map((tf) => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </label>
            {/*
              deploy-chooser-row — the ask, and the way back.

              Named here because it was not. DT-0016/0017/0018 restyled
              `perform-deploy` and left this row alone, and the reason was not
              scope: a design round can only ticket what the surface manifest
              models as a unit, this row was a sentence inside another
              component's description, and so it was invisible from that side.
              The id is what makes it addressable — `openspec.py validate`
              refuses a component whose id appears in no source file, which is
              the check that would have caught the omission a month ago.
            */}
            <div className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
              {/* This form asks rather than acts — it composes a description of
                  the deployment and reaches no operation. Secondary, so the
                  weight is kept for the page that follows. */}
              <button type="submit" className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
                See what deploying would do
              </button>
              <a href={`/agents/${agent.id}`} className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
                Back to the agent
              </a>
            </div>
          </form>
        )}
      </main>
    );
  }

  const result = await app.describeDeploy.execute({
    ...user.authority,
    agentId: agent.id,
    agentName: agent.displayName,
    coinId: coin,
    timeframe,
  });

  if (result.kind !== 'proposal') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot deploy</h1>
        {/* A bounced perform rode in with its reason; the fresh refusal must
            not eat it. Both are the outcome the person is owed. */}
        <CarriedProblem problem={problem} />
        <p role="alert" className="text-sm">{result.reason}</p>
        <p className="text-sm">
          <a href={`/agents/${agent.id}/deploy`} className="underline">Choose differently</a>
        </p>
      </main>
    );
  }

  const { proposal } = result;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">
        Deploy {agent.displayName} to {proposal.coinId}?
      </h1>
      <CarriedProblem problem={problem} />
      <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm text-text-primary">{proposal.consequence}</p>
      <form action={performDeploy} className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
        <input type="hidden" name="agentId" value={proposal.agentId} />
        <input type="hidden" name="coinId" value={proposal.coinId} />
        <input type="hidden" name="timeframe" value={proposal.timeframe} />
        <input type="hidden" name="expectedRevision" value={proposal.expectedRevision === null ? '' : proposal.expectedRevision} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <PerformButton
          pendingLabel={`Deploying ${agent.displayName}…`}
          className="w-full tablet:w-auto"
        >
          Deploy {agent.displayName}
        </PerformButton>
        <a href={`/agents/${proposal.agentId}`} className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
          Leave things as they are
        </a>
      </form>
    </main>
  );
}

export async function performDeploy(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const coinId = requiredText(formData, 'coinId');
  const timeframe = requiredText(formData, 'timeframe');
  const result = await spending(
    () =>
      app.performDeploy.execute({
        ...user.authority,
        agentId,
        coinId,
        timeframe,
        expectedRevision: nullableInteger(formData, 'expectedRevision'),
        confirmationToken: requiredText(formData, 'confirmationToken'),
      }),
    // Same road as a platform refusal, and the choice is preserved the same way
    // so the describe re-runs against what they picked.
    (problem) => {
      const query = new URLSearchParams({ coin: coinId, timeframe, problem });
      redirect(`/agents/${agentId}/deploy?${query.toString()}`);
    },
  );
  // The reason returns to the page that asked, where the person who clicked is
  // still standing — with their choice preserved so the describe re-runs.
  // Lost authority is not a refusal of this deployment — nothing on this
  // account will work until it is fixed — so it travels under its own name and
  // the page renders no form for it.
  if (result.kind === 'authority-lost') {
    const query = new URLSearchParams({ authority: result.reason });
    redirect(`/agents/${agentId}/deploy?${query.toString()}`);
  }
  if (result.kind === 'refused') {
    const query = new URLSearchParams({ coin: coinId, timeframe, problem: result.reason });
    redirect(`/agents/${agentId}/deploy?${query.toString()}`);
  }
  redirect(`/agents/${agentId}`);
}
