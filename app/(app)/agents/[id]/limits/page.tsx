import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { Ceilings } from '@/presentation/components/ceilings.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * What would stop this agent.
 *
 * The readings — which limits bind, which cannot, what the platform is warning
 * about — are computed in `ReadBudgetQuery`. This page renders them and imports
 * no domain (W-D).
 */
export default async function LimitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const budget = await app.readBudget.execute({ ...user.authority, agentId: id });

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-medium text-text-primary">What would stop this agent</h1>

      {budget.kind === 'unreadable' ? (
        <WhyNotLoaded subject="this agent’s limits" cause={budget.cause} />
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
