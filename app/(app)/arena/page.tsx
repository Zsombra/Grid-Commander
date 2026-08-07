import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { GameRules } from '@/presentation/components/game-rules.js';

/**
 * The Market Grid arena, watched — the rules of the game, then the sessions
 * with their schedules, coin pools, price, and whether this account entered.
 * Reads only: playing carries a real entry fee, and offering it means the full
 * confirmation ceremony first (out of scope by decision — see the market-grid
 * capability's Purpose).
 *
 * The price is on the page rather than in a note about it. `entryFee: 10` sits
 * on every session BattleGrid lists (observed 2026-08-06), so a surface that
 * shows the game without showing what it costs is describing a free one.
 */

/**
 * A figure in the platform's own units, or the absence of one.
 *
 * BattleGrid names no currency for an entry fee, so neither does this: the
 * number is quoted as it arrived, and a number that did not arrive says so
 * rather than reading as zero.
 */
const stated = (v: number | null): string => (v === null ? 'not stated' : `${v}`);

export default async function ArenaPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  // Two reads, asked together and answered apart: the rulebook is one unscoped
  // call, the arena is a list plus one submission check per session, and a
  // failure of either says nothing about the other.
  const [arena, rules] = await Promise.all([
    app.watchArena.execute(user.authority),
    app.readGameRules.execute(user.authority),
  ]);

  if (arena.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The arena could not be read</h1>
        {/* Not an empty arena: "nothing is running" and "nothing could be
            read" are different facts. */}
        <p role="alert" className="text-sm">{arena.reason}</p>
        {/* The account's own entries are read from the same failed call, so
            "you have not entered" is exactly what this page must not imply. */}
        <WhyNotLoaded cause={arena.cause} subject="the arena is" />
        {/* The rules are a separate read and survive the list failing — the
            one thing this page can still say truthfully. */}
        <GameRules rules={rules} />
      </main>
    );
  }

  if (arena.kind === 'empty') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Arena</h1>
        <p className="text-sm">BattleGrid lists no Market Grid sessions right now.</p>
        <GameRules rules={rules} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Arena</h1>
      <p className="text-sm">
        Watching only — entering a session stakes real money and is not
        offered here yet.
      </p>

      <GameRules rules={rules} />

      <section className="space-y-4">
        <h2 className="text-base font-medium">
          {arena.sessions.length} session{arena.sessions.length === 1 ? '' : 's'}
        </h2>
        <ul className="space-y-4">
          {arena.sessions.map((s) => (
            <li key={s.id} className="rounded border p-4 text-sm space-y-1">
              {/* Everything about the session — name, status, schedule, player
                  count, coin pool, price — comes off the list, so it is known
                  for every session that appears at all. The only per-session
                  read left is about this *account*, and it is the last block
                  below. */}
              <p className="font-medium">
                {/* Every row opens. A session you can only read a summary of
                    cannot answer what happened when it settled. */}
                <a href={`/arena/${s.id}`} className="underline">
                  {s.name}
                </a>
                {` — ${s.status ?? 'status not stated'}`}
              </p>
              {/* No degraded branch here any more. This used to say "this
                  session's schedule could not be read" whenever a per-session
                  detail call failed — while the schedule sat in the list
                  payload that had rendered the row. */}
              <p>
                {s.lockAt ? `Locks ${s.lockAt}` : 'Lock time unknown'}
                {' · '}
                {s.settleAt ? `settles ${s.settleAt}` : 'settle time unknown'}
                {typeof s.playerCount === 'number' ? ` · ${s.playerCount} player(s)` : ''}
              </p>
              {/* The stake, from the list itself — known even when the
                  submission check fails, and the one number a player should
                  never have to go looking for. */}
              <p>
                Entry {stated(s.entryFee)} · pool {stated(s.prizePool)}
                {s.timeRangeKey ? ` · ${s.timeRangeKey} window` : ''}
              </p>
              {s.playersNeeded !== null && s.playersNeeded > 0 ? (
                <p>
                  Needs {s.playersNeeded} more player{s.playersNeeded === 1 ? '' : 's'}
                  {s.minimumPlayers !== null ? ` to reach its minimum of ${s.minimumPlayers}` : ''}.
                </p>
              ) : null}
              <p>Coins: {s.coinTickers.length > 0 ? s.coinTickers.join(', ') : 'not previewed'}</p>
              {/* The one thing on this row that is a separate read, and the
                  one honest degradation left. Three states: `null` is nobody
                  knows, and saying "has not entered" for it would be a claim
                  from a read that never answered. The reason rides along — it
                  used to be spent on the schedule sentence above. */}
              <p role={s.entered === null ? 'status' : undefined}>
                {s.entered === null
                  ? `Whether this account entered could not be read${
                      s.unreadable ? `: ${s.unreadable}` : ''
                    }.`
                  : s.entered
                    ? 'This account has entered this session.'
                    : 'This account has not entered this session.'}
              </p>
              {/* The results claim, made only where the status warrants it.
                  This used to be one sentence for everything short of SETTLED
                  — including CANCELLED, which never settles, on 48 of the 50
                  rows the live list returned (2026-08-06). Bespoke prose only
                  for the two values ever observed on a session (PENDING,
                  CANCELLED) plus SETTLED, whose meaning the results tool
                  itself states and whose treatment is silence: the thing
                  promised has arrived, and the opened session reads its state.
                  The declared enum is wider (LIVE, RESOLVING,
                  SETTLEMENT_QUARANTINED) but prose for unobserved states is
                  the mistake behind HANDOFF.md's dead paths, so those fall
                  through to the platform's-own-word branch — BindingSummary's
                  third-branch treatment — alongside any word a future
                  deployment adds. A null status stays the named unknown above
                  and claims nothing here: a session in an unknown state is not
                  a session known to be unsettled. */}
              {s.status === 'PENDING' ? (
                <p className="text-text-secondary">Results arrive after settlement.</p>
              ) : s.status === 'CANCELLED' ? (
                // Terminal, said as terminal. Even the platform's own refusal
                // gets this wrong — "Results are not available yet: … is
                // CANCELLED" — and repeating its promise here made it this
                // product's claim.
                <p className="text-text-secondary">
                  This session was cancelled. It will not settle, and no results will be published.
                </p>
              ) : s.status !== null && s.status !== 'SETTLED' ? (
                <p className="text-text-secondary">
                  {/* One template literal: the sentence is asserted whole, and
                      the rendering resolver joins separate text nodes with
                      spaces. */}
                  {`${s.status} is the platform's own word for this session's state — Grid-Commander has no reading of it, and neither promises results nor rules them out.`}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
