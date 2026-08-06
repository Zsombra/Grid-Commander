import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * One Market Grid session, opened.
 *
 * The arena lists fifty; this is the page that can ask the two questions a
 * list cannot afford to ask fifty times — did it settle, and what does the
 * platform publish about it now that it has.
 *
 * Reads only, like everything in this capability. Nothing here enters a
 * session: the entry fee is real money.
 */
export default async function GridSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const session = await app.openGridSession.execute({ ...user.authority, sessionId: id });
  const { detail, entered, results } = session;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">
        {detail.kind === 'detail' ? detail.detail.name : `Session ${session.sessionId}`}
      </h1>
      <p className="text-sm">
        <a href="/arena" className="underline">
          Back to the arena
        </a>
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Schedule</h2>
        {detail.kind === 'unreadable' ? (
          <>
            {/*
              Deliberately not "no such session". Grid-Commander cannot tell an
              id the platform does not know from a platform that did not
              answer, and only one of those two is the reader's fault.
            */}
            <p role="alert" className="text-sm">
              This session could not be read: {detail.reason}
            </p>
            <WhyNotLoaded cause={detail.cause} subject="this session is" />
          </>
        ) : (
          <p className="text-sm">
            {detail.detail.status}
            {' · '}
            {detail.detail.lockAt ? `locks ${detail.detail.lockAt}` : 'lock time unknown'}
            {' · '}
            {detail.detail.settleAt ? `settles ${detail.detail.settleAt}` : 'settle time unknown'}
            {typeof detail.detail.playerCount === 'number'
              ? ` · ${detail.detail.playerCount} player(s)`
              : ''}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">This account</h2>
        {entered.kind === 'unreadable' ? (
          <>
            {/* Three states, and this is the third. "You did not enter" is a
                claim; a check that did not answer has no claim to make. */}
            <p role="alert" className="text-sm">
              Whether this account entered could not be read: {entered.reason}
            </p>
            <WhyNotLoaded cause={entered.cause} subject="this account’s entry is" />
          </>
        ) : (
          <p className="text-sm">
            {entered.entered
              ? 'This account has entered this session.'
              : 'This account has not entered this session.'}
          </p>
        )}
        {/*
          The grid this account submitted is not read, and not because nobody
          got to it: `get_market_grid_player_grid` answers a 500 for "you have
          not played", so the tool cannot be used to ask the question and is
          not called at all. See the capability's spec.
        */}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Results</h2>
        {results.kind === 'not-settled' ? (
          // The platform's CONFLICT, rendered as the state it is. It says
          // "results are published after the session settles", which is an
          // answer, not a failure.
          <p className="text-sm">Results are published after this session settles.</p>
        ) : results.kind === 'unreadable' ? (
          <>
            <p role="alert" className="text-sm">
              The results could not be read: {results.reason}
            </p>
            {/* A failed read is not "not settled yet" — that would tell a
                player to come back later for something already published. */}
            <WhyNotLoaded cause={results.cause} subject="this session’s results are" />
          </>
        ) : (
          <>
            <p className="text-sm">
              BattleGrid has published results for this session.
            </p>
            {/*
              And that is all this page will say. No settled session has ever
              been read on this account, so the payload's shape is declared and
              unobserved — and reading a declaration as if it were an
              observation is what produced the dead write paths in HANDOFF.md.
              See `market-grid-payloads-that-only-fill-once-someone-plays`.
            */}
            <p className="text-sm">
              Grid-Commander does not read them yet: this payload has never been
              observed on this account, and the surface will not report figures
              it has not seen. BattleGrid returned{' '}
              {Object.keys(results.payloadUnmodelled).length} field(s).
            </p>
          </>
        )}
      </section>
    </main>
  );
}
