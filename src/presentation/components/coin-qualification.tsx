import type {
  AggregateScoreGate,
  AtrVolatilityGate,
  CoinQualification,
  DirectionQualification,
  RequiredCountGate,
} from '@/ports/agents.js';
import type { CoinSource } from '@/application/use-cases/read-qualification.query.js';

/**
 * Whether an agent would take a coin, and what is standing in the way.
 *
 * The whole design rule for this surface is one sentence: **a verdict word
 * without a number is not an answer.** An operator reading `FAILING` cannot act
 * on it — the point of asking is to decide whether to move a setting, and that
 * needs the measurement beside the bar it missed. So every gate renders as
 * "this much against that much", and the verdict is the label on the pair
 * rather than a substitute for it.
 */

/** What the platform calls each gate, in the operator's words. */
const GATE_LABELS = {
  aggregateScore: 'Aggregate score',
  requiredCount: 'Signals triggered',
  atrVolatility: 'Volatility (ATR)',
} as const;

/**
 * Which platform reason code names which gate.
 *
 * Used only to mark the gate the platform stopped at — never to *derive* the
 * stopping point, which is `firstFailReason`'s job. The platform evaluates in a
 * live order and abandons the rest, so a gate reading after the first failure
 * may be stale or never taken; picking our own "first failing gate" from the
 * three readings would name a different obstacle than the real one.
 */
const FAIL_REASON_GATE: Readonly<Record<string, keyof typeof GATE_LABELS>> = {
  AGGREGATE_BELOW_MIN: 'aggregateScore',
  REQUIRED_COUNT_BELOW_MIN: 'requiredCount',
  ATR_VOLATILITY_BELOW_MIN: 'atrVolatility',
};

/**
 * A figure the platform already expressed as a percentage.
 *
 * `scorePercent`, `minScorePercent`, `atrPct` and `minAtrPct` are all percents
 * on the wire. The same trap `pipeline/page.tsx` documents — multiplying one of
 * these by 100 renders 3970% and reads as a rendering glitch rather than as a
 * lie about a threshold — so nothing here scales anything.
 */
const asPercent = (v: number | null): string => (v === null ? 'not measured' : `${round(v)}%`);

/**
 * Two decimals at most, with the trailing zeros dropped.
 *
 * `atrPct` arrives as `0.6842068002428658` and its floor as `0.8`. Rendering
 * the floor as `0.80` beside a measurement of `0.68` invites reading the extra
 * digit as precision the platform sent, which it did not.
 */
const round = (v: number): string => String(Math.round(v * 100) / 100);

/**
 * One gate, as a measurement against its bar.
 *
 * The two verdicts that are not failures get their own sentences.
 * `NOT_ENFORCED` is a gate the agent's owner never configured — nothing to fix,
 * and rendering it beside a threshold of zero would invite someone to "fix" a
 * limit that is not applying. `UNMEASURABLE` is a gate the platform could not
 * read, which is a fact about the market data and not about the agent.
 */
function Gate({
  name,
  verdict,
  measured,
  threshold,
  stopped,
}: {
  name: string;
  verdict: string;
  measured: string;
  threshold: string;
  /** Whether the platform named this gate as the first one that failed. */
  stopped: boolean;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-medium">{name}</span>
      <span>
        {verdict === 'NOT_ENFORCED'
          ? 'no minimum set — this gate cannot stop it'
          : verdict === 'UNMEASURABLE'
            ? 'could not be measured, so it was not scored'
            : `${measured} against a minimum of ${threshold}`}
      </span>
      <span className="text-text-secondary">{`· ${verdict}`}</span>
      {stopped ? <span className="font-medium">· stopped here</span> : null}
    </li>
  );
}

/** One direction's verdict, with the construction step that precedes the gates. */
function Direction({ which, d }: { which: 'Long' | 'Short'; d: DirectionQualification }) {
  return (
    <div className="space-y-1">
      <p className="font-medium">{`${which}: ${d.qualifies ? 'would take it' : 'would not'}`}</p>
      {d.firstFailReason ? <p>{`Stopped by ${readable(d.firstFailReason)}.`}</p> : null}
      {/*
        Candidate levels come *before* any gate is scored: whether a stop and a
        target could be placed at all. A coin that fails here is not a coin the
        agent scored badly — it is one it could not build a trade on, and the
        settings an operator would reach for are different ones.
      */}
      {d.candidateLevels.ok ? null : (
        <p>
          No stop and target could be constructed
          {d.candidateLevels.rejectionStage
            ? `: ${readable(d.candidateLevels.rejectionStage)}.`
            : ' — the platform did not say at which step.'}
        </p>
      )}
    </div>
  );
}

/**
 * A platform reason code, in lower case with its underscores opened out.
 *
 * Not a lookup table: the codes are the platform's and a new one must render as
 * itself rather than as a blank or a wrong guess. Four are declared today and
 * this repository has watched the platform replace itself four times.
 */
function readable(code: string): string {
  return code.toLowerCase().replaceAll('_', ' ');
}

/** One coin's whole answer. */
export function CoinVerdict({ v }: { v: CoinQualification }) {
  const stoppedAt = v.firstFailReason ? FAIL_REASON_GATE[v.firstFailReason] : undefined;
  const aggregate: AggregateScoreGate = v.gates.aggregateScore;
  const required: RequiredCountGate = v.gates.requiredCount;
  const atr: AtrVolatilityGate = v.gates.atrVolatility;

  return (
    <li className="space-y-2 rounded-gc-2 border border-border-default p-3 text-sm">
      <p className="font-medium">
        {v.coinTicker}
        {v.coinName ? ` — ${v.coinName}` : ''} ·{' '}
        {v.qualifies ? 'would take it' : 'would not take it'}
        {v.strategyTimeframe ? ` · on ${v.strategyTimeframe}` : ''}
      </p>

      {/*
        The platform's own ordering, not ours. A coin can read as failing on
        two gates while only the first was ever reached — and the commonest
        stop of all, `CANDIDATE_LEVELS_UNAVAILABLE`, is not a gate: it is the
        step before them, where a stop and a target are constructed. "Stopped
        at" rather than "first gate to fail" for exactly that reason.
      */}
      {v.firstFailReason ? <p>{`Stopped at: ${readable(v.firstFailReason)}.`}</p> : null}

      <ul className="space-y-1">
        <Gate
          name={GATE_LABELS.aggregateScore}
          verdict={aggregate.verdict}
          measured={asPercent(aggregate.scorePercent)}
          threshold={asPercent(aggregate.minScorePercent)}
          stopped={stoppedAt === 'aggregateScore'}
        />
        <Gate
          name={GATE_LABELS.requiredCount}
          verdict={required.verdict}
          // A count, not a percent. Two units on one card is exactly how a
          // shared {measured, threshold} pair would have gone wrong.
          measured={required.count === null ? 'not measured' : String(required.count)}
          threshold={required.min === null ? 'none stated' : String(required.min)}
          stopped={stoppedAt === 'requiredCount'}
        />
        <Gate
          name={GATE_LABELS.atrVolatility}
          verdict={atr.verdict}
          measured={asPercent(atr.atrPct)}
          threshold={asPercent(atr.minAtrPct)}
          stopped={stoppedAt === 'atrVolatility'}
        />
      </ul>

      {/*
        Kept apart, always. A coin that qualifies long and not short is the
        common case, and one merged answer would hide which way is open.
      */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Direction which="Long" d={v.long} />
        <Direction which="Short" d={v.short} />
      </div>

      {v.evaluatedAt ? <p className="text-text-secondary">Screened {v.evaluatedAt}</p> : null}
    </li>
  );
}

/**
 * Where the screened coins came from, stated on the surface.
 *
 * "None of these qualify" means something different for coins the agent is
 * deployed on and coins the product picked off a ranked list. The fallback also
 * says *why* it happened: an agent deployed nowhere and a radar that would not
 * answer produce the same list and opposite conclusions.
 */
export function ScreenedCoins({ source }: { source: CoinSource }) {
  return (
    <div className="space-y-1 text-sm">
      <p>
        Screening {source.coins.join(', ')}
        {source.kind === 'deployments'
          ? ' — the coins this agent is deployed on.'
          : source.kind === 'requested'
            ? ' — the coins you asked about.'
            : source.because === 'not-deployed'
              ? ` — chosen by Grid-Commander, because this agent is deployed nowhere. Top movers by ${source.metric} over ${source.interval}.`
              : ` — chosen by Grid-Commander, because this agent's deployments could not be read. Top movers by ${source.metric} over ${source.interval}.`}
      </p>
      {/* A cap that truncates in silence reads as "we covered everything". */}
      {source.dropped > 0 ? (
        <p>
          {source.dropped} more {source.dropped === 1 ? 'coin was' : 'coins were'} left out —
          BattleGrid screens twelve at a time.
        </p>
      ) : null}
    </div>
  );
}
