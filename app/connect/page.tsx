import { redirect } from 'next/navigation';
import { requestApp } from '@/presentation/session.js';
import { ConsentSummary } from '@/presentation/components/consent-summary.js';
import { NothingToConnect } from '@/presentation/components/nothing-to-connect.js';
import { DescribeGrantQuery } from '@/application/use-cases/describe-grant.query.js';
import { BUTTON_PRIMARY } from '@/presentation/components/control.js';

/**
 * What the user is agreeing to, before they are sent anywhere.
 *
 * The consent copy is a product surface, not boilerplate: `mcp:read` is
 * write-capable, and describing it as read-only would be a lie told at the
 * user's first interaction. See requirement "Configuration Authority Is
 * Described Honestly".
 *
 * On a deployment acting with a configured credential there is nothing to agree
 * to and nothing to start, so neither is offered. The button would have built an
 * `/authorize` URL with an empty `client_id` — an action that cannot work, on
 * the page the old failure message sent people looking for. See "A Remedy Named
 * Must Exist In That Deployment".
 *
 * The callback sends its bad news here — `?declined=` when the user said no at
 * BattleGrid, `?error=` when the response was incomplete or untrusted, or when
 * the authorization succeeded and the account behind it could not be named — and
 * the scenario "The user declines" promises an explanation with the retry. Both
 * render above the consent summary, which *is* the retry. A decline is the
 * user's own choice, so it wears notice and role="status"; a failed callback is
 * a failure and wears danger.
 *
 * `unidentified` and `unidentified-standing` are the same failure with different
 * consequences for the reader. In both, nothing was stored. In the second, the
 * grant could not be withdrawn either, so authority *may* still stand at
 * BattleGrid — may, because a failed revoke is not proof the grant survived —
 * and the sentence has to say where to withdraw it. That is the only place this
 * product tells someone about a state at BattleGrid it could not verify, so it
 * hedges accurately rather than comfortably.
 */
export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { personal } = await requestApp();
  if (personal) return <NothingToConnect />;

  const q = await searchParams;
  const one = (v: string | string[] | undefined): string | null => {
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : null;
  };
  const declined = one(q['declined']);
  const failure = one(q['error']);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Connect your BattleGrid account</h1>
      {declined ? (
        <p
          role="status"
          className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-sm text-text-primary"
        >
          You declined the authorization at BattleGrid, so no connection was made
          and nothing was stored. BattleGrid&apos;s answer:{' '}
          <span className="font-mono">{declined}</span>. You can authorize below
          whenever you choose to.
        </p>
      ) : null}
      {failure ? (
        <p
          role="alert"
          className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary"
        >
          <span className="font-semibold">No connection was made: </span>
          {failure === 'incomplete' ? (
            'the response from BattleGrid was missing the authorization it should have carried.'
          ) : failure === 'untrusted' ? (
            'the response did not match an authorization this product started, so it was rejected.'
          ) : failure === 'unidentified' ? (
            'the authorization succeeded, but BattleGrid did not tell us which account it was for — and a connection has to be filed under an account. The authorization was withdrawn.'
          ) : failure === 'unidentified-standing' ? (
            <>
              the authorization succeeded, but BattleGrid did not tell us which
              account it was for — and a connection has to be filed under an
              account. Withdrawing the authorization also failed, so{' '}
              <span className="font-semibold">
                it may still stand at BattleGrid
              </span>
              . You can withdraw it yourself from your account at{' '}
              <span className="font-mono">battlegrid.trade</span>.
            </>
          ) : (
            <>
              the authorization could not be completed (
              <span className="font-mono">{failure}</span>).
            </>
          )}{' '}
          Nothing was stored, and starting again below is safe.
        </p>
      ) : null}
      <ConsentSummary grant={new DescribeGrantQuery().execute()} />
      <form action={startAuthorization}>
        <button type="submit" className={BUTTON_PRIMARY}>
          Continue to BattleGrid
        </button>
      </form>
    </main>
  );
}

async function startAuthorization() {
  'use server';
  const app = await requestApp();
  const { authorizationUrl } = await app.startConnection.execute();
  redirect(authorizationUrl);
}
