import type { CreateAgentResult } from '@/application/use-cases/create-agent.command.js';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import type { Agent } from '@/domain/agent/agent.js';
import type { ConfirmationStore } from '@/domain/capability/confirmation.js';
import {
  CONFIRMATION_TTL_SECONDS,
  confirmationTarget,
} from '@/domain/capability/confirmation.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { Clock } from '@/ports/clock.js';

/**
 * The throwaway agent a live write probe operates on — found, not minted.
 *
 * **Why this exists.** Every mutating probe created its own agent per run, with
 * `Date.now()` in the name so the second run would not collide with the archived
 * first one. That was the right fix for the collision and it made litter:
 * surveying the operator's second account on 2026-08-06 found eleven agents,
 * **eight of them ours** — `GC probe 1315`, `Grid-Commander probe (off)
 * 1785331191732`, `GC probe renamed 1785333064996` and five more, every one
 * archived and left standing. There is no delete on the MCP surface;
 * `archive_intelligence_agent` is the end of the road, and the payload's
 * `canDelete: true` describes BattleGrid's own app rather than this client
 * (findings-agents F-1). So the eight cannot be cleaned up from here at all —
 * only the bleeding can be stopped, which is what this module does. A probe asks
 * for its slot's agent and gets back the one it used last time, reactivated.
 * One agent per probe, for the life of the repository, instead of one per run.
 *
 * **What makes reuse safe is the selection, and it refuses on two independent
 * grounds.** Every agent the operator actually runs on these accounts is in
 * `FULL_EXECUTION`; selecting one and archiving it in a `finally` would stop a
 * live trader, which is a far worse outcome than the litter this replaces. So a
 * candidate must carry this repository's own naming convention **and** report
 * `tradingMode: OFF`. Either condition alone is not enough — a display name is a
 * string anyone can type, and OFF alone would match a real agent whose owner has
 * merely paused it. Both, or nothing is selected and a fresh throwaway is made.
 *
 * Nothing here creates an agent that could trade: `acquireProbeAgent` refuses to
 * compose a create whose `tradingMode` is anything but OFF, so the invariant the
 * selection depends on is established by the only code that mints one.
 */

/** Every throwaway this repository has ever minted starts with these words. */
export const PROBE_NAME_PREFIX = 'GC probe';

/** The only trading mode a throwaway is ever allowed to hold. */
export const PROBE_TRADING_MODE = 'OFF';

/**
 * One agent per probe file, not one shared between them.
 *
 * `vitest` runs test files in parallel, so `npx vitest run tests/live/` with the
 * opt-in set has two mutating probes in flight at once. Pointing both at a
 * single agent would have them reactivating, editing and archiving it
 * underneath each other and tripping its optimistic concurrency — the exact
 * failure a key in the environment caused across four probes on 2026-08-04, and
 * the reason `live-writes.test.ts` exists.
 */
export type ProbeSlot = 'write' | 'proposal';

/** What a throwaway for this slot is called, before any suffix. */
export function probeAgentPrefix(slot: ProbeSlot): string {
  return `${PROBE_NAME_PREFIX} ${slot}`;
}

/**
 * A name for a **new** throwaway, unique per run.
 *
 * Unique because an archived agent still holds its name, and a create colliding
 * with one comes back as `INTERNAL_ERROR: Internal server error` — a 500 that
 * reads exactly like the platform being unwell and was diagnosed as that for
 * half an hour. Reuse means this is reached far less often, and "far less often"
 * is not "never": a run whose predecessor left the agent in a state the
 * selection refuses will fall through to a create, and it must not fail on a
 * name.
 *
 * `note` is for a probe that renames its subject. It sits **before** the stamp
 * and after the prefix, so a renamed throwaway is still selected next run —
 * `GC probe write renamed 1785333064996` starts with `GC probe write`.
 */
export function probeAgentName(slot: ProbeSlot, note?: string): string {
  const middle = note === undefined || note === '' ? '' : ` ${note}`;
  return `${probeAgentPrefix(slot)}${middle} ${Date.now()}`;
}

/** The first condition: this repository named it, and named it for this slot. */
export function namedAsProbeAgent(agent: Agent, slot: ProbeSlot): boolean {
  return agent.displayName.startsWith(probeAgentPrefix(slot));
}

/**
 * The second condition: the platform reports it cannot trade.
 *
 * Read from what BattleGrid holds, and compared against the literal `OFF`.
 * An agent whose `tradingConfig` did not arrive answers `undefined` here and is
 * refused — a mode we could not read is not a mode we know to be off, and the
 * cost of being wrong is an operator's money rather than a failed test.
 */
export function probeAgentCannotTrade(agent: Agent): boolean {
  return agent.tradingConfig?.fields['tradingMode'] === PROBE_TRADING_MODE;
}

/** Both conditions. Never either. */
export function isReusableProbeAgent(agent: Agent, slot: ProbeSlot): boolean {
  return namedAsProbeAgent(agent, slot) && probeAgentCannotTrade(agent);
}

/**
 * The throwaway to reuse for this slot, or `null` to mint one.
 *
 * An ACTIVE candidate wins over an ARCHIVED one so a run that reuses does not
 * perform a reactivation it does not need. Beyond that the roster's own order
 * decides, which keeps the choice deterministic for a given roster.
 */
export function selectProbeAgent(roster: readonly Agent[], slot: ProbeSlot): Agent | null {
  const candidates = roster.filter((a) => isReusableProbeAgent(a, slot));
  return candidates.find((a) => a.status === 'ACTIVE') ?? candidates[0] ?? null;
}

export type ProbeAgentAcquisition =
  | { readonly kind: 'reused'; readonly agent: Agent; readonly reactivated: boolean }
  | { readonly kind: 'created'; readonly agent: Agent }
  /**
   * The probe has no subject and must say so rather than proceed. Distinct from
   * a failure: an account at its slot limit, or a platform that will not create
   * an agent today, is a state of the world and a probe reports it as a skip.
   */
  | { readonly kind: 'unavailable'; readonly reason: string };

/**
 * Find this slot's throwaway, or make one — reaching `create` only as the
 * documented last resort.
 *
 * `strategyId` is only used by the create path; a caller resolves it anyway,
 * because both probes already read the strategy list as a precondition.
 */
export async function acquireProbeAgent(params: {
  readonly agents: AgentsPort;
  readonly who: { readonly userId: string; readonly accessToken: string };
  readonly slot: ProbeSlot;
  /** What a **new** throwaway is bound to. Binding does not modify the strategy. */
  readonly strategyId: string;
  /** The money answers BattleGrid refuses to default. Must name OFF. */
  readonly money: Readonly<Record<string, unknown>>;
}): Promise<ProbeAgentAcquisition> {
  if (params.money['tradingMode'] !== PROBE_TRADING_MODE) {
    // Refused here rather than trusted to a call site. The selection's second
    // condition is only worth anything if the thing being selected was created
    // unable to trade in the first place.
    return {
      kind: 'unavailable',
      reason:
        `a throwaway is created in ${PROBE_TRADING_MODE}, not ` +
        `${JSON.stringify(params.money['tradingMode'])}`,
    };
  }

  const roster = await params.agents.listAgents(params.who);
  if (roster.kind === 'unreadable') {
    /**
     * Not a fallback to create, deliberately.
     *
     * A probe that cannot read the roster cannot know whether its throwaway
     * already exists, and creating on that ignorance is precisely the behaviour
     * that accumulated eight of them. `listAgents` asks for
     * `statuses: ['ACTIVE', 'ARCHIVED']`, so a readable roster carries the
     * archived ones and absence really is absence.
     */
    return { kind: 'unavailable', reason: `the roster could not be read: ${roster.reason}` };
  }

  const held = roster.kind === 'agents' ? roster.agents : [];
  const existing = selectProbeAgent(held, params.slot);

  if (existing !== null) {
    let current: Agent;
    try {
      // What the platform holds, not what the roster said a moment ago. The
      // revision comes from here too, and a teardown that assumed nothing had
      // moved is how a probe once left a live agent behind.
      current = await params.agents.getAgent({ ...params.who, agentId: existing.id });
    } catch (err) {
      return { kind: 'unavailable', reason: `${existing.displayName} could not be re-read: ${messageOf(err)}` };
    }

    // Both conditions again, against the fresher read. The roster row is a
    // snapshot; the decision to write to somebody's agent is made against what
    // that agent holds now.
    if (!isReusableProbeAgent(current, params.slot)) {
      return {
        kind: 'unavailable',
        reason:
          `${current.displayName} no longer qualifies as a throwaway ` +
          '(the roster and the re-read disagree), so nothing was touched',
      };
    }

    if (current.status === 'ACTIVE') {
      return { kind: 'reused', agent: current, reactivated: false };
    }

    try {
      await params.agents.setLifecycle({
        ...params.who,
        agentId: current.id,
        expectedRevision: current.revision,
        // Reactivating is `activate_intelligence_agent`, which BattleGrid
        // annotates `destructiveHint: false` — so the guard wants no
        // confirmation and none is invented. Archiving, at the other end, is
        // destructive and `releaseProbeAgent` supplies one.
        to: 'ACTIVE',
      });
    } catch (err) {
      // Reactivation is subject to the per-rank slot limit, so "the account is
      // full" arrives here rather than at create.
      return {
        kind: 'unavailable',
        reason: `${current.displayName} could not be reactivated: ${messageOf(err)}`,
      };
    }

    try {
      // What the platform holds after the activation, not what it said about
      // it. The caller's next write carries this revision.
      const active = await params.agents.getAgent({ ...params.who, agentId: current.id });
      return { kind: 'reused', agent: active, reactivated: true };
    } catch (err) {
      // Reported rather than thrown, like every other outcome here: a caller
      // that skips on `unavailable` must not have to also catch. The agent is
      // left ACTIVE, which the next run's selection prefers and archives.
      return {
        kind: 'unavailable',
        reason: `${current.displayName} was reactivated and could not be re-read: ${messageOf(err)}`,
      };
    }
  }

  let created;
  try {
    created = await new CreateAgentCommand(params.agents).execute({
      ...params.who,
      displayName: probeAgentName(params.slot),
      brain: { kind: 'preset', preset: 'ROMMEL' },
      strategyId: params.strategyId,
      money: params.money,
    });
  } catch (err) {
    // `create_intelligence_agent` answered `INTERNAL_ERROR` for both accounts,
    // every SYSTEM strategy and the minimal payload on 2026-08-05. A platform
    // that will not create today is a state of the world, not a failed probe.
    return { kind: 'unavailable', reason: `no throwaway could be created: ${messageOf(err)}` };
  }

  if (created.kind !== 'created') {
    return { kind: 'unavailable', reason: `no throwaway could be created: ${refusalOf(created)}` };
  }
  return { kind: 'created', agent: created.agent };
}

export type ProbeAgentRelease =
  | { readonly kind: 'archived'; readonly agent: Agent }
  | { readonly kind: 'failed'; readonly reason: string };

/**
 * Put the throwaway back the way the next run expects to find it: archived, and
 * still unable to trade.
 *
 * Archiving rather than leaving it ACTIVE because an active agent holds one of
 * the account's three slots, and because ARCHIVED is the resting state the eight
 * leftovers are already in — the selection reads the same either way.
 *
 * The revision is re-read here and not taken from the caller. A probe archived
 * at the revision it captured before its own rename, the platform refused with a
 * revision conflict, and the probe left a live agent on the operator's account —
 * which is precisely what a teardown exists to prevent.
 */
export async function releaseProbeAgent(params: {
  readonly agents: AgentsPort;
  readonly confirmations: ConfirmationStore;
  readonly clock: Clock;
  readonly who: { readonly userId: string; readonly accessToken: string };
  readonly agentId: string;
  /** Distinct per probe: `FakeConfirmationStore` refuses to reissue a live one. */
  readonly confirmationToken: string;
}): Promise<ProbeAgentRelease> {
  try {
    const current = await params.agents.getAgent({ ...params.who, agentId: params.agentId });
    if (current.status === 'ARCHIVED') return { kind: 'archived', agent: current };

    await params.confirmations.issue({
      token: params.confirmationToken,
      userId: params.who.userId,
      tool: 'archive_intelligence_agent',
      // Built rather than composed inline. `archive` carries no values beyond
      // the agent, which is what `confirmationTarget.agent` is for.
      target: confirmationTarget.agent(params.agentId),
      consequence: `Archives the probe agent "${current.displayName}".`,
      expiresAt: new Date(params.clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });

    const archived = await params.agents.setLifecycle({
      ...params.who,
      agentId: params.agentId,
      expectedRevision: current.revision,
      to: 'ARCHIVED',
      confirmation: { token: params.confirmationToken, target: confirmationTarget.agent(params.agentId) },
    });
    return { kind: 'archived', agent: archived };
  } catch (err) {
    // Reported, never thrown: this runs in a `finally`, and an exception here
    // would replace the failure the probe was actually about.
    return { kind: 'failed', reason: messageOf(err) };
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Why the create command declined, in the words it declined with. */
function refusalOf(result: Exclude<CreateAgentResult, { kind: 'created' }>): string {
  switch (result.kind) {
    case 'invalid':
      return result.issues.map((i) => `${i.field}: ${i.reason}`).join(' | ');
    case 'at-capacity':
      return result.explanation;
    case 'no-catalog':
      return result.reason;
    case 'duplicate':
      // A probe re-running with a reused key. The outcome is a field, so the
      // sentence can be composed here without parsing anything.
      return result.originalOutcome === 'succeeded'
        ? 'this key already created an agent — the earlier run worked'
        : 'this key already has an attempt with no recorded outcome';
  }
}
