import { PerformButton } from '@/presentation/components/perform-button.js';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_SECONDARY } from '@/presentation/components/control.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { performArchive } from './actions.js';

/** Archiving is reversible, and the copy the token was issued against says so. */
export default async function ArchivePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ problem?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { problem } = await searchParams;
  const result = await app.describeArchive.execute({ ...user.authority, agentId: id });

  if (result.kind !== 'proposal') {
    // A refusal to mint is advisory, not failure: notice, never danger, and
    // nothing beneath it styled as though retrying could help. DT-0004.
    //
    // The carried reason mounts here too — this is the branch a bounced
    // archive lands on by construction, because after a spent confirmation
    // the agent is usually already archived and the describe declines to
    // re-mint. "Cannot archive" and "your archive was refused" are two
    // different facts, and the operator is owed both (#240).
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot archive</h1>
        <CarriedProblem problem={problem} />
        <p role="alert" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-sm text-text-primary">
          {result.reason}
        </p>
      </main>
    );
  }

  const { proposal } = result;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Archive {proposal.agentName}?</h1>
      <CarriedProblem problem={problem} />
      <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm text-text-primary">
        {proposal.consequence}
      </p>
      <form action={performArchive} className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
        <input type="hidden" name="agentId" value={proposal.agentId} />
        <input type="hidden" name="expectedRevision" value={proposal.expectedRevision} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <PerformButton
          pendingLabel={`Archiving ${proposal.agentName}…`}
          className="w-full tablet:w-auto"
        >
          Archive {proposal.agentName} and free its slot
        </PerformButton>
        <a href={`/agents/${proposal.agentId}`} className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
          Leave it active
        </a>
      </form>
    </main>
  );
}
