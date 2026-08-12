import type { RebindProposal } from '@/application/use-cases/rebind-agent.command.js';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from './control.js';

/**
 * The confirmation for the most destructive thing this product can do.
 *
 * The consequence text is passed in, not composed here. It is the same string
 * the confirmation token was issued against and stored with, so what the user
 * reads, what they agree to, and what the audit log can later prove are one
 * thing rather than three that drift.
 *
 * Note what the confirm control says. "OK" or "Confirm" would be a button that
 * agrees to nothing in particular.
 */
export function RebindConfirm({
  proposal,
  action,
}: {
  proposal: RebindProposal;
  /** The rebind itself. Required — a confirmation that confirms nothing is worse than none. */
  action: (formData: FormData) => Promise<void>;
}) {
  const { rebind, consequence, confirmationToken } = proposal;

  return (
    <form action={action} className="space-y-4">
      <h2 className="text-lg font-medium">
        Rebind {rebind.agentName} to {rebind.toStrategyName}?
      </h2>

      <div role="alert" className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm text-text-primary">
        <p className="font-medium">This replaces configuration. It is not a merge.</p>
        <p className="mt-2">{consequence}</p>
      </div>

      {/* The agent this confirmation is for. Its absence made every submit
          throw `FormError: agentId is required` before the use case was
          reached — the whole rebind write path, dead, and loudly: with no
          error boundary in the product it surfaced as a framework error page.
          `performRebind` has read this field since it was written; the form
          never sent it. Same class as `four-dead-write-paths`. */}
      <input type="hidden" name="agentId" value={rebind.agentId} />
      <input type="hidden" name="confirmationToken" value={confirmationToken} />
      <input type="hidden" name="toStrategyId" value={rebind.toStrategyId} />
      <input type="hidden" name="toStrategyRevision" value={rebind.toStrategyRevision} />
      <input type="hidden" name="expectedRevision" value={rebind.expectedRevision} />

      <div className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
        {/* Not danger-styled, for DT-0002's reason: the weight is on the
            consequence above, and a hazard-coloured control here would train a
            flinch at the action the page exists to offer. */}
        <button type="submit" className={`${BUTTON_PRIMARY} w-full tablet:w-auto`}>
          Replace {rebind.agentName}&apos;s configuration with {rebind.toStrategyName}&apos;s
        </button>
        <a href={`/agents/${rebind.agentId}`} className={`${BUTTON_SECONDARY} w-full tablet:w-auto`}>
          Keep it bound to {rebind.fromStrategyName}
        </a>
      </div>
    </form>
  );
}
