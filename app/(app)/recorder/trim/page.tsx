import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTROL, LABEL } from '@/presentation/components/control.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';

/**
 * Forgetting part of the record, deliberately.
 *
 * Three states, in the order a person meets them: choose a boundary (a GET
 * form — choosing is a question, not an act), read what would become
 * unknowable and confirm it, and the receipt for what went. The describe
 * renders as often as the page does and deletes nothing; only the submitted
 * form performs, with the token the description minted.
 */
export default async function TrimRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string; problem?: string; trimmed?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;
  const { before, problem, trimmed } = await searchParams;

  if (trimmed !== undefined) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Record trimmed</h1>
        <p role="status" className="rounded-gc-2 border border-border-default p-4 text-sm">{trimmed}</p>
        <p className="text-sm">
          <a href="/recorder" className="underline">
            Back to the record
          </a>{' '}
          — its coverage now begins where the trim left it.
        </p>
      </main>
    );
  }

  const boundary = parseBoundary(before);

  if (boundary === null) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Trim the record</h1>
        {before !== undefined ? (
          <p role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">
            “{before}” is not a date this page can read — use the picker below.
          </p>
        ) : null}
        <p className="text-sm">
          Remove everything recorded before a date. The next page states exactly what would go
          before anything is deleted — nothing happens until you confirm it there.
        </p>
        {/* A GET form navigates: choosing a boundary is a question about the
            record, and the answer is the description of what that boundary
            would take. */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className={LABEL}>
            Remove runs started before
            <input type="date" name="before" required className={CONTROL} />
          </label>
          <button type="submit" className={BUTTON_PRIMARY}>
            Describe what would go
          </button>
          <a href="/recorder" className={BUTTON_SECONDARY}>
            Leave the record alone
          </a>
        </form>
      </main>
    );
  }

  const described = await app.describeTrimRecord.execute({ userId: user.authority.userId, before: boundary });

  if (described.kind === 'nothing-to-trim') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Nothing to trim</h1>
        <p role="status" className="text-sm">{described.reason}</p>
        <p className="text-sm">
          <a href="/recorder/trim" className="underline">
            Choose a different date
          </a>
          {' · '}
          <a href="/recorder" className="underline">
            Back to the record
          </a>
        </p>
      </main>
    );
  }

  const { proposal } = described;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Trim the record before {before}?</h1>
      {problem ? (
        <p role="alert" className="rounded-gc-2 border border-border-default p-3 text-sm">{problem}</p>
      ) : null}
      <p role="alert" className="rounded-gc-2 border border-border-default p-4 text-sm">{proposal.consequence}</p>
      <form action={performTrim} className="flex flex-wrap gap-3">
        <input type="hidden" name="before" value={proposal.before.toISOString()} />
        <input type="hidden" name="describedRuns" value={proposal.preview.runs} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <button type="submit" className={BUTTON_PRIMARY}>
          Trim {proposal.preview.runs} run{proposal.preview.runs === 1 ? '' : 's'} permanently
        </button>
        <a href="/recorder" className={BUTTON_SECONDARY}>
          Keep the record whole
        </a>
      </form>
    </main>
  );
}

/** `YYYY-MM-DD` from the picker, as midnight UTC; anything else is null. */
function parseBoundary(raw: string | undefined): Date | null {
  if (raw === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function performTrim(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const before = new Date(requiredText(formData, 'before'));
  const result = await app.trimRecord.execute({
    userId: user.authority.userId,
    before,
    describedRuns: requiredInteger(formData, 'describedRuns'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });

  if (result.kind === 'refused') {
    // Back to the page that asked, where the person who clicked still stands.
    const day = before.toISOString().slice(0, 10);
    redirect(`/recorder/trim?before=${day}&problem=${encodeURIComponent(result.reason)}`);
  }

  const o = result.outcome;
  const receipt =
    `Removed ${o.runs} run${o.runs === 1 ? '' : 's'}: ${o.captures} capture${o.captures === 1 ? '' : 's'}, ` +
    `${o.failures} failed attempt${o.failures === 1 ? '' : 's'}, ${o.readings} reading${o.readings === 1 ? '' : 's'}.`;
  redirect(`/recorder/trim?trimmed=${encodeURIComponent(receipt)}`);
}
