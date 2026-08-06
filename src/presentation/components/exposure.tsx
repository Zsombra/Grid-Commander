import type {
  AgentExposure,
  FillFailures,
  HeldPosition,
  LevelAsDecided,
  PricedAt,
} from '@/application/use-cases/read-exposure.query.js';
import { WhyNotLoaded } from './why-not-loaded.js';

/**
 * What this agent has at stake, and what it could not get to the exchange.
 *
 * Every figure below is the platform's. Mark price, unrealized result, ROE,
 * margin and liquidation price all arrive computed — recomputing any of them
 * from an entry price would disagree with the exchange the first time
 * BattleGrid changed how it marks, on the surface where that matters most.
 */

const money = (v: number | null): string =>
  v === null ? 'not priced' : `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;

/** A percentage the platform already scaled. Never multiplied here. */
const percent = (v: number | null): string =>
  v === null ? 'not priced' : `${(Math.round(v * 100) / 100).toFixed(2)}%`;

const price = (v: number | null): string => (v === null ? '—' : String(v));

/** The platform's own stamp, unrounded and unlocalised. */
const stamp = (ms: number): string => new Date(ms).toISOString();

/**
 * An age in milliseconds, worded the way staleness is actually thought about.
 *
 * Named for how it reads at the call site — `Priced ${ago(ageMs)}` — and not to
 * be confused with `SinceTheDecision` below, which is about a stop moving.
 *
 * Measured in `ReadExposureQuery` against the injected clock and only *said*
 * here — the same split `money` and `percent` already use, and the reason no
 * component in this product calls `Date.now()`.
 *
 * Rounded **down**, so it can understate by up to one unit. That is only
 * acceptable because the exact stamp is rendered beside it: "4 minutes ago" on
 * its own is a figure to be taken on trust, and next to 17:55:21.702Z it is a
 * reading of something the reader can check.
 */
const ago = (ageMs: number): string => {
  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) return 'less than a minute ago';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

/**
 * One open position, and the decision that opened it.
 *
 * The stop and target shown are the **effective** ones and say so. Position
 * management moves them after the decision that opened the trade — observed
 * live: a decision recorded 55.67456526 and its position reported 55.954 — so
 * a surface presenting the decided values as current understates the
 * protection in force.
 *
 * Showing only the effective one hides the other half. `SinceTheDecision`
 * below is the join back to what was decided, which is the only evidence
 * anywhere in this product that a trailing setting ever acted.
 */
function Position({ held }: { held: HeldPosition }) {
  const p = held.position;

  // The platform distinguishes a position it could not price from one worth
  // nothing, and so does this. `unpricedPositionCount` is that distinction
  // arriving as a field.
  const unpriced = p.markPrice === null;

  return (
    <li className="space-y-1 rounded border p-3 text-sm">
      <p className="font-medium">
        {`${p.coinTicker} ${p.direction}`}
        {p.effectiveLeverage === null ? '' : ` · ${p.effectiveLeverage}× leverage`}
        {p.status === null ? '' : ` · ${p.status}`}
      </p>

      <p>
        {`Entered at ${price(p.entryFillPrice)}`}
        {unpriced ? ' · not priced right now' : ` · marked at ${price(p.markPrice)}`}
      </p>

      <p>
        {`${money(p.currentNotionalUsd ?? p.entryNotionalUsd)} at stake · ${money(p.marginedUsd)} margined`}
      </p>

      {/* Unknown, not zero. A position whose value could not be read has an
          unknown result, and rendering it flat would be a claim. */}
      <p className={p.unrealizedPnlUsd !== null && p.unrealizedPnlUsd < 0 ? 'font-medium' : undefined}>
        {p.unrealizedPnlUsd === null
          ? 'Unrealized result unknown — BattleGrid could not price this one.'
          : `Unrealized ${money(p.unrealizedPnlUsd)} (${percent(p.roePct)} on margin)`}
      </p>

      <p>
        {`Stop now ${price(p.effectiveStopLoss)} · target now ${price(p.effectiveTakeProfit)}`}
        {p.liquidationPrice === null ? '' : ` · liquidation ${price(p.liquidationPrice)}`}
      </p>
      {/* Named because it is the trap: these are where the stop and target
          actually are, not where the decision put them. */}
      <p className="text-text-secondary">
        Stop and target are the current ones — position management moves them
        after the decision.
      </p>

      <SinceTheDecision held={held} />

      {p.openedAt ? (
        <p className="text-text-secondary">
          {`Opened ${p.openedAt}`}
          {p.timeHorizon ? ` · sized for ${p.timeHorizon}` : ''}
        </p>
      ) : null}
    </li>
  );
}

/**
 * Where the decision put the stop and target, against where they are now.
 *
 * The drift is the point of the section, not a footnote to it.
 * `position-management-editing` shipped the settings — preset, trailing type,
 * break-even trigger — and until now nothing in the product showed them *act*.
 * The pair this was built from was live on 2026-08-06: decision 55.67456526,
 * position 55.954, trailing having walked the stop 28 cents up a $56
 * instrument.
 *
 * Which way it moved is stated rather than left to be worked out. Two bare
 * numbers on a stop are a puzzle whose wrong answer is "my money is covered".
 */
function SinceTheDecision({ held }: { held: HeldPosition }) {
  if (held.asDecided === null) {
    /**
     * Unknown, never "unmoved" — the position-level twin of *unreadable is not
     * empty*. The decision may be older than the window read, or the read may
     * have failed outright; in both cases the stop may well have been walked,
     * and saying nothing here would read as saying it has not.
     */
    return (
      <p className="text-text-secondary">
        Where the decision put this stop is unknown — its entry decision was not
        among the ones read, so whether position management has moved it cannot
        be said.
      </p>
    );
  }

  const stop = stopSentence(held.asDecided.stop);
  const target = targetSentence(held.asDecided.target);
  if (stop === null && target === null) return null;

  return (
    <>
      {stop === null ? null : <p>{stop}</p>}
      {target === null ? null : <p className="text-text-secondary">{target}</p>}
    </>
  );
}

/** Null where there is nothing to say: the stop is where the decision put it. */
function stopSentence(stop: LevelAsDecided): string | null {
  if (stop.kind === 'as-decided') return null;
  if (stop.kind === 'incomparable') {
    // A decision that recorded no stop leaves nothing to compare and nothing
    // worth a line. A decided stop with none in force is the opposite — it is
    // the most alarming state this join can surface.
    return stop.decided === null
      ? null
      : `The decision set the stop at ${stop.decided} and this position reports no stop now.`;
  }

  const both = `The decision set the stop at ${stop.decided} · it is now ${stop.effective}`;
  return stop.protects === null
    ? `${both}. Which way that moved the protection cannot be read — BattleGrid reported a side this product does not recognise.`
    : `${both} — moved to protect ${stop.protects} of this position.`;
}

/**
 * The decided target, where it has moved.
 *
 * Stated without a direction: a take-profit in a new place is a different
 * exit, not more or less protection, and calling it either would be this
 * product's reading rather than the platform's.
 */
function targetSentence(target: LevelAsDecided): string | null {
  if (target.kind !== 'moved') return null;
  return `The decision set the target at ${target.decided} · it is now ${target.effective}.`;
}

/**
 * How old these figures are, and the one thing the reader can do about it.
 *
 * The stamp alone was already here and was already true. What it left the
 * reader is arithmetic: `Priced 2026-08-06T17:55:21.702Z` reads identically one
 * second and four minutes after the page loaded, on a 5× position the platform
 * asks a client to re-read every ten seconds (`refreshIntervalMs: 10000`). The
 * age is the part of that a static render can honestly state.
 *
 * The re-read is a plain `<a>` back to this agent's page: a full page load, a
 * server render, a fresh read of BattleGrid. No client component, nothing that
 * could be mistaken for the panel updating itself. It is here rather than left
 * to the browser's reload button because the affordance belongs beside the
 * sentence that gives a reason to use it.
 *
 * The disclaimer is written once and appended to all three states, rather than
 * spelled out in each. The line used to be dropped whole when the platform sent
 * no `generatedAtMs`, which took `a snapshot, not a live ticker` with it — on
 * the one read least able to justify being taken as current.
 */
function Priced({ pricedAt, agentId }: { pricedAt: PricedAt; agentId: string }) {
  return (
    <p className="text-sm text-text-secondary">
      {`${when(pricedAt)} — a snapshot, not a live ticker.`}{' '}
      <a href={`/agents/${agentId}`} className="underline">
        Read these figures again
      </a>
      .
    </p>
  );
}

/** What can be said about the moment these figures belong to. */
const when = (pricedAt: PricedAt): string => {
  if (pricedAt.kind === 'unstated') return 'BattleGrid did not say when this was priced';
  if (pricedAt.kind === 'aged') return `Priced ${ago(pricedAt.ageMs)}, at ${stamp(pricedAt.atMs)}`;
  // Only what was observed: this server's clock reads earlier than the stamp.
  // Which of the two clocks is wrong is not knowable from here, and naming one
  // would be a claim about BattleGrid's.
  return (
    `Priced at ${stamp(pricedAt.atMs)}; how long ago that was cannot be said, ` +
    `because the stamp is later than this server's clock reads`
  );
};

/**
 * Entries that never became an order.
 *
 * The counts already existed on the funnel and already rendered on
 * `/pipeline` — as a row of statistics, which is where 28 looks like a number
 * rather than half of everything the agent decided. Said against the total,
 * it is a different sentence.
 */
function Fills({ fills }: { fills: FillFailures }) {
  if (fills.failed === 0) return null;

  return (
    <div className="space-y-1 text-sm">
      <p className={fills.dominant ? 'font-medium' : undefined}>
        {`${fills.failed} of ${fills.decided} entries never became an order.`}
      </p>
      {fills.dominant ? (
        <p>
          More of what this agent decided failed than succeeded — {fills.failed}{' '}
          failed against {fills.executed} executed.
        </p>
      ) : null}
      {/*
        No reason is offered per failure: the platform sends none. A failed
        decision carries an execution time and no order id, and that absence is
        the whole of the evidence.
      */}
      <p className="text-text-secondary">
        BattleGrid does not say why an individual entry failed — only that it
        reached execution and produced no order.
        {fills.platformFillRatePercent === null
          ? ''
          : ` BattleGrid's own fill rate for this agent is ${fills.platformFillRatePercent}%.`}
      </p>
    </div>
  );
}

export function Exposure({
  exposure,
  fills,
  agentId,
}: AgentExposure & {
  /**
   * Whose page this is, so the panel can build the link back to it. The href is
   * assembled here rather than passed in ready-made so
   * `tests/architecture/reachability.test.ts` can see it — that guard reads
   * `href=` literals out of the source, and a path arriving as an opaque prop
   * is a path it cannot check against the route table.
   */
  agentId: string;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium">What it has at stake</h2>

      {exposure.kind === 'unreadable' ? (
        <div role="alert" className="text-sm">
          <p>What this agent is holding could not be read: {exposure.reason}</p>
          {/*
            The reason says what failed. On this panel that leaves the reader
            with a blank where money should be, and the conclusion nearest to
            hand is that something was closed out. The cause comes out of the
            read rather than off the message, because a refused credential and
            an outage send an operator to opposite actions.

            `this agent’s positions`, not `these positions`: nothing is listed
            on this branch, so a demonstrative points at the very list that
            failed to load. It is also the wording `/explorer` already uses for
            a stranger's holdings — the same failure on two surfaces must not
            read as two different facts.

            The reassurance is about the read and never about the market. A
            position can genuinely be closed between the read and the page; the
            sentence denies only that this failure is evidence of it, which is
            why the reason above stays exactly where it is — "could not be
            read" and "does not mean … gone" are read together or not at all.
          */}
          <WhyNotLoaded cause={exposure.cause} subject="this agent’s positions are" />
        </div>
      ) : exposure.kind === 'flat' ? (
        <p className="text-sm">This agent is holding nothing right now.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {exposure.positions.map((held) => (
              <Position key={held.position.positionId} held={held} />
            ))}
          </ul>
          {/*
            A snapshot, and it says so — with how old it is, and a way to take
            it again. The platform declares how often a client should re-read;
            a server-rendered page cannot honour that, so it states its own age
            rather than implying it is live.
          */}
          <Priced pricedAt={exposure.pricedAt} agentId={agentId} />
          {/* What else on the account is exposed, so one agent's page does not
              imply it is the only thing at risk. */}
          {exposure.totals.openPositionCount !== null && exposure.totals.openPositionCount > exposure.positions.length ? (
            <p className="text-sm text-text-secondary">
              {`${exposure.totals.openPositionCount} positions are open across this account, ` +
                `${money(exposure.totals.marginedUsd)} margined in total.`}
            </p>
          ) : null}
          {exposure.totals.unpricedPositionCount !== null && exposure.totals.unpricedPositionCount > 0 ? (
            <p className="text-sm">
              {`BattleGrid could not price ${exposure.totals.unpricedPositionCount} of them.`}
            </p>
          ) : null}
        </>
      )}

      {fills ? <Fills fills={fills} /> : null}
    </section>
  );
}
