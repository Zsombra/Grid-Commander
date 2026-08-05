import { acting } from '@/presentation/session.js';
import { ProposalQueue } from '@/presentation/components/proposal-queue.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function PendingPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readProposals.execute({ userId: user.authority.userId });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">What has been proposed for you</h1>
      <p className="text-sm">
        A model connected to Grid-Commander can suggest a change but cannot make one. Nothing
        here has touched your BattleGrid account. Opening a proposal reads the account again and
        shows what agreeing would do to it as it is at that moment.
      </p>
      <ProposalQueue result={result} />
    </main>
  );
}
