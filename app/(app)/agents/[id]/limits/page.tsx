import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { AgentPageHeading } from '@/presentation/components/agent-page-heading.js';
import { Ceilings } from '@/presentation/components/ceilings.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * What would stop this agent.
 *
 * The readings — which limits bind, which cannot, what the platform is warning
 * about — are computed in `ReadBudgetQuery`. This page renders them and imports
 * no domain (W-D).
 *
 * The roster is read for one thing: the agent's name. This page used to say
 * "Nothing will stop this agent on Loss in a day, Loss in total" without saying
 * which agent, and lead nowhere from there. `journal` reads the roster the same
 * way for the same reason.
 */
export default async function LimitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const [budget, roster] = await Promise.all([
    app.readBudget.execute({ ...user.authority, agentId: id }),
    app.listAgents.execute(user.authority),
  ]);
  const agent =
    roster.roster.kind === 'agents' ? roster.roster.agents.find((a) => a.id === id) : undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <AgentPageHeading
        subject="what would stop it"
        agentId={id}
        agentName={agent?.displayName ?? null}
        sibling={{ href: `/agents/${id}/thinking`, label: 'What it decided' }}
      />

      {/* The subject completes "This does not mean … gone", so it carries its
          own verb. Without one this read "…this agent’s limits gone". */}
      {budget.kind === 'unreadable' ? (
        <WhyNotLoaded subject="this agent’s limits are" cause={budget.cause} />
      ) : (
        <Ceilings
          limits={budget.limits}
          unbounded={budget.unbounded}
          warnings={budget.warnings}
          halted={budget.halted}
        />
      )}
    </main>
  );
}
