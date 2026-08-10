import type { AccountStatePort } from '@/ports/account.js';
import type { FailureCause } from '@/ports/failure.js';

/**
 * Could this account stake money through MCP, if anything asked it to?
 *
 * The arena is watch-only by decision, and its page says so. This answers the
 * question that sentence leaves open: whether the *account* would permit an
 * MCP-signed wager at all. Two independent gates stand between this product
 * and a stake — BattleGrid's `mcpWagerEnabled` setting on the account, and the
 * absence of `mcp:wager` from the scopes this product requests. The second is
 * a standing decision (D-3, guarded); the first is the platform's answer and
 * can change without this product knowing, so it is read, never assumed.
 */

export interface ReadWagerAuthorityRequest {
  readonly userId: string;
  readonly accessToken: string;
}

export type WagerAuthorityResult =
  /** The platform says no funded account exists — not "wagering disabled". */
  | { readonly kind: 'no-account' }
  | { readonly kind: 'authority'; readonly accountAllowsMcpWagers: boolean }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export class ReadWagerAuthorityQuery {
  constructor(private readonly account: AccountStatePort) {}

  async execute(req: ReadWagerAuthorityRequest): Promise<WagerAuthorityResult> {
    const result = await this.account.readAccountState(req);
    if (result.kind === 'unreadable') return result;
    if (!result.state.hasAccount) return { kind: 'no-account' };
    return { kind: 'authority', accountAllowsMcpWagers: result.state.mcpWagerEnabled };
  }
}
