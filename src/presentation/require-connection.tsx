import type { CurrentUserResult } from '@/application/use-cases/current-user.query.js';

/**
 * The one place a request without authority is turned away.
 *
 * Every reason a request cannot act — no session, forged cookie, unknown user,
 * revoked connection, unrefreshable token, a 401 from BattleGrid — arrives here
 * as the same result and produces the same page. They differ in cause and not in
 * remedy: each is fixed by connecting, and none by anything else the user could
 * do. See design W-C.
 */
export function NotConnected({ result }: { result: Extract<CurrentUserResult, { kind: 'not-connected' }> }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Not connected</h1>
      <p className="text-sm">{result.message}</p>
      <p className="text-sm">
        <a href="/connect" className="underline">
          Connect your BattleGrid account
        </a>
      </p>
    </main>
  );
}
