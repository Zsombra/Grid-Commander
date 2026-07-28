import type { RebindProposal } from '@/application/use-cases/rebind-agent.command.js';

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

      <div role="alert" className="rounded border p-4 text-sm">
        <p className="font-medium">This replaces configuration. It is not a merge.</p>
        <p className="mt-2">{consequence}</p>
      </div>

      <input type="hidden" name="confirmationToken" value={confirmationToken} />
      <input type="hidden" name="toStrategyId" value={rebind.toStrategyId} />
      <input type="hidden" name="expectedRevision" value={rebind.expectedRevision} />

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Replace {rebind.agentName}&apos;s configuration with {rebind.toStrategyName}&apos;s
        </button>
        <a href={`/agents/${rebind.agentId}`} className="px-4 py-2 text-sm underline">
          Keep it bound to {rebind.fromStrategyName}
        </a>
      </div>
    </form>
  );
}
