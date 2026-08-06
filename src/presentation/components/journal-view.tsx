import type {
  Happening,
  ReadAgentJournalResponse,
  Reasoning,
  Submission,
} from '@/application/use-cases/read-agent-journal.query.js';
import { usd } from '@/domain/agent/performance.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * An agent's own record.
 *
 * Deliberately captioned as the agent's record rather than left to context.
 * This product holds two logs that a user could easily conflate: this one says
 * what their agent thought, and the audit log says what Grid-Commander did to
 * their account. Someone who mixes them up either blames their agent for our
 * actions, or credits us with theirs.
 *
 * **Activity first.** The three parts are what the agent did, what it thought,
 * and what it submitted, and the order is not arbitrary: the question that
 * brings someone here is "why is my agent quiet", and the answer is in the
 * first list. Reasoning is what it was thinking while it did those things, and
 * a fuller version of it lives one page away at `thinking`.
 */
export function JournalView({
  agentId,
  agentName,
  response,
}: {
  agentId: string;
  agentName: string;
  response: ReadAgentJournalResponse;
}) {
  const { journal, heading } = response;

  return (
    <section aria-labelledby="journal-heading" className="space-y-6">
      <div className="space-y-1">
        <h2 id="journal-heading" className="text-lg font-medium text-text-primary">
          {agentName}&apos;s journal
        </h2>
        <p className="text-sm text-text-secondary">{heading}</p>
        {/**
         * This page named the agent and still led nowhere back to it — the same
         * dead end as `thinking` and `limits`, one link short of invisible. The
         * audit pointer below is not a substitute: it goes to a different
         * record, deliberately.
         */}
        <p className="text-sm">
          <a href={`/agents/${agentId}`} className="underline">
            Back to {agentName}
          </a>
        </p>
        <p className="text-xs text-text-secondary">
          Looking for what Grid-Commander changed on your account instead?{' '}
          <a href="/audit" className="underline">
            That is the audit log
          </a>
          .
        </p>
      </div>

      {journal.kind === 'unreadable' && (
        <div role="alert" className="rounded-gc-2 border border-consequence-border p-3 text-sm">
          <p>This journal could not be loaded: {journal.reason}</p>
          {/* Named, because the branch below is the one this must not be
              mistaken for: an agent that has recorded nothing looks the same
              on screen as one whose record would not load. */}
          <WhyNotLoaded cause={journal.cause} subject={`${agentName}’s record is`} />
        </div>
      )}

      {journal.kind === 'none' && (
        <p className="text-sm text-text-secondary">
          {agentName} has not recorded anything yet — no activity, no reasoning, no
          submissions. That is different from its record being unavailable; nothing
          failed to load.
        </p>
      )}

      {journal.kind === 'record' && (
        <>
          <Part
            title="What it did"
            /**
             * The platform returns ten of each and its schema offers no page
             * argument, so this says ten rather than implying a complete history.
             * Claiming to show everything is the easier copy and it would be a
             * lie about the one list someone reads to find out why nothing has
             * happened.
             */
            note="The ten most recent, newest first."
            empty={`BattleGrid has recorded nothing ${agentName} did.`}
            count={journal.happenings.length}
          >
            <ol className="space-y-3">
              {journal.happenings.map((h) => (
                <Event key={h.event.id} happening={h} />
              ))}
            </ol>
          </Part>

          <Part
            title="What it was thinking"
            note="The ten most recent."
            empty={`${agentName} has not recorded any reasoning.`}
            count={journal.reasonings.length}
          >
            <ol className="space-y-3">
              {journal.reasonings.map((r) => (
                <Thought key={r.entry.id} reasoning={r} />
              ))}
            </ol>
          </Part>

          <Part
            title="What it submitted"
            note="The ten most recent."
            empty={`${agentName} has submitted nothing.`}
            count={journal.submissions.length}
          >
            <ol className="space-y-3">
              {journal.submissions.map((s) => (
                <Game key={`${s.game.at.toISOString()}-${s.game.gameType}`} submission={s} />
              ))}
            </ol>
          </Part>
        </>
      )}
    </section>
  );
}

/**
 * One of the three parts, with its own empty state.
 *
 * Per-part rather than one for the whole page. An agent created an hour ago has
 * activity and no submissions, and a single "nothing recorded" over all three
 * would hide the `AGENT_CREATED` line that says what it is.
 */
function Part({
  title,
  note,
  empty,
  count,
  children,
}: {
  title: string;
  note: string;
  empty: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-medium text-text-primary">{title}</h3>
        {count > 0 && <span className="text-xs text-text-secondary">{note}</span>}
      </div>
      {count === 0 ? <p className="text-sm text-text-secondary">{empty}</p> : children}
    </section>
  );
}

function Event({ happening }: { happening: Happening }) {
  const { event, kind, sentence, bar, facts } = happening;
  return (
    <li className="space-y-1 rounded-gc-2 border border-consequence-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">{kind}</span>
        <time className="text-sm text-text-secondary" dateTime={event.at.toISOString()}>
          {event.at.toISOString().replace('T', ' ').slice(0, 16)}
        </time>
      </div>

      {/**
       * The platform's own words, where it wrote a sentence rather than a code.
       * On this account that is where "Insufficient balance. Required: $10,
       * Available: $0. Deposit USDC…" lives — the most useful thing BattleGrid
       * says about an agent that is not trading, and the product used to show
       * none of it.
       */}
      {sentence && <p className="text-sm text-text-primary">{sentence}</p>}

      {bar && (
        <p className="text-sm text-text-secondary">
          Confidence <strong>{bar.confidence}</strong> against a bar of{' '}
          <strong>{bar.threshold}</strong>.
        </p>
      )}

      {facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
          {facts.map(([name, value]) => (
            <div key={name} className="flex gap-1">
              <dt>{name}</dt>
              <dd className="text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

function Thought({ reasoning }: { reasoning: Reasoning }) {
  const { entry, outcome, bar, declined } = reasoning;
  return (
    <li className="space-y-1 rounded-gc-2 border border-consequence-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">
          {entry.snapshot ? entry.snapshot.coinTicker : 'No market recorded'}
          {entry.snapshot?.thesisDirection ? ` · ${entry.snapshot.thesisDirection}` : ''}
        </span>
        <time className="text-sm text-text-secondary" dateTime={entry.at.toISOString()}>
          {entry.at.toISOString().replace('T', ' ').slice(0, 16)}
        </time>
      </div>

      <p className="text-sm text-text-primary">
        <strong>{outcome}</strong>
        {declined ? ' — it evaluated this and chose not to act.' : ''}
      </p>

      {bar.kind !== 'no-bar' && (
        <p className="text-sm text-text-secondary">
          Confidence <strong>{entry.confidence}</strong> against a bar of{' '}
          <strong>{entry.threshold}</strong> —{' '}
          {bar.kind === 'cleared' ? `cleared it by ${bar.by}.` : `short by ${bar.by}.`}
        </p>
      )}

      {entry.reasoning && (
        <p className="whitespace-pre-wrap text-sm text-text-secondary">{entry.reasoning}</p>
      )}
    </li>
  );
}

function Game({ submission }: { submission: Submission }) {
  const { game, settled, outcome } = submission;
  return (
    <li className="space-y-1 rounded-gc-2 border border-consequence-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-text-primary">
          {game.gameType} · {game.picks} picks
        </span>
        <time className="text-sm text-text-secondary" dateTime={game.at.toISOString()}>
          {game.at.toISOString().replace('T', ' ').slice(0, 16)}
        </time>
      </div>

      {/**
       * An unsettled submission is stated as unsettled. Rendering its null score
       * as `0` would show a grid that has not been judged as one that scored
       * nothing — a result, where there is none. Every game on the account this
       * was built against was pending, so this is the branch that renders.
       */}
      <p className="text-sm text-text-primary">
        {settled ? (
          <>
            Scored <strong>{game.score}</strong>
            {game.rank !== null && <> · ranked {game.rank}</>}
            {/* The same rule as the agent record and an event's detail — it
                rendered `$0` next to a `−$0.25` on the neighbouring page. */}
            {game.payoutUsd !== null && <> · paid {usd(game.payoutUsd)}</>}
            {outcome && <> · {outcome}</>}
          </>
        ) : (
          'Submitted. The session has not settled, so there is no score yet.'
        )}
      </p>

      {game.confidence !== null && (
        <p className="text-sm text-text-secondary">Confidence {game.confidence}.</p>
      )}

      {game.reasoning && (
        <p className="whitespace-pre-wrap text-sm text-text-secondary">{game.reasoning}</p>
      )}
    </li>
  );
}
