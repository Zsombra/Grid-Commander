import type { Agent } from '@/domain/agent/agent.js';
import { isEditable } from '@/domain/agent/agent.js';
import type { RejectedField } from '@/domain/agent/field-ownership.js';
import { partitionEdit } from '@/domain/agent/field-ownership.js';
import type { ValidationIssue } from '@/domain/agent/trading-config.js';
import { applyEdit, validateTradingConfig } from '@/domain/agent/trading-config.js';
import type { AgentsPort } from '@/ports/agents.js';

export interface UpdateAgentRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  /** Agent-owned fields only. Anything else is refused, not filtered silently. */
  readonly changes: Readonly<Record<string, unknown>>;
  /** Individual trading-config fields to change. Merged onto the current config. */
  readonly tradingConfigChanges?: Readonly<Record<string, unknown>> | undefined;
  /**
   * Issued by `ProposeEditCommand` against this agent. Required, not optional:
   * BattleGrid marks `update_intelligence_agent` destructive, and the guard
   * refuses without one. Making it optional here would move the failure from
   * the type checker to a live call, which is where it lived until now.
   */
  readonly confirmationToken: string;
}

export type UpdateAgentResult =
  | { readonly kind: 'updated'; readonly agent: Agent }
  | { readonly kind: 'not-editable'; readonly reason: string }
  | { readonly kind: 'rejected'; readonly rejected: readonly RejectedField[] }
  | { readonly kind: 'invalid'; readonly issues: readonly ValidationIssue[] };

/**
 * Change what an agent owns.
 *
 * Reads the agent first, and that read is a correctness requirement rather than
 * a convenience. `tradingConfig` is all-or-nothing on the platform: every field
 * is required once the object is present, and a partial send does not error —
 * it resets the omitted fields to the server's defaults. A user who changed
 * `maxLeverage` would silently lose their `maxDailyLossUsd`. See design D-E.
 *
 * The read is also where the revision comes from, which is the other reason it
 * cannot be skipped.
 */
export class UpdateAgentCommand {
  constructor(private readonly agents: AgentsPort) {}

  async execute(req: UpdateAgentRequest): Promise<UpdateAgentResult> {
    const agent = await this.agents.getAgent(req);

    if (!isEditable(agent)) {
      return {
        kind: 'not-editable',
        reason:
          agent.status === 'ARCHIVED'
            ? `${agent.displayName} is archived. Reactivate it before editing.`
            : `BattleGrid does not permit this client to edit ${agent.displayName}.`,
      };
    }

    const { accepted, rejected } = partitionEdit(req.changes);
    if (rejected.length > 0) return { kind: 'rejected', rejected };

    let changes = accepted;

    if (req.tradingConfigChanges) {
      const current = agent.tradingConfig;
      if (!current) {
        return {
          kind: 'invalid',
          issues: [
            {
              field: 'tradingConfig',
              reason:
                'This agent has no trading configuration to edit. Set one in full rather than in part.',
            },
          ],
        };
      }

      const edit = applyEdit(current, req.tradingConfigChanges);

      /**
       * A partial `tradingConfig` does not error — it resets what it omits. So
       * a merge that came out short is the one case where sending is worse than
       * refusing, and the create path has always refused it. This is that check,
       * arriving on the edit path where it was missing.
       */
      if (edit.missing.length > 0) {
        return {
          kind: 'invalid',
          issues: edit.missing.map((field) => ({
            field,
            reason:
              'This agent’s configuration has no value for it, and a partial ' +
              'send would reset the fields it omits. Set the configuration in full.',
          })),
        };
      }

      const merged = edit.config;

      const catalogResult = await this.agents.readCatalog(req);
      if (catalogResult.kind === 'unreadable') {
        // Without the catalog there is nothing to validate against, and sending
        // unvalidated money limits is exactly what the requirement forbids.
        return {
          kind: 'invalid',
          issues: [{ field: 'tradingConfig', reason: catalogResult.reason }],
        };
      }

      const issues = validateTradingConfig(merged, catalogResult.catalog);
      if (issues.length > 0) return { kind: 'invalid', issues };

      changes = { ...changes, tradingConfig: merged.fields };
    }

    const updated = await this.agents.updateAgent({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
      expectedRevision: agent.revision,
      changes,
      confirmationToken: req.confirmationToken,
    });
    return { kind: 'updated', agent: updated };
  }
}
