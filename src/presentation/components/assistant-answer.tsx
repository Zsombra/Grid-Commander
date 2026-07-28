import type { Answer } from '@/domain/assistant/answer.js';
import { describeIncompleteness } from '@/domain/assistant/answer.js';

/**
 * An answer, and what it was built from.
 *
 * This is the only surface in the product showing generated prose, and the
 * citation is not decoration: an answer nobody can check is worse than no
 * answer, because it will be trusted.
 */
export function AssistantAnswer({ answer }: { answer: Answer }) {
  if (answer.kind === 'refused') {
    return (
      <div role="alert" className="rounded border p-4 text-sm">
        <p>{answer.reason}</p>
      </div>
    );
  }

  if (answer.kind === 'general') {
    return (
      <div className="space-y-2">
        <p className="text-sm">{answer.text}</p>
        {/*
          The distinction that keeps this honest: "I did not look anything up"
          and "I looked and found nothing" are different claims, and only the
          second is about the user's account.
        */}
        <p className="text-xs">
          I did not read anything from your account to answer that, so treat it as
          general rather than as a statement about your setup.
        </p>
      </div>
    );
  }

  const incompleteness = describeIncompleteness(answer);

  return (
    <div className="space-y-3">
      <p className="text-sm">{answer.text}</p>

      {incompleteness && (
        <p role="alert" className="rounded border p-3 text-sm">
          {incompleteness}
        </p>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer">
          Read from your account ({answer.consulted.length})
        </summary>
        <ul className="mt-2 space-y-1">
          {answer.consulted.map((c, i) => (
            <li key={`${c.tool}-${i}`}>
              <code>{c.tool}</code>
              {c.outcome === 'failed' && <> — did not return{c.failure ? `: ${c.failure}` : ''}</>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
