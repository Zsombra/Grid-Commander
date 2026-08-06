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
  // call, the arena is a list plus a fan-out, and a failure of either says
  // nothing about the other.
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
              {/* Name and coin pool come off the list, so they are known for
                  every session that appears at all. Everything below them is a
                  separate read that can fail on its own. */}
              <p className="font-medium">
                {/* Every row opens. A session you can only read a summary of
                    cannot answer what happened when it settled. */}
                <a href={`/arena/${s.id}`} className="underline">
                  {s.name}
                </a>
                {s.detail === null ? '' : ` — ${s.detail.status}`}
              </p>
              {s.detail === null ? (
                <p role="status">
                  This session&apos;s schedule could not be read
                  {s.unreadable ? `: ${s.unreadable}` : ''}.
                </p>
              ) : (
                <p>
                  {s.detail.lockAt ? `Locks ${s.detail.lockAt}` : 'Lock time unknown'}
                  {' · '}
                  {s.detail.settleAt ? `settles ${s.detail.settleAt}` : 'settle time unknown'}
                  {typeof s.detail.playerCount === 'number'
                    ? ` · ${s.detail.playerCount} player(s)`
                    : ''}
                </p>
              )}
              {/* The stake, from the list itself — known even when the
                  per-session reads fail, and the one number a player should
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
              {/* Three states. `null` is nobody knows, and saying "has not
                  entered" for it would be a claim from a read that never
                  answered. */}
              <p>
                {s.entered === null
                  ? 'Whether this account entered could not be read.'
                  : s.entered
                    ? 'This account has entered this session.'
                    : 'This account has not entered this session.'}
              </p>
              {s.detail !== null && s.detail.status !== 'SETTLED' ? (
                <p className="text-text-secondary">Results arrive after settlement.</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
