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
 * It also reads the session's own row off that list, because the two payloads
 * overlap and neither contains the other (measured live 2026-08-06): the
 * players still needed, the host, the price and how the money is split are
 * list-only, and a page devoted to a session was missing the arena's headline
 * fact about it. The reads fail independently — a page holding one and not
 * the other renders what it has and says what it could not read.
 *
 * Reads only, like everything in this capability. Nothing here enters a
 * session: the entry fee is real money.
 */

/**
 * A figure in the platform's own units, or the absence of one — the arena
 * page's rule, kept here for the same reason: BattleGrid names no currency,
 * so the number is quoted as it arrived, and one that did not arrive says so
 * rather than reading as zero.
 */
const stated = (v: number | null): string => (v === null ? 'not stated' : `${v}`);

export default async function GridSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const session = await app.openGridSession.execute({ ...user.authority, sessionId: id });
  const { detail, summary, entered, results } = session;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">
        {detail.kind === 'detail'
          ? detail.detail.name
          : summary.kind === 'summary'
            ? summary.summary.name
            : `Session ${session.sessionId}`}
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
        <h2 className="text-base font-medium">The game on offer</h2>
        {/*
          Everything in this section is list-only: the detail payload carries
          none of it. The list is a read of its own and fails on its own —
          a schedule above with nothing here, or the reverse, is the page
          rendering what it has.
        */}
        {summary.kind === 'unreadable' ? (
          <>
            <p role="alert" className="text-sm">
              {`What the arena lists for this session could not be read: ${summary.reason}`}
            </p>
            <WhyNotLoaded cause={summary.cause} subject="this session’s listing is" />
          </>
        ) : summary.kind === 'not-listed' ? (
          /*
            Its own named state, not an error: the list answered, and this
            session was not among the rows it carries. The facts only the list
            holds are unavailable for a reason the page can state exactly.
          */
          <p className="text-sm">
            The arena’s session list answered and does not carry this session,
            so what only the list holds — the players still needed, the host,
            and how the money is split — cannot be shown for it. Everything the
            other reads answered still renders on this page.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {`Entry ${stated(summary.summary.entryFee)} · prize pool ${stated(summary.summary.prizePool)}`}
              {summary.summary.timeRangeKey ? ` · ${summary.summary.timeRangeKey} window` : ''}
            </p>
            <p className="text-sm">
              {typeof summary.summary.playersNeeded === 'number'
                ? `Needs ${summary.summary.playersNeeded} more player(s)${
                    typeof summary.summary.minimumPlayers === 'number'
                      ? ` to reach its minimum of ${summary.summary.minimumPlayers}`
                      : ''
                  }.`
                : 'How many more players it needs is not stated.'}
            </p>
            <p className="text-sm">
              {summary.summary.hostDisplayName
                ? `Hosted by ${summary.summary.hostDisplayName}.`
                : 'The platform names no host for this session.'}
            </p>
            <h3 className="text-sm font-medium">How the money is split</h3>
            {/*
              The platform's own figures, quoted — never summed, checked
              against the entry fee, or reconstructed. A derived figure on a
              money surface is a claim BattleGrid never made.
            */}
            <p className="text-sm">
              {typeof summary.summary.itmPercent === 'number'
                ? `${summary.summary.itmPercent}% of players finish in the money${
                    typeof summary.summary.calculatedItmCount === 'number'
                      ? ` — ${summary.summary.calculatedItmCount} paying place(s) at the current player count`
                      : ''
                  }.`
                : 'How much of the field finishes in the money is not stated.'}
            </p>
            <p className="text-sm">
              {summary.summary.feeBreakdown
                ? `Of each entry, the platform allots: winners ${stated(summary.summary.feeBreakdown.winnersAmount)} · platform ${stated(summary.summary.feeBreakdown.platformAmount)} · jackpot ${stated(summary.summary.feeBreakdown.jackpotAmount)} · war bond ${stated(summary.summary.feeBreakdown.warBondAmount)} · host ${stated(summary.summary.feeBreakdown.hostAmount)}.`
                : 'How the entry fee is split is not stated.'}
            </p>
            <p className="text-sm">
              {summary.summary.distributionCurveId
                ? `Payout curve ${summary.summary.distributionCurveId}${
                    typeof summary.summary.alpha === 'number'
                      ? ` (alpha ${summary.summary.alpha})`
                      : ''
                  }.`
                : 'The payout curve is not stated.'}
            </p>
            <h3 className="text-sm font-medium">The coins</h3>
            <p className="text-sm">
              {`Coin pool: ${
                summary.summary.coinTickers.length > 0
                  ? summary.summary.coinTickers.join(', ')
                  : 'not previewed'
              }`}
            </p>
            {/*
              The roster fact is observed; the picks are not. `crowdUpPercent`
              and `crowdDownPercent` have only ever been null and
              `coinPicks.top` has never had an entry (all 50 rows, 2026-08-06),
              so there is no crowd panel here — a declared-only shape is not
              rendered. See
              `market-grid-payloads-that-only-fill-once-someone-plays`.
            */}
            {summary.summary.hasPicks === false ? (
              <p className="text-sm">
                {typeof summary.summary.pickRosterSize === 'number'
                  ? `${summary.summary.pickRosterSize} coin(s) on offer — nobody has picked yet.`
                  : 'Nobody has picked a coin yet.'}
              </p>
            ) : summary.summary.hasPicks === true ? (
              <p className="text-sm">
                Players have picked coins. Grid-Commander does not read the
                picks yet: a pick row has never been observed, and the surface
                will not report figures it has not seen.
              </p>
            ) : null}
          </>
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
