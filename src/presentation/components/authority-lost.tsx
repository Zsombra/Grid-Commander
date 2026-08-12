/**
 * The account's authority is gone, said where the operator was standing.
 *
 * Not a refusal, and deliberately not dressed as one. A refusal is about the
 * thing attempted — a revision moved, a value was rejected — and something else
 * may still work; this is about the account, and nothing will work until the
 * credential is repaired or the connection remade. The page that renders this
 * renders no form, because a control that cannot succeed is not made honest by
 * the sentence above it.
 *
 * The sentence is passed in rather than composed here, and that is the whole
 * point. `ConnectionRevokedError` is built with the remedy belonging to the
 * deployment that raised it — "reconnect" where a connection can be made,
 * "repair the configured credential" where the key is configuration — so
 * repeating it verbatim is what keeps a personal deployment from being told to
 * go and click a connect button it does not have.
 *
 * For the same reason this does not redirect anywhere. Sending the operator to
 * `/connect` is right on a delegated deployment and lands a personal one on
 * "there is nothing to connect", which is a true fact about the deployment and
 * no answer at all to "the write I just submitted failed".
 */
export function AuthorityLost({ reason }: { reason: string }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium text-text-primary">
        Your BattleGrid authority is no longer valid
      </h1>
      <p
        role="alert"
        className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary"
      >
        {reason}
      </p>
      <p className="text-sm text-text-secondary">
        Nothing was changed. Until this is fixed, no operation on this account
        can succeed — including the one you just tried.
      </p>
    </main>
  );
}
