import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { RecordCoverage } from '@/presentation/components/signal-record.js';

/**
 * The record's own account of itself: what is being recorded, how
 * continuously, and where the holes are.
 *
 * This page exists because the recorder's failure mode is silence — a dead
 * cron records nothing and nothing complains. The product deliberately owns
 * no scheduler (the proposals store's precedent), so this surface is the
 * other half of that decision: the operator schedules, and here is where a
 * schedule that stopped shows up.
 */
export default async function RecorderPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const coverage = await app.readRecordCoverage.execute({ userId: user.authority.userId });

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
      <h1 className="text-lg font-medium">Signal record</h1>
      <p className="text-sm text-text-secondary">
        What the signals said, captured forward. The platform serves current readings only, so
        this record grows from the day recording starts — and a gap can never be filled in later.
      </p>
      <RecordCoverage result={coverage} />
    </main>
  );
}
