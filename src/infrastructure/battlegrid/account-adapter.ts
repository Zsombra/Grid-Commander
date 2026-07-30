import type { BattlegridSubject } from '@/domain/connection/subject.js';
import { asSubject } from '@/domain/connection/subject.js';
import type { AccountPort } from '@/ports/account.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { OWNER_USER_ID } from '@/application/use-cases/owner-only-user.js';

/**
 * `list_user_active_positions`, read for one field.
 *
 * **Chosen on observation, not on the reference.** `get_account_state` is the
 * obvious candidate by name and returns `username`, `balance`, `stats`,
 * `agentSlots`, `mcpWagerEnabled` and `tradingWalletProvisioned` — no id at all.
 * `list_user_active_positions` takes no parameters and returns `userId` at the top
 * level, and it appears in the *probed* section of
 * `docs/battlegrid-mcp-surface.json`, meaning a live call returned that shape.
 *
 * The reference has been right and unread here before — `enum(MANUAL|
 * VOLATILITY_AUTO)` sat in it for two days while the product sent a value that did
 * not exist — so agreement between document and observation is worth having, and
 * only one of the two is evidence.
 *
 * Reading a positions list to learn an account id is not elegant. It is what the
 * surface offers; inventing a nicer call would be inventing a tool.
 */
export class McpAccountAdapter implements AccountPort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async subjectFor(accessToken: string): Promise<BattlegridSubject | null> {
    /**
     * Every failure is `null`, and that is the whole contract.
     *
     * The tool may be absent after a deployment, the account may have no
     * positions, the call may fail. None of those is evidence about *which*
     * account this is, so none may produce anything but "unknown" — and unknown
     * must never become a refusal. Swallowing a failure is usually the wrong
     * instinct; here the alternative is a deployment that cannot apply a plan
     * because a positions read was down.
     */
    try {
      const result = await this.battlegrid.callTool({
        // No session and no local row to attribute this to: it runs before an
        // identity exists, which is the point of it.
        userId: OWNER_USER_ID,
        accessToken,
        tool: 'list_user_active_positions',
        args: {},
      });
      const payload = result.content as Record<string, unknown> | null;
      const subject = payload?.['userId'];
      // Asserted here because this value came from BattleGrid, which is the only
      // place the assertion is legitimate.
      return typeof subject === 'string' && subject.length > 0 ? asSubject(subject) : null;
    } catch {
      return null;
    }
  }
}
