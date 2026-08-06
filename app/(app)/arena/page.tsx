import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * The Market Grid arena, watched — sessions, schedules, coin pools, and
 * whether this account has entered. Reads only: playing carries a real
 * entry fee, and offering it means the full confirmation ceremony first
 * (out of scope by decision — see the market-grid capability's Purpose).
 */
export default async function ArenaPage() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const arena = await app.watchArena.execute(user.authority);

  if (arena.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The arena could not be read</h1>
        {/* Not an empty arena: "nothing is running" and "nothing could be
            read" are different facts. */}
        <p role="alert" className="text-sm">{arena.reason}</p>
      </main>
    );
  }

  if (arena.kind === 'empty') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Arena</h1>
        <p className="text-sm">BattleGrid lists no Market Grid sessions right now.</p>
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
      <ul className="space-y-4">
        {arena.sessions.map((s) => (
          <li key={s.id} className="rounded border p-4 text-sm space-y-1">
            {/* Name and coin pool come off the list, so they are known for
                every session that appears at all. Everything below them is a
                separate read that can fail on its own. */}
            <p className="font-medium">
              {s.detail === null ? s.name : `${s.name} — ${s.detail.status}`}
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
    </main>
  );
}
