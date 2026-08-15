import type { RadarPause } from '@/domain/agent/deployment.js';
import { pauseIsUnknown, platformStopped, radarIsPaused } from '@/domain/agent/deployment.js';

/**
 * Whether anything is scanning at all.
 *
 * The correction to every standing sentence on the page. Standing says which
 * agent the radar *would* resolve to, and that stays true while nothing runs —
 * so "On duty: scanning SOL on the 15m radar" was rendered, truthfully as a
 * statement about configuration and falsely as a statement about activity,
 * through a three-day platform pause (#311).
 *
 * One component because three surfaces render standing — the agent page, the
 * roster, and this product's own MCP surface — and the deployment spec already
 * names the shape of that mistake: *"a check repeated at each is three places
 * to forget it once."*
 *
 * ## Renders nothing twice over
 *
 * Nothing where the pause is unknown, and nothing where the radar is running
 * and the platform has stopped none. The first is a read that did not answer
 * and must not be dressed as reassurance; the second is the ordinary case, and
 * a permanent "radar: running" badge would be this product asserting liveness
 * from a field that only ever reports the negative reliably.
 */
export function RadarPauseNote({ pause }: { pause: RadarPause }) {
  if (pauseIsUnknown(pause)) return null;

  const stopped = platformStopped(pause);
  const paused = radarIsPaused(pause);
  if (!paused && stopped === null) return null;

  return (
    <div className="space-y-1">
      {paused && (
        /*
          role=status, not alert. A paused radar is a state of the platform the
          operator is being told about, not a failure of this page — and the
          surfaces that use role=alert here use it for reads that broke.
        */
        <p role="status" className="text-base text-text-primary">
          {`The radar is paused. Nothing below is scanning, whatever its standing says — standing names the agent the radar would resolve to, not what is running.`}
        </p>
      )}
      {stopped !== null && (
        /*
          Stated apart from the radar's own pause, and counted against the whole
          it was counted over. "17 paused" is a number whose denominator the
          reader has to go and find; the two are also different facts with
          different remedies, and collapsing them would leave an operator unable
          to tell whether their radar is off or the platform stopped some coins.
        */
        <p role="status" className="text-base text-text-primary">
          {pause.coinsDeployed === null
            ? `BattleGrid reports ${String(stopped)} of this account’s deployed coins as paused by the platform. It did not say how many are deployed in total.`
            : `BattleGrid reports ${String(stopped)} of ${String(pause.coinsDeployed)} deployed coins as paused by the platform.`}
        </p>
      )}
      {/*
        The platform's own scanning count, where it disagrees with the sentence
        above. Not decoration: it is the figure that says whether "paused" means
        everything or only part, and it is BattleGrid's own count rather than
        anything derived here.
      */}
      {pause.scanning !== null && pause.scanning > 0 && paused && (
        <p className="text-sm text-text-secondary">
          {`BattleGrid nonetheless reports ${String(pause.scanning)} scanning. Both figures are its own and are shown as returned; this product has not chosen between them.`}
        </p>
      )}
    </div>
  );
}
