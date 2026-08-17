'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import {
  editArguments,
  editIntent,
  MONEY_FIELDS,
  positionFromTransport,
  requiredText,
} from '@/presentation/form.js';
import { spending } from '@/presentation/confirmation-refusal.js';

/**
 * Apply what was agreed to.
 *
 * This spends a token it did not mint. The token came back on the form the
 * previous request rendered, which is the only arrangement in which a
 * confirmation attests to anything: a person read the consequence, then pressed
 * a button.
 */
export async function applyEdit(formData: FormData) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const agentId = requiredText(formData, 'agentId');
  const confirmationToken = requiredText(formData, 'confirmationToken');

  /**
   * Read by name, never by sweeping the form.
   *
   * This iterated `formData.entries()` and skipped the two keys it knew about,
   * which meant Next's own `$ACTION_ID_…` field arrived as a proposed change:
   *
   *     $ACTION_ID_405…: "$ACTION_ID_405…" is not a field this agent owns.
   *
   * Found by driving the real button in a browser — a hand-built request does
   * not carry that field, and no unit test would have invented it. `partitionEdit`
   * refused it rather than sending it, which is the layered defence working, but
   * a denylist of framework internals can never be complete. An allowlist can.
   */
  const intent = editIntent(
    {
      // `tc.` marks a trading-config field, so the two sets cannot be confused by
      // a name that appears in both. Stripped here, because the digest is over
      // the intent's own field names — the prefix is transport.
      get: (name) => {
        const value = formData.get(
          (MONEY_FIELDS as readonly string[]).includes(name) ? `tc.${name}` : name,
        );
        return typeof value === 'string' ? value : null;
      },
    },
    { name: ['displayName'], money: MONEY_FIELDS },
  );

  const { changes, tradingConfigChanges } = editArguments(intent);

  /**
   * The position object, off the same `pm.*` transport and through the same
   * coercion the review used — so the digest this request recomputes is the
   * digest the token was issued for. Merged under `tradingConfig` exactly as
   * the review merged it.
   */
  const position = positionFromTransport({
    get: (name) => {
      const value = formData.get(name);
      return typeof value === 'string' ? value : null;
    },
  });
  const fullConfig = position
    ? { ...(tradingConfigChanges ?? {}), positionManagement: position }
    : tradingConfigChanges;

  /**
   * The reason, and everything that was typed.
   *
   * Carrying only the reason sent the person back to a form re-rendered from
   * the agent's stored values — so a refusal naming one field cost them every
   * other one. Every submitted field except the confirmation binding rides
   * back; the token and revision are re-minted by the describe, and replaying
   * a stale pair is what the binding exists to prevent.
   *
   * Hoisted above the call so the **confirmation guard's own** refusal takes
   * this road too. This action was the eleventh confirmation spender and the
   * one #232 missed: the scan written to find them matched the literal
   * `confirmationToken:` and this file passes the token by shorthand, so the
   * guard reported a closed set of ten and stayed green over the route that
   * edits loss caps. A second press landed the edit, then rendered a framework
   * crash page to the person whose edit had just succeeded.
   */
  const backTo = (problem: string): never => {
    const back = new URLSearchParams({ problem });
    for (const [k, v] of formData.entries()) {
      if (k === 'agentId' || k === 'confirmationToken' || k === 'expectedRevision') continue;
      if (typeof v === 'string' && v.length > 0) back.set(k, v);
    }
    redirect(`/agents/${agentId}/edit?${back.toString()}`);
  };

  const result = await spending(
    () =>
      app.updateAgent.execute({
        ...user.authority,
        agentId,
        changes,
        ...(fullConfig ? { tradingConfigChanges: fullConfig } : {}),
        confirmationToken,
      }),
    backTo,
  );

  if (result.kind === 'updated') {
    /**
     * The other half of what BattleGrid just said.
     *
     * `update_intelligence_agent` answers with the agent **and** a feasibility
     * advisory — which of this agent's armed coins its strategy can still build
     * a stop for today, and which dial is stopping the rest. It is the only
     * place on the platform that answers it, it arrives on this write and on no
     * read, and it was discarded at the adapter for the life of the product
     * (#291).
     *
     * Issued here rather than collected by the page it renders on, because a
     * Next.js page render may not write cookies — only an action or a route
     * handler may. Signed, agent-keyed, and stale in two minutes:
     * `FeasibilityReplyCookie` carries the reasoning, and `null` is left alone
     * rather than issued as an empty answer.
     */
    if (result.feasibility) {
      app.feasibilityReply.issue({ agentId, advisory: result.feasibility });
    }
    redirect(`/agents/${agentId}`);
  }

  const reasons =
    result.kind === 'rejected'
      ? result.rejected.map((r) => `${r.field}: ${r.reason}`)
      : result.kind === 'invalid'
        ? result.issues.map((i) => `${i.field}: ${i.reason}`)
        : [result.reason];

  backTo(reasons.join(' · '));
}
