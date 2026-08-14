'use client';

import { BUTTON_SECONDARY } from '@/presentation/components/control.js';

/**
 * The floor under every route.
 *
 * This page exists for the failure nobody anticipated — the throw that has no
 * authored route. Everything it says follows from what is actually known at
 * this point, which is almost nothing: the operator's last action has an
 * UNKNOWN outcome, so the one instruction this page must never give is "try
 * again". The activity log is the record that can answer, so that is where it
 * points.
 *
 * Next hands this component a `reset()` callback. It is deliberately not
 * rendered — the boundary cannot know whether the failed segment was a read,
 * and a retry control on an unknown write outcome is worse than none (#236).
 *
 * `error.digest` is Next's opaque reference for a server-side throw and is
 * safe to show; the raw message is not rendered, because an unanticipated
 * error's text was not written for the operator and is exactly where a leaked
 * internal would surface — the posture `AssistantUnavailableError` records.
 */
export default function UnanticipatedFailure({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">Something failed that we did not anticipate</h1>
      <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">
        This failure has no explanation written for it, and nothing on this page
        can tell you whether your last action landed. Your BattleGrid account
        itself is not the thing that failed here.
      </p>
      <p className="text-sm text-text-primary">
        The activity log records every write Grid-Commander makes on your
        account — check it before repeating anything.
      </p>
      <p className="text-sm">
        <a href="/audit" className={BUTTON_SECONDARY}>Open the activity log</a>
      </p>
      {error.digest ? (
        <p className="text-sm text-text-secondary">
          If you report this, this reference names the failure: <code>{error.digest}</code>
        </p>
      ) : null}
    </main>
  );
}
