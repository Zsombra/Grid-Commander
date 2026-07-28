import { acting } from '@/presentation/session.js';
import { AssistantAnswer } from '@/presentation/components/assistant-answer.js';
import { AssistantDisclosureNote } from '@/presentation/components/assistant-disclosure.js';
import { NotConnected } from '@/presentation/require-connection.js';

/**
 * Ask a question about your own setup.
 *
 * The assistant can only read, and the limit is in the toolset it is handed
 * rather than in anything it is told — so this page has no "are you sure"
 * anywhere, because there is nothing it could do that would need one.
 */
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { q } = await searchParams;
  const answer = q ? (await app.askAssistant.execute({ ...user.authority, question: q })).answer : null;

  // Read from the port that will answer, not from configuration read a second
  // time. The sentence is composed in the domain; nothing here holds a copy of
  // it, because a copy is a promise maintained by hand.
  const description = app.describeAssistant.execute();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-medium">Ask about your setup</h1>
        <p className="mt-1 text-sm">
          I can read your agents, your strategies, and the record of what
          Grid-Commander has done on your behalf. I cannot change anything.
        </p>
      </div>

      <form method="get" className="space-y-3">
        {/*
          Above the label, not between it and its input. Rendering it showed the
          block splitting "Your question" from the box it names — programmatically
          still associated, visually two separate things. It is context for the
          whole form, so it belongs before the form's first field rather than
          inside the pair.
        */}
        <AssistantDisclosureNote description={description} />

        <label htmlFor="q" className="block text-sm font-medium">
          Your question
        </label>

        <input
          id="q"
          name="q"
          type="text"
          defaultValue={q ?? ''}
          placeholder="Which of my agents are bound to Berlin?"
          className="w-full rounded border p-2"
        />
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Ask
        </button>
      </form>

      {answer && <AssistantAnswer answer={answer} />}
    </main>
  );
}
