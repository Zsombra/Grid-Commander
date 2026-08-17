import type { Scope } from '@/domain/connection/scope.js';
import { asSubject } from '@/domain/connection/subject.js';
import type {
  AccountIdentityResult,
  AccountPort,
  AccountStatePort,
  AccountStateResult,
} from '@/ports/account.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';
import { malformed, unreadable } from './unreadable.js';
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

  async subjectFor(
    accessToken: string,
    grantedScopes?: readonly Scope[] | undefined,
  ): Promise<AccountIdentityResult> {
    /**
     * Three outcomes, reported rather than decided.
     *
     * This used to catch everything into `null`, and that was right for the one
     * caller it had: a personal deployment must keep working without knowing its
     * own account id, and refusing on an unknown is what made
     * `apply_strategy_plan` unreachable. It became wrong the moment a second
     * caller appeared for whom the answer *is* the identity — see the port.
     *
     * The tool being gone after a deployment and the platform naming nobody are
     * kept apart because they have different remedies: one is waited out, the
     * other never resolves on its own. Flattening them is how the original
     * defect read as an outage when it was a question asked of the wrong place.
     */
    let result;
    try {
      result = await this.battlegrid.callTool({
        // No session and no local row to attribute this to: it runs before an
        // identity exists, which is the point of it.
        userId: OWNER_USER_ID,
        accessToken,
        tool: 'list_user_active_positions',
        args: {},
        // The authority to judge this call by, because there is nowhere to look
        // it up: a delegated connection is not stored until this read answers,
        // so the guard would otherwise measure the call against a connection
        // that does not exist yet and refuse it for lacking `mcp:read` — while
        // holding a grant that carries `mcp:read`. Omitted on a personal
        // deployment, whose authority is declared in configuration.
        grantedScopes,
      });
    } catch (err) {
      return unreadable(err);
    }

    const payload = result.content as Record<string, unknown> | null;
    if (payload === null || typeof payload !== 'object') {
      return malformed('the account read returned no payload to identify an account from');
    }

    const subject = payload['userId'];
    if (typeof subject !== 'string' || subject.length === 0) {
      // The call answered. It simply named nobody — which is a fact about the
      // account, not about the connection to BattleGrid, and waiting will not
      // change it.
      return { kind: 'unnamed', reason: 'BattleGrid answered without naming an account' };
    }

    // Asserted here because this value came from BattleGrid, which is the only
    // place the assertion is legitimate.
    return { kind: 'subject', subject: asSubject(subject) };
  }
}

/**
 * `get_account_state`, read for the money behind an agent's caps.
 *
 * A separate adapter from `McpAccountAdapter` above, mirroring the port split:
 * that one swallows failure into `null` because identity must never block a
 * deployment, and this one must report it, because a surface that cannot tell
 * *unreadable* from *empty* is the failure this product is built against.
 *
 * The tool was reachable and unread for the life of the product. The comment
 * above — explaining, correctly, that `get_account_state` carries no account id
 * — is why: it settled that this tool was not the answer to *which account is
 * this*, and nothing revisited whether it answered anything else. It answers
 * six things, and the balance is one of them.
 */
export class McpAccountStateAdapter implements AccountStatePort {
  constructor(private readonly battlegrid: BattleGridPort) {}

  async readAccountState(params: {
    userId: string;
    accessToken: string;
  }): Promise<AccountStateResult> {
    try {
      const result = await this.battlegrid.callTool({
        userId: params.userId,
        accessToken: params.accessToken,
        tool: 'get_account_state',
        args: {},
      });
      const payload = result.content as Record<string, unknown> | null;
      if (payload === null || typeof payload !== 'object') {
        return malformed('BattleGrid returned no account state');
      }

      const balance = (payload['balance'] ?? {}) as Record<string, unknown>;
      const slots = (payload['agentSlots'] ?? {}) as Record<string, unknown>;

      return {
        kind: 'state',
        state: {
          balanceUsd: decimal(balance['usdc']),
          // Only an explicit `true` is a funded account. An absent field is not
          // a promise, and defaulting it the other way would render a balance
          // for an account the platform never said exists.
          hasAccount: balance['hasAccount'] === true,
          tradingWalletProvisioned: payload['tradingWalletProvisioned'] === true,
          mcpWagerEnabled: payload['mcpWagerEnabled'] === true,
          agentSlotLimit: whole(slots['limit']),
          agentSlotsUsed: whole(slots['used']),
        },
      };
    } catch (err) {
      return unreadable(err);
    }
  }
}

/**
 * A money figure the platform sends as a decimal string — `"43.667427"`.
 *
 * Parsed once, here, rather than at each call site: a caller comparing a cap
 * against a balance needs a number, and two call sites parsing for themselves
 * is how two screens come to disagree about the same money.
 *
 * `null` on anything unparseable, and on a non-finite result. Never `0` — a
 * balance of nothing and a balance nobody could read are different facts, and
 * this whole surface exists to keep such pairs apart.
 */
function decimal(raw: unknown): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A count, where the platform sends one. Null rather than a guessed zero. */
function whole(raw: unknown): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}
