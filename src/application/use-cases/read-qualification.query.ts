import { deploymentsNaming } from '@/domain/agent/deployment.js';
import type { AgentsPort, QualificationResult } from '@/ports/agents.js';
import type { MarketPort } from '@/ports/market.js';
import type { RadarPort } from '@/ports/radar.js';

/**
 * Would this agent take these coins, right now — and if not, what stops it?
 *
 * The only prospective read in the product. Every other agent surface explains
 * something that already happened; this one answers the question an operator
 * has *while tuning*, which until now could only be answered by changing a
 * setting, waiting for a cycle, and reading the wreckage.
 *
 * Most of the code here is about **which coins get asked about**, because that
 * choice changes what the answer means. "Your agent would take none of these"
 * is a finding when the coins are the ones it is deployed on and a triviality
 * when the product picked them off a ranked list the agent has never looked at.
 * So the source travels with the result and every surface must state it.
 */

/** How many coins one call may screen — `get_agent_coin_qualification`'s own cap. */
const MAX_COINS = 12;

/**
 * What "interesting" means when the product has to choose coins itself.
 *
 * Preferences among what the platform declares, never a value written into the
 * request. `abs_change` because the biggest movers are where a stalled agent's
 * owner will look first, and `1h` because it is the coarsest interval that
 * still describes today. If the platform stops declaring either, the first
 * value it does declare is used and the surface says which — a preference that
 * cannot be honoured is not a reason to refuse to answer.
 */
const PREFERRED_METRIC = 'abs_change';
const PREFERRED_INTERVAL = '1h';

/**
 * Where the screened coins came from.
 *
 * `ranked` carries **why** the product had to choose: an agent that is deployed
 * nowhere and an agent whose deployments could not be read produce the same
 * fallback and mean opposite things. Telling an operator "this agent is
 * deployed nowhere" because the radar hiccuped is the mistake
 * `AgentDeploymentResult` was shaped to prevent, and it would be reintroduced
 * here if the reason were dropped.
 */
export type CoinSource =
  | { readonly kind: 'requested'; readonly coins: readonly string[]; readonly dropped: number }
  | { readonly kind: 'deployments'; readonly coins: readonly string[]; readonly dropped: number }
  | {
      readonly kind: 'ranked';
      readonly coins: readonly string[];
      readonly dropped: number;
      readonly metric: string;
      readonly interval: string;
      readonly because: 'not-deployed' | 'deployments-unreadable';
    };

export type ReadQualificationResult =
  | {
      readonly kind: 'screened';
      readonly source: CoinSource;
      readonly result: QualificationResult;
    }
  /**
   * No coins could be chosen, so nothing was screened.
   *
   * Emphatically not a qualification result of zero verdicts. "Nothing
   * qualified" is a statement about the agent; this is a statement about the
   * product's inability to pick a subject, and the two send an operator to
   * different places.
   */
  | { readonly kind: 'no-coins'; readonly reason: string };

export interface ReadQualificationRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly agentId: string;
  /** Coins the caller named. Omitted or empty means the product chooses. */
  readonly coinTickers?: readonly string[] | undefined;
}

export class ReadQualificationQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly radar: RadarPort,
    private readonly market: MarketPort,
  ) {}

  async execute(req: ReadQualificationRequest): Promise<ReadQualificationResult> {
    const source = await this.chooseCoins(req);
    if (source === null) {
      return {
        kind: 'no-coins',
        reason:
          'This agent has no deployments to screen, and the platform did not answer with a ' +
          'ranked list to fall back on.',
      };
    }
    const result = await this.agents.readCoinQualification({
      userId: req.userId,
      accessToken: req.accessToken,
      agentId: req.agentId,
      coinTickers: source.coins,
    });
    return { kind: 'screened', source, result };
  }

  /** The chosen coins and where they came from, or null when neither answered. */
  private async chooseCoins(req: ReadQualificationRequest): Promise<CoinSource | null> {
    const asked = dedupe(req.coinTickers ?? []);
    if (asked.length > 0) return { kind: 'requested', ...cap(asked) };

    const deployments = await this.radar.listDeployments(req);
    if (deployments.kind === 'deployments') {
      /**
       * Membership, not standing. The question here is *which markets are this
       * agent's own*, and an archived agent's slots are still the markets it
       * was pointed at — screening them says what its gates would do if it
       * were reactivated. Asking for a standing would mean holding a lifecycle
       * this query never reads, and the answer would not change the coins.
       */
      const mine = deploymentsNaming(deployments.deployments, req.agentId);
      const coins = dedupe(mine.map((d) => d.coinTicker));
      if (coins.length > 0) return { kind: 'deployments', ...cap(coins) };
    }

    return this.rankedFallback(
      req,
      deployments.kind === 'deployments' ? 'not-deployed' : 'deployments-unreadable',
    );
  }

  /**
   * The platform's own ranked list, when the agent supplies no coins.
   *
   * Three ways to come away with nothing — the vocabulary would not answer, the
   * ranking would not answer, or it ranked no coins — and all three end the same
   * way here: null, which the caller reports as "could not choose". None of them
   * is allowed to become an empty screen, which would read as a verdict.
   */
  private async rankedFallback(
    req: ReadQualificationRequest,
    because: 'not-deployed' | 'deployments-unreadable',
  ): Promise<CoinSource | null> {
    const vocabulary = await this.market.rankingVocabulary(req);
    const metric = prefer(PREFERRED_METRIC, vocabulary.metrics);
    const interval = prefer(PREFERRED_INTERVAL, vocabulary.intervals);
    if (metric === null || interval === null) return null;

    const ranked = await this.market.topRankedCoins({
      userId: req.userId,
      accessToken: req.accessToken,
      metric,
      interval,
      limit: MAX_COINS,
    });
    if (ranked.kind !== 'coins') return null;
    const coins = dedupe(ranked.coins.map((c) => c.ticker));
    if (coins.length === 0) return null;
    return { kind: 'ranked', ...cap(coins), metric, interval, because };
  }
}

/**
 * The chosen value from what the platform declares, or null if it declares
 * nothing. The preference is honoured when offered and is never the answer on
 * its own — an interval this product likes is not an interval the platform
 * accepts.
 */
function prefer(preferred: string, declared: readonly string[]): string | null {
  if (declared.includes(preferred)) return preferred;
  return declared[0] ?? null;
}

/**
 * Tickers, uniqued and case-normalised, in the order first seen.
 *
 * An agent deployed on the same coin at two timeframes yields it twice, and the
 * platform counts duplicates against a cap of twelve — so a duplicate is a coin
 * silently dropped from the far end of the list.
 */
function dedupe(tickers: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tickers) {
    const ticker = t.trim().toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    out.push(ticker);
  }
  return out;
}

/** The platform's cap, applied where it can be reported rather than silently. */
function cap(coins: readonly string[]): { coins: readonly string[]; dropped: number } {
  return {
    coins: coins.slice(0, MAX_COINS),
    dropped: Math.max(0, coins.length - MAX_COINS),
  };
}
