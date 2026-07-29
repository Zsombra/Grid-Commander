/**
 * Which agent this page is about, and the way back to it.
 *
 * Two callers, not shared chrome. `/thinking` and `/limits` were the two pages
 * added most recently and the only two that named no agent: their headings read
 * "What this agent decided" and "What would stop this agent" on an account with
 * eleven agents. `journal` says "THE .0's journal" and `edit` says "Edit THE .0";
 * the pattern existed and these broke it.
 *
 * On limits it was the sharper failure. The page renders
 *
 *     Nothing will stop this agent on Loss in a day, Loss in total.
 *
 * about an agent it did not name, with no link to the page where the money is
 * described. A surface that reports something alarming and identifies neither
 * the subject nor a next step leaves the reader further from a fix than when
 * they arrived.
 *
 * The sibling link is here for the same reason: "why did it act" and "what would
 * stop it" are one question asked from two ends, and someone reading either will
 * want the other.
 */
export function AgentPageHeading({
  subject,
  agentId,
  agentName,
  sibling,
}: {
  /** What the page shows, phrased to follow a name: "what it decided". */
  subject: string;
  agentId: string;
  /** What the roster calls it. Absent when the roster could not be read. */
  agentName: string | null;
  sibling: { readonly href: string; readonly label: string };
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-medium text-text-primary">
        {/**
         * The name leads, and the heading still reads when there is none.
         *
         * Silent rather than substituted when the roster did not load. "This
         * agent" says nothing while looking like an answer, and the id is not
         * what the user calls it — a page whose subject is unknown should say
         * less, not something wrong.
         */}
        {agentName === null
          ? subject.charAt(0).toUpperCase() + subject.slice(1)
          : `${agentName} — ${subject}`}
      </h1>
      <nav aria-label="This agent" className="flex flex-wrap gap-3 text-sm">
        <a href={`/agents/${agentId}`} className="underline">
          {agentName === null ? 'Back to the agent' : `Back to ${agentName}`}
        </a>
        <a href={sibling.href} className="underline">
          {sibling.label}
        </a>
      </nav>
    </header>
  );
}
