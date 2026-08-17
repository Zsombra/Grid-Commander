import type { WagerAuthorityResult } from '@/application/use-cases/read-wager-authority.query.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * The two gates between this product and a stake, named beside the watch-only
 * stance.
 *
 * The arena page says playing is not offered. That sentence alone invites two
 * misreadings, one per gate: that flipping something in Grid-Commander would
 * enable play (no — the account's own `mcpWagerEnabled` decides whether MCP
 * may stake at all), and that the account setting is all that stands in the
 * way (no — this product requests `mcp:read` only, never the wager scope; the
 * D-3 guard holds that as a property, not a promise).
 *
 * The account gate is a live read and fails independently: losing it costs
 * these two sentences, never the sessions beside them.
 */
export function WagerAuthority({ wager }: { wager: WagerAuthorityResult }) {
  if (wager.kind === 'unreadable') {
    return (
      <div className="rounded-gc-2 border border-border-default p-3 text-sm space-y-1">
        <p>Whether this account permits MCP wagers could not be read: {wager.reason}</p>
        <WhyNotLoaded cause={wager.cause} subject="the account’s wager setting is" />
      </div>
    );
  }

  if (wager.kind === 'no-account') {
    return (
      <p className="text-sm">
        The platform reports no funded account, so staking is not yet a question this
        account can face — that is a missing account, not wagering switched off.
      </p>
    );
  }

  if (wager.accountAllowsMcpWagers) {
    /*
     * Not "it connects read-only" — that was this sentence's first form, and
     * it is the exact inference "Configuration Authority Is Described
     * Honestly" forbids: the scope this product holds can create, rebind and
     * archive agents.
     *
     * **"It never requests the wager scope" was this sentence's second form,
     * and `the-approval-can-be-answered` made it false.** The product now asks
     * for that authority in exactly one place — a step-up an operator begins
     * from a decision they are looking at — so the honest claim is the narrow
     * one: not at connect, not for the arena, and never without being asked.
     */
    return (
      <p className="text-sm">
        BattleGrid would allow MCP-signed wagers on this account. Grid-Commander still
        cannot place one: it never requests wager authority to play here, and holds none
        by default. The access it does hold can create and change your agents and
        strategies — each change confirmed with you first. The one thing that can ask for
        more is answering a trade your own agent proposed, and only if you go and grant it.
      </p>
    );
  }

  return (
    <p className="text-sm">
      BattleGrid does not allow MCP-signed wagers on this account — the platform’s own
      setting, standing before any decision of Grid-Commander’s. This product holds no
      wager scope either way.
    </p>
  );
}
