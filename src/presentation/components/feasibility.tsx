import type { FeasibilityReply } from '@/ports/feasibility-reply.js';
import type { BlockedCoin } from '@/domain/agent/feasibility.js';
import {
  candidateCeilings,
  constructibleUnder,
  curveIsFaithful,
  opportunity,
  saysNothing,
} from '@/domain/agent/feasibility.js';

/**
 * What this agent can still build a trade on, at today's volatility.
 *
 * The platform answers this once — on the reply to an agent edit, and on no
 * read — and it answers in **bands**: "reachable stops span 0.76–2.27% on SOL".
 * Twelve of those is not a reading anyone acts on. This panel is the same
 * answer in the unit an operator thinks in: *how many of my coins can this
 * strategy trade today, and which dial is stopping the rest.*
 *
 * ## Two kinds of figure, never blurred
 *
 * The headline counts are **BattleGrid's own** (`counts.buildable` of
 * `counts.total`). The ceiling curve — "at 1.20% that drops to 4" — is
 * **derived by this product** from the bands the platform returned, and says so
 * where it renders. They are different claims, and this product does not blur a
 * figure it computed with a figure it was told; `RiskReadingPanel` states the
 * same rule about the same kind of pairing, and for the same reason — the
 * platform has published aggregates of its own that answered zero on agents
 * with real losses.
 *
 * ## Every sentence is one template literal
 *
 * The rendering harness joins adjacent JSX text nodes with spaces, so a
 * sentence assembled from interpolated fragments is asserted across an
 * invisible seam ("3 capture s"). The regime panel is written this way for the
 * same reason. Do not break these back into JSX fragments.
 */

/** A stop percentage, at the precision a dial is set in. */
function stop(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

function coins(n: number): string {
  return n === 1 ? '1 coin' : `${String(n)} coins`;
}

/** "SOL", "SOL and BTC", "SOL, BTC and DOGE" — a list a sentence can hold. */
function listed(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${String(items[items.length - 1])}`;
}

export function FeasibilityPanel({ reply }: { reply: FeasibilityReply }) {
  const { advisory, coinsCarried } = reply;
  const read = opportunity(advisory);

  /**
   * An advisory over an agent with nothing deployed is a real answer, and it is
   * not this panel's answer. "0 of 0 coins can construct" is arithmetically
   * true and tells an operator nothing except that a panel fired.
   */
  if (saysNothing(advisory)) return null;

  /**
   * The curve is drawn only where this product's arithmetic reproduces
   * BattleGrid's own `buildable` at BattleGrid's own current ceiling. A
   * derivation that disagrees with the platform at the number they both
   * describe cannot be trusted to extrapolate below it — and it would print a
   * curve starting somewhere the headline one line up says it does not.
   */
  const ceilings = coinsCarried && curveIsFaithful(advisory) ? candidateCeilings(advisory) : [];

  return (
    <section className="space-y-2">
      <h2 className="font-medium">What it can build a trade on</h2>

      {/*
        BattleGrid's own count, stated as BattleGrid's. `evaluated` is named
        beside `total` because they come apart — a coin the platform could not
        price is missing from the denominator of the real question, and a
        headline that hid that would report a data gap as a verdict.
      */}
      <p className="text-base text-text-primary">
        {`At today’s volatility, ${String(read.buildable)} of ${coins(read.armed)} armed on this agent can construct a stop under its strategy’s dials — a stop-loss floor of ${String(advisory.dials.minStopLossAtrMultiple)}× the ATR and a ceiling of ${stop(advisory.dials.maxStopLossPct)}. BattleGrid evaluated ${String(read.evaluated)} of them.`}
      </p>

      {read.blocked.length > 0 && (
        <p className="text-base text-text-primary">{blockedSentence(read.blocked)}</p>
      )}

      {read.unpriced.length > 0 && (
        /*
          Its own sentence, never folded into the blocked count. A coin whose
          volatility could not be read is not a coin that cannot be traded, and
          the two are one substitution away from being reported as the same
          thing (D-3).
        */
        <p className="text-base text-text-primary">
          {`BattleGrid could not read the volatility of ${listed([...read.unpriced])}, so ${read.unpriced.length === 1 ? 'it was' : 'they were'} not evaluated either way — that is a gap in the reading, not a verdict on the coin.`}
        </p>
      )}

      {!read.countsAgree && (
        /*
          The counts and the coin list are separate fields on a payload nothing
          here has observed live, and the panel puts figures from both side by
          side. Where they do not reconcile the surface says so — it does not
          pick a winner, and it does not quietly render the pair as though they
          agreed.
        */
        <p role="status" className="text-sm text-text-secondary">
          {`The coins BattleGrid listed do not reconcile with the counts it stated: ${String(advisory.counts.evaluated - advisory.counts.buildable)} of the ${String(advisory.counts.evaluated)} it evaluated should be unable to construct, and ${String(advisory.counts.volatilityUnavailable)} should be unpriced, against the ${coins(read.blocked.length)} and ${coins(read.unpriced.length)} it listed. Both are shown as returned; this product has not chosen between them.`}
        </p>
      )}

      {ceilings.length > 0 && (
        <div className="space-y-1">
          {/*
            Derived, and labelled derived — the panel's one figure BattleGrid
            did not state. The ceilings are read off the returned bands rather
            than picked, so a fleet whose bands all sit near 0.4% is not shown
            an irrelevant 2.00%.
          */}
          <p className="text-base text-text-primary">{ceilingCurve(advisory, ceilings)}</p>
          <p className="text-sm text-text-secondary">
            Those are this product&rsquo;s arithmetic over the bands BattleGrid returned, not
            counts BattleGrid stated.
          </p>
        </div>
      )}

      {/*
        The direction, said outright. It is the half an operator cannot learn
        from the number: a ceiling raised never blocks a trade, so the only way
        this dial costs opportunity is downward, and its warning in the other
        direction is about risk rather than access.
      */}
      <p className="text-base text-text-primary">
        {`Max Stop Loss limits opportunity when it is turned down, not up. Raising the ceiling above ${stop(advisory.dials.maxStopLossPct)} blocks nothing — it permits wider stops, and what it costs is risk, not access.`}
      </p>

      {!coinsCarried && (
        <p role="status" className="text-sm text-text-secondary">
          BattleGrid returned a coin-by-coin breakdown that was too large to carry to this
          page. The counts above are its own and are complete; the per-coin detail and the
          ceiling comparison are not shown, rather than shown short.
        </p>
      )}

      {/*
        Provenance, because this figure has a shelf life. It is not a read this
        page made — it is what came back with the last edit, describing live
        volatility at that instant. Saying so is what stops it being read as a
        standing property of the agent.
      */}
      <p className="text-sm text-text-secondary">
        BattleGrid returned this with the edit you just applied. It reads live volatility, so
        it describes that moment and is not re-read here — editing again is what asks anew.
      </p>
    </section>
  );
}

/**
 * The blocked coins, grouped by the dial responsible.
 *
 * Grouped rather than listed one per line because the actionable fact is the
 * dial, not the coin: five coins held by the ceiling is one decision, and five
 * lines reads as five problems.
 *
 * `null` is its own group and keeps its own sentence. The platform declining to
 * name a bound is not the same as naming neither, and folding it into the
 * ceiling would point an operator at a control that is not responsible.
 */
function blockedSentence(blocked: readonly BlockedCoin[]): string {
  const by = (dial: BlockedCoin['blockedBy']): string[] =>
    blocked.filter((c) => c.blockedBy === dial).map((c) => c.ticker);

  const ceiling = by('ceiling');
  const floor = by('floor');
  const unnamed = by(null);

  const clauses: string[] = [];
  if (ceiling.length > 0) clauses.push(`${listed(ceiling)} by the stop-loss ceiling`);
  if (floor.length > 0) clauses.push(`${listed(floor)} by the stop-loss floor`);
  if (unnamed.length > 0) {
    clauses.push(`${listed(unnamed)} for a reason BattleGrid did not attribute to either dial`);
  }

  return `${coins(blocked.length)} cannot: ${clauses.join('; ')}.`;
}

/**
 * How the count moves as the ceiling comes down.
 *
 * One sentence, at up to three candidate ceilings, highest first — the nearest
 * decision an operator could actually make, not a table of every threshold.
 */
function ceilingCurve(
  advisory: Parameters<typeof constructibleUnder>[0],
  ceilings: readonly number[],
): string {
  const steps = ceilings
    .map((pct) => `at ${stop(pct)} it would be ${String(constructibleUnder(advisory, pct))}`)
    .join(', and ');
  return `Move the ceiling down and that number follows it: ${steps}.`;
}
