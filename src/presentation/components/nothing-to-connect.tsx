import { describeRemedy } from '@/domain/connection/remedy.js';

/**
 * `/connect`, on a deployment that has nothing to connect.
 *
 * Two people arrive here. Someone who typed the URL, and — until the change that
 * added this — someone following the advice a refused key used to give. The page
 * they found offered a consent summary for a grant nobody was requesting and a
 * button that would have built an `/authorize` URL with an empty `client_id`.
 *
 * An action that cannot work is worse than no action: it makes a correctly
 * configured deployment look broken, and it makes a *misconfigured* one look
 * like it has a fix here, which it does not.
 *
 * The remedy sentence is the same one the failure message names, from the same
 * source. Two copies would become two answers, and this is the page someone
 * lands on when the first one was not enough.
 */
export function NothingToConnect() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">There is nothing to connect</h1>
      <p className="text-base text-text-primary">
        This deployment acts with a BattleGrid key it was configured with, not
        with accounts that connect to it. There is no authorization to grant and
        no account to link.
      </p>
      <p className="text-base text-text-secondary">
        If the product is telling you its authority is no longer valid, that is
        the key. {describeRemedy('repair-the-key')}
      </p>
      <p className="text-base">
        <a href="/" className="underline">
          Back to your agents
        </a>
      </p>
    </main>
  );
}
