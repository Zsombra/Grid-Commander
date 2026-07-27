import { acting } from '@/presentation/session.js';
import { AuditList } from '@/presentation/components/audit-list.js';
import { NotConnected } from '@/presentation/require-connection.js';

export default async function AuditPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { entries, unresolvedCount } = await app.listAudit.execute({
    userId: user.authority.userId,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">What Grid-Commander did on your account</h1>
      <p className="text-sm">
        Looking for what your agents thought? That is each agent&apos;s journal.
      </p>
      <AuditList entries={entries} unresolvedCount={unresolvedCount} />
    </main>
  );
}
