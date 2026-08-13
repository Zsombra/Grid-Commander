import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, CONTROL, LABEL } from '@/presentation/components/control.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { RecordCoverage } from '@/presentation/components/signal-record.js';

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
    /**
     * The receipt states what survives, read now — never what went.
     *
     * It used to render the `?trimmed=` parameter verbatim: real figures from
     * the store, put into an editable address, where they became a claim
     * nobody could check. Editing the address attested to a removal that never
     * happened; re-opening the bookmark re-attested one long past, in the past
     * tense, for an act that can never be undone.
     *
     * So no figure here comes from the URL. Coverage is derived from the rows
     * at render time by the same read `/recorder` uses, which makes the
     * sentence true whenever it is read rather than true once. What went was
     * already stated — in the description the operator confirmed, bound to
     * that exact extent, before anything was deleted.
     */
    const coverage = await app.readRecordCoverage.execute({ userId: user.authority.userId });
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Record trimmed</h1>
        <CarriedProblem problem={problem} />
        <p role="status" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-sm text-text-primary">
          What the record holds now, read as this page rendered — not a copy of what the trim
          reported.
        </p>
        {/* The same component `/recorder` renders, so the two cannot drift and
            the unreadable arm keeps its own sentence: the store not answering
            says nothing about what it holds. */}
        <RecordCoverage result={coverage} />
        <p className="text-sm">
          <a href="/recorder" className="underline">
            Back to the record
          </a>
        </p>
      </main>
    );
  }

  const boundary = parseBoundary(before);

  if (boundary === null) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Trim the record</h1>
        <CarriedProblem problem={problem} />
        {before !== undefined ? (
          <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">
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
        {/*
          DT-0025. The one decision DT-0016 did not have to make: this row
          carries a field as well as controls, so the field stacks full-width
          above them and `items-end` is kept only above the breakpoint, where a
          shared baseline between a labelled input and its buttons still means
          something. In a column it means nothing.
        */}
        <form
          method="get"
          className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap tablet:items-end"
        >
          <label className={`${LABEL} w-full tablet:w-auto`}>
            Remove runs started before
            <input type="date" name="before" required className={CONTROL} />
          </label>
          <button type="submit" className={`${BUTTON_PRIMARY} w-full tablet:w-auto`}>
            Describe what would go
          </button>
          <a href="/recorder" className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
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
        <CarriedProblem problem={problem} />
        <p role="status" className="rounded-gc-2 border border-quiet-border bg-quiet-subtle p-4 text-sm text-text-primary">{described.reason}</p>
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
      <CarriedProblem problem={problem} />
      <p role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm text-text-primary">{proposal.consequence}</p>
      {/*
        DT-0025. The surface that most deserved the sweep and did not get it:
        trimming deletes signal history nothing can recover, and a wrapping row
        puts a destructive submit and its cancel side by side at thumb width.
      */}
      <form action={performTrim} className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
        <input type="hidden" name="before" value={proposal.before.toISOString()} />
        <input type="hidden" name="describedRuns" value={proposal.preview.runs} />
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <button type="submit" className={`${BUTTON_PRIMARY} w-full tablet:w-auto`}>
          Trim {proposal.preview.runs} run{proposal.preview.runs === 1 ? '' : 's'} permanently
        </button>
        <a href="/recorder" className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
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

  /**
   * A marker, carrying no figures.
   *
   * `result.outcome` states what was removed and the command still returns it —
   * that is the trim's answer to its caller. What it must not become is a
   * sentence in an address bar: the numbers were real, and putting real numbers
   * somewhere anyone can edit is what turned them into a claim nobody could
   * check. The receipt reads the record instead.
   */
  redirect('/recorder/trim?trimmed=1');
}
