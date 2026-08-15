import type { Agent, AgentStatus } from './agent.js';

/**
 * Where an agent is deployed to act, as the radar states it.
 *
 * Established live 2026-07-31: an agent acts only where a radar deployment
 * points it at a coin — per coin, one slot on duty at a time. Lifecycle
 * status says ACTIVE for a configured agent that is scanning nothing, and the
 * platform's own radar summary counts only deployed agents as active. These
 * types carry the distinction the status hides.
 *
 * **The radar was read as the whole answer, and it is half of one.**
 * Established live 2026-08-06 on the second account: `SP500@15m` holds one
 * slot, and the agent in it — `Volatilis` — is ARCHIVED. The radar reports
 * that slot exactly as it reports an active agent's, so a derivation reading
 * only the radar rendered *"On duty: scanning SP500 on the 15m radar."* for an
 * agent that scans nothing, and left SP500 looking covered when nothing covers
 * it.
 *
 * Standing is therefore a property of the **pair** — the deployment and the
 * agent's lifecycle — and every function below takes the lifecycle rather than
 * trusting each surface to remember the check. Doing it per call site is how
 * the roster and the agent page come to disagree; doing it here makes both
 * honest at once.
 */

/**
 * The lifecycle half of that pair.
 *
 * `Pick` rather than the whole `Agent`: standing depends on the id and the
 * status and on nothing else, and a signature taking an `Agent` would invite
 * the brain, the binding or the trading config into a rule that must not
 * depend on them.
 */
export type AgentLifecycle = Pick<Agent, 'id' | 'status'>;

export interface RadarDeployment {
  readonly policyId: string;
  readonly coinTicker: string;
  /**
   * The platform's optimistic-concurrency counter for this policy. Every
   * write must present it as `expectedRevision`; a stale value is refused by
   * BattleGrid, which is the protection working.
   */
  readonly revision: number;
  readonly timeframe: string;
  readonly enabled: boolean;
  /** Every agent slotted into this deployment's rotation. */
  readonly slotAgentIds: readonly string[];
  /** The agent the radar resolves as on duty right now, if it said. */
  readonly onDutyAgentId: string | null;
  /** The agent holding an open position here, if any. */
  readonly openPositionAgentId: string | null;
  /**
   * What the platform resolved about this deployment right now, or `null` where
   * it resolved nothing.
   *
   * `null` is a real answer and is not "qualifying". A payload carrying no
   * resolution supports neither statement, the same way a deployment naming an
   * agent whose lifecycle was not read supports neither "covered" nor
   * "unscanned".
   */
  readonly resolution: RadarResolution | null;
}

/**
 * The platform's own account of why a deployment is or is not acting.
 *
 * `resolvesNow` carries twenty-two fields and this product read two of them —
 * the on-duty and open-position ids — until 2026-08-13. On that day fifteen of
 * twenty deployments on the operator's account were **not qualifying**, each
 * with a named block, and every one of them rendered as an ordinary deployment.
 *
 * Everything here is carried, not interpreted. The observed block vocabulary is
 * two values from twenty rows on one account, so a value this product has not
 * seen is still a value the platform meant — see `qualificationBlock`.
 */
export interface RadarResolution {
  /**
   * Whether the platform qualified this deployment to act.
   *
   * `null` where it did not say. Distinct from `false`: one is "the platform
   * declined", the other is "the platform was silent", and only the first is
   * something to tell an operator.
   */
  readonly qualified: boolean | null;
  /**
   * The platform's own token for what stopped it — `AGGREGATE_BELOW_MIN` and
   * `ATR_VOLATILITY_BELOW_MIN` are the two observed, on 2026-08-13.
   *
   * **Carried verbatim and never translated.** Two values from one account is
   * not a vocabulary, and rendering an unseen token as a sentence of ours would
   * invent a meaning for a value whose range is unknown.
   */
  readonly qualificationBlock: string | null;
  /**
   * The resolution state the platform reported — `SCANNING` is the only value
   * observed here, across two major versions.
   *
   * Carried as the platform's string rather than a modelled union, deliberately.
   * The platform declares states this product has never seen, `BLOCKED` among
   * them, and a union would either omit them or force one to be invented. A
   * state that is carried can be *named* as unrecognised the day it first
   * arrives, which is the honest rendering and needs no anticipation.
   */
  readonly section: string | null;
  /** When the deployment may act again, where it is sitting one out. */
  readonly cooldownUntil: Date | null;
  /**
   * Whether that cooldown is still running, decided in the read.
   *
   * Measured against the injected clock rather than in the component, because
   * `Clock` exists so that what a page *says* can be pinned by a test — a
   * comparison against `Date.now()` inside a component is a different string on
   * every run, and `tests/architecture/boundaries.test.ts` refuses it. `null`
   * where there is no cooldown to be running.
   */
  readonly cooldownActive: boolean | null;
  /** The market regime the platform judged it in, and how strongly. */
  readonly regime: string | null;
  readonly regimeConviction: string | null;
}

/** The resolution states this product recognises. Anything else is named, not mapped. */
const KNOWN_SECTIONS = ['SCANNING', 'IDLE'] as const;

/**
 * Whether the product recognises a resolution state.
 *
 * The negative is what callers need: an unrecognised section must be shown as
 * itself rather than presented as scanning or idle, because presenting it either
 * way is a claim the product cannot support. `BLOCKED` is declared by the
 * platform and has never been observed here — this is what lets it arrive
 * honestly without being modelled first.
 */
export function isRecognisedSection(section: string | null): boolean {
  return section !== null && (KNOWN_SECTIONS as readonly string[]).includes(section);
}

/**
 * One agent's standing in one deployment. Ordered by how much is at stake:
 * holding a position outranks being on duty, which outranks waiting in the
 * rotation — the same order a user would ask about them.
 *
 * `slot-held-not-scanning` is the state the radar cannot express. An agent
 * that is not ACTIVE still occupies its slot and the radar still names it, so
 * every other reading of this pair says *acting*. It is not: it holds the
 * slot, and the market gets nothing from it.
 */
export type DeploymentStanding =
  | 'holding-position'
  | 'on-duty'
  | 'in-rotation'
  | 'slot-held-not-scanning';

/**
 * Whether anything this deployment names is still ACTIVE.
 *
 * Deliberately not "is this market being scanned". Only the negative is
 * claimed: `no-active-agent` means every agent the radar attaches to this
 * policy is out of the lifecycle that could scan it, which is a fact about the
 * pair. `active-agent-present` claims nothing beyond its own words — a policy
 * can carry `enabled: false`, and this product does not read what BattleGrid
 * schedules — so a surface must not turn it into "covered".
 *
 * `unknown` is a slot naming an agent whose lifecycle was not among those
 * read. Neither claim is available then, and silence is the honest answer.
 */
export type SlotOccupancy = 'active-agent-present' | 'no-active-agent' | 'unknown';

export interface AgentDeployment {
  readonly coinTicker: string;
  readonly timeframe: string;
  readonly standing: DeploymentStanding;
  /**
   * What the *market* has, alongside what this agent is doing in it.
   *
   * A property of the policy rather than of the agent, carried on the agent's
   * row because that is the only place this product describes the policy at
   * all: an operator reading "15 deployments" believes fifteen markets are
   * covered, and on 2026-08-06 one of them held nothing but an archived agent.
   */
  readonly occupancy: SlotOccupancy;
  /**
   * What the platform resolved about this market right now, or `null`.
   *
   * A third axis, and independent of the other two. `standing` says what this
   * agent is doing in the slot; `occupancy` says what the market has; this says
   * whether the platform is letting anything happen. On 2026-08-13 fifteen of
   * twenty deployments were on duty, occupied, and **not qualifying** — three
   * facts that were all true at once, of which the surface could state two.
   */
  readonly resolution: RadarResolution | null;
}

/**
 * Every deployment that names this agent at all — membership, before anything
 * is read into it.
 *
 * Slot membership is what "deployed" means; on-duty and position-holder are
 * refinements the radar volunteers. Separated from `deploymentsFor` because
 * two callers want only the markets — which coins to screen, and whether an
 * undeploy has anything to remove — and neither is asking what the agent is
 * doing there. Making those callers supply a lifecycle they do not hold would
 * teach them to invent one.
 */
export function deploymentsNaming(
  deployments: readonly RadarDeployment[],
  agentId: string,
): readonly RadarDeployment[] {
  return deployments.filter(
    (d) =>
      d.slotAgentIds.includes(agentId) ||
      d.onDutyAgentId === agentId ||
      d.openPositionAgentId === agentId,
  );
}

/**
 * The deployments that name this agent, with its standing in each and what
 * else the market holds.
 *
 * An agent can hold the position while another is on duty, so the standing is
 * computed per deployment, not globally. `roster` is every lifecycle the
 * caller could read — the subject's own is passed separately because standing
 * cannot be computed without it, and a lookup that could miss would have to
 * invent one.
 */
export function deploymentsFor(
  deployments: readonly RadarDeployment[],
  agent: AgentLifecycle,
  roster: readonly AgentLifecycle[],
  now: Date,
): readonly AgentDeployment[] {
  const lifecycles = new Map<string, AgentStatus>(roster.map((a) => [a.id, a.status]));
  return deploymentsNaming(deployments, agent.id).map((d) => ({
    coinTicker: d.coinTicker,
    timeframe: d.timeframe,
    standing: standingIn(d, agent),
    occupancy: occupancyOf(d, lifecycles),
    resolution: d.resolution && {
      ...d.resolution,
      cooldownActive:
        d.resolution.cooldownUntil === null
          ? null
          : d.resolution.cooldownUntil.getTime() > now.getTime(),
    },
  }));
}

function standingIn(d: RadarDeployment, agent: AgentLifecycle): DeploymentStanding {
  /**
   * Holding a position outranks the lifecycle, not only the rotation.
   *
   * The radar attributing an open position to this agent is a statement about
   * money that is at stake now, and an archive is not evidence the position
   * closed. Suppressing it because the agent is out of lifecycle would hide
   * the one thing on this row that can still cost the operator something —
   * the same reasoning that keeps a position-holder deployed after a
   * re-slotting drops it from the slots.
   */
  if (d.openPositionAgentId === agent.id) return 'holding-position';
  if (agent.status !== 'ACTIVE') return 'slot-held-not-scanning';
  if (d.onDutyAgentId === agent.id) return 'on-duty';
  return 'in-rotation';
}

/**
 * Every agent this policy names, weighed against the lifecycles that were
 * read.
 *
 * The position holder counts as one of them although it is not a scanner: the
 * claim `no-active-agent` is the strongest thing said about a market here, and
 * making it while an active agent has money on that market would be the same
 * kind of overreach this whole change exists to remove.
 */
function occupancyOf(
  d: RadarDeployment,
  lifecycles: ReadonlyMap<string, AgentStatus>,
): SlotOccupancy {
  const named = new Set<string>(d.slotAgentIds);
  if (d.onDutyAgentId) named.add(d.onDutyAgentId);
  if (d.openPositionAgentId) named.add(d.openPositionAgentId);

  let unread = false;
  for (const id of named) {
    const status = lifecycles.get(id);
    if (status === undefined) unread = true;
    else if (status === 'ACTIVE') return 'active-agent-present';
  }
  // An unread lifecycle among them means the negative cannot be claimed —
  // "nobody is scanning this" is exactly the sentence that must not be said on
  // the strength of an agent nobody looked up.
  return unread || named.size === 0 ? 'unknown' : 'no-active-agent';
}

/**
 * Every agent's deployments at once — the roster's question. Built from the
 * same membership-and-standing rules as `deploymentsFor`, so the roster and
 * the detail page cannot disagree about whether an agent is acting.
 *
 * Keyed by the agents whose lifecycle the caller read, not by the agents the
 * radar names. An agent in a slot and absent from the roster has no lifecycle
 * to judge its standing against, and this map exists to be looked up by the
 * rows the roster is about to render — which are exactly the agents passed in.
 */
export function deploymentsByAgent(
  deployments: readonly RadarDeployment[],
  roster: readonly AgentLifecycle[],
  now: Date,
): Readonly<Record<string, readonly AgentDeployment[]>> {
  const byAgent: Record<string, readonly AgentDeployment[]> = {};
  for (const agent of roster) byAgent[agent.id] = deploymentsFor(deployments, agent, roster, now);
  return byAgent;
}

/**
 * Whether the radar is running at all, and how much of it the platform has
 * stopped.
 *
 * BattleGrid reports this **once for the fleet**, in `list_radar_deployments`'s
 * `summary` — there is no per-deployment pause field, so a row's standing
 * cannot know it. That asymmetry is the whole reason this type exists
 * separately from `AgentDeployment`: standing is a claim about which agent the
 * radar *would* resolve to, and it stays true while nothing is scanning. The
 * pause is a claim about whether anything is happening at all, and it belongs
 * beside standing rather than inside it.
 *
 * ## Two facts, not one
 *
 * `radarPaused` is a boolean about the radar. `platformPaused` is a **count**
 * of deployed coins the platform has stopped. They are different shapes with
 * different remedies, and an operator told only "paused" cannot tell whether
 * their own radar is off or the platform has stopped some of their coins — so
 * they are never reduced to one claim.
 *
 * ## Every field is nullable, and that is the point
 *
 * A radar answer that carries no summary is a read that did not answer, not a
 * running radar. Mapping absence to `false` would state, on this product's
 * authority, that automation is running. That substitution has already been
 * made here once — `regimeAutoDerive`'s `=== true` turned platform silence into
 * a confident `false` at v19 — and it is the same shape.
 */
export interface RadarPause {
  /** `null` where the platform did not say. Never defaulted to `false`. */
  readonly radarPaused: boolean | null;
  /** Deployed coins the platform has paused. `null` where it did not say. */
  readonly platformPaused: number | null;
  /** What the counts above are counted over. */
  readonly coinsDeployed: number | null;
  /** Deployed coins the platform reports as actually scanning. */
  readonly scanning: number | null;
}

/** Nothing was reported. Distinct from a radar reported as running. */
export function pauseIsUnknown(pause: RadarPause): boolean {
  return (
    pause.radarPaused === null &&
    pause.platformPaused === null &&
    pause.coinsDeployed === null &&
    pause.scanning === null
  );
}

/**
 * Whether the radar is stopped.
 *
 * `=== true` deliberately, so `null` is never truthy — and, just as
 * deliberately, this has no negative twin. "Is the radar running" is a question
 * this product cannot answer from an absent field, and offering a
 * `radarIsRunning()` would invite exactly the `!paused` that the nullability
 * above exists to prevent.
 */
export function radarIsPaused(pause: RadarPause): boolean {
  return pause.radarPaused === true;
}

/** Deployments the platform stopped, where it said so and the number is real. */
export function platformStopped(pause: RadarPause): number | null {
  return pause.platformPaused !== null && pause.platformPaused > 0 ? pause.platformPaused : null;
}
