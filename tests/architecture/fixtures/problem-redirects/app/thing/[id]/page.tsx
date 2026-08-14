/**
 * A deliberate offender, planted for
 * `a-problem-redirect-is-read-where-it-lands.test.ts`.
 *
 * This tree is walked by exactly one thing: that scan's fixture run. The
 * production runs walk `app/` and `src/presentation/` and never reach it.
 *
 * The plant: the action below sends a refusal onward to this page's own
 * route, and the page renders without ever reading or mounting what arrives.
 * That silent landing is the #240 defect, preserved so the scan must keep
 * being able to find it.
 *
 * **Do not fix this page, and do not spell the scanned idioms in comments** —
 * the parameter name, the redirect shape, or the banner component. The scan
 * strips comments before reading, but the floors change (M0) measured how a
 * fixture gets "found" through its own prose, and the cheapest defence is
 * having nothing findable there.
 */
import { redirect } from 'next/navigation';

export default function PlantedSilentTarget() {
  return (
    <main>
      <h1>A destination that keeps what it is handed to itself</h1>
      <p>Nothing sent here is ever shown.</p>
    </main>
  );
}

export function bounce(id: string, reason: string): never {
  redirect(`/thing/${id}?problem=${encodeURIComponent(reason)}`);
}
