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
 * The roster is read for two things: the agent's name, and what it has spent.
 * The name because this page used to say "Nothing will stop this agent on Loss
 * in a day, Loss in total" without saying which agent (`journal` reads the
 * roster the same way). The spend because the roster is the one read that
 * answers it truthfully — see the comment on the section below.
 */

/**
 * Rounded to the platform's own precision: the one cost figure it has ever
 * printed itself ("$6.0544 / $6", inside a halt reason) carried four decimals,
 * and two would render a $0.004 spend as the "$0.00" this product refuses to
 * show for figures that are not zero.
 */
const spent = (v: number): string => `$${Math.round(v * 10000) / 10000}`;

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

      {/**
       * Spend, from the roster read this page already makes for its heading —
       * deliberately not from the reads a limits page would reach for first.
       * `get_agent_budget` carries no cost field at all, and
       * `get_intelligence_agent` answers 0 for an agent the list prices at
       * $0.09 at the same moment (stable across repeated samples), so the
       * list is the one source read here — no detour through the detail's
       * zero. See `the-cost-of-an-agent-reads-differently-from-two-tools`.
       *
       * No gauge, because a gauge needs a ceiling and none is readable: the
       * only cap ever observed arrived inside a breach message as prose,
       * which is not a read this product makes. Its own failure branch,
       * because the roster and the budget fail independently and one must
       * not hide the other.
       */}
      <section className="space-y-1">
        <h2 className="font-medium">Spend</h2>
        {roster.roster.kind === 'unreadable' ? (
          <>
            <p role="status" className="text-sm">
              What this agent has spent could not be read: {roster.roster.reason}
            </p>
            <WhyNotLoaded subject="what it has spent is" cause={roster.roster.cause} />
          </>
        ) : agent === undefined ? (
          <p className="text-sm">
            Spend is a further way BattleGrid can stop an agent, and this agent is not on the
            roster BattleGrid returned, so what it has spent could not be read from there.
          </p>
        ) : agent.last24hCostUsd === null ? (
          <p className="text-sm">
            Spend is a further way BattleGrid can stop an agent. It did not report a spend
            figure for this one.
          </p>
        ) : (
          <p className="text-sm">
            Spend is a further way BattleGrid can stop an agent. It reports{' '}
            {spent(agent.last24hCostUsd)} spent over the last 24 hours and publishes no
            ceiling to read it against, so there is no gauge to draw — the figure is what
            this agent has spent, not how close it is to anything.
          </p>
        )}
      </section>
    </main>
  );
}
