'use client';

/**
 * The floor under the root layout itself.
 *
 * Rendered only when the outermost layout throws, so nothing that layout
 * provides can be assumed to exist — this file supplies its own document and
 * inlines its styles, because the stylesheet import lives in the thing that
 * just failed. Same posture as `app/error.tsx`: no retry control (the last
 * action's outcome is unknown), digest but never the raw message.
 */
export default function RootFailure({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <main style={{ maxWidth: '42rem', margin: '0 auto', padding: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 500 }}>
            Something failed that we did not anticipate
          </h1>
          <p role="alert" style={{ border: '1px solid #b91c1c', borderRadius: '0.5rem', padding: '1rem', fontSize: '0.875rem' }}>
            This failure has no explanation written for it, and nothing on this
            page can tell you whether your last action landed. Your BattleGrid
            account itself is not the thing that failed here.
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            The activity log records every write Grid-Commander makes on your
            account — check it before repeating anything.
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            <a href="/audit">Open the activity log</a>
          </p>
          {error.digest ? (
            <p style={{ fontSize: '0.875rem' }}>
              If you report this, this reference names the failure: <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
