import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * No surface may discard the result of an operation it asked for.
 *
 * The requirement (`agent-authoring` — "The Outcome Of A Write Reaches The
 * Person Who Asked For It") carries a scenario that says exactly this: a
 * result the surface never reads must fail a check that gates a change. This
 * is that check. It exists because the failure is invisible by construction —
 * a discarded refusal looks exactly like a page that reloaded, so it survives
 * review, manual testing, and four production gates, which is precisely what
 * the rename action did for the life of the product.
 *
 * The scan is textual, like its siblings in this directory: a statement that
 * *begins* with `await app.<name>.execute(` is a call whose result nothing
 * assigns, returns, or branches on. Prettier keeps this shape stable. A read
 * result starts the line differently — `const r = await …`, `return app…`,
 * `({ x } = await …)` — and does not match.
 *
 * `KNOWN_DROPPED` is a ledger, not an escape hatch. It is asserted in both
 * directions: a drop not listed fails (new instance — read the requirement
 * before adding a row), and a listed drop no longer found fails (the site was
 * fixed — delete the row, the ledger only shrinks or is grown knowingly).
 */

const APP = 'app';

function tsxFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFilesUnder(path);
    return entry.name.endsWith('.tsx') ? [slashed(path)] : [];
  });
}

interface ExecuteSite {
  file: string;
  tool: string;
  dropped: boolean;
}

const CALL = /^(\s*)(const |return |.*= )?await app\.(\w+)\.execute\(/;

/**
 * The same call, one indirection out: `spending(() => app.X.execute(…))`.
 *
 * #232 moved every confirmation-spending call inside that wrapper, so the
 * execute no longer sits on a line beginning `await app.` and `CALL` stopped
 * seeing it. The scanner went blind on nine sites and reported a *cleaner*
 * tree than before — including one genuine dropped result whose ledger row
 * then failed as "no longer found".
 *
 * Deleting that row was the available wrong answer. The result is still
 * dropped; only the measure had stopped reaching it, which is the same failure
 * `controls.test.ts` records about `<PerformButton>` — a refactor that removed
 * nothing must not be able to weaken a check.
 *
 * So the binding is read from the wrapper, where it now lives:
 *   `const result = await spending(() => app.X.execute(…))`  → read
 *   `await spending(() => app.X.execute(…))`                 → dropped
 */
const WRAPPED_OPEN = /^(\s*)(const |return |.*= )?await spending\(/;
const WRAPPED_CALL = /\bapp\.(\w+)\.execute\(/;

/**
 * How far past `await spending(` the execute is allowed to be.
 *
 * The ten call sites put it two lines down. The bound exists because the
 * alternative is unbounded: the first version of this loop set a flag on the
 * opening line and cleared it only when an execute turned up, so a wrapper
 * whose execute it could not recognise latched the flag and `continue`d over
 * **every remaining line in the file** — the scanner going quietly blind
 * mid-file, which is the one failure this file exists to prevent.
 */
const WRAPPER_REACH = 12;

/** Wrappers whose execute was never found. A blind scanner must be loud. */
const unreadable: string[] = [];

function executeSites(): ExecuteSite[] {
  const sites: ExecuteSite[] = [];
  unreadable.length = 0;
  for (const file of tsxFilesUnder(APP)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    // Set when `await spending(` opens, cleared when its execute is found —
    // the binding belongs to the wrapper, and is what the site inherits.
    let wrapped: { binding: boolean; reach: number } | null = null;
    for (const line of lines) {
      const opened = WRAPPED_OPEN.exec(line);
      if (opened) {
        wrapped = { binding: opened[2] !== undefined, reach: 0 };
        // The compact one-line form — `await spending(() => app.X.execute(...))`
        // — carries its execute on this very line. Checking it here is what
        // stops the flag latching; without it the loop skipped the rest of the
        // file the first time anyone wrote the wrapper that way.
        const sameLine = WRAPPED_CALL.exec(line);
        if (sameLine) {
          sites.push({ file, tool: sameLine[1] as string, dropped: !wrapped.binding });
          wrapped = null;
        }
        continue;
      }
      if (wrapped !== null) {
        const inner = WRAPPED_CALL.exec(line);
        if (inner) {
          sites.push({ file, tool: inner[1] as string, dropped: !wrapped.binding });
          wrapped = null;
          continue;
        }
        wrapped.reach += 1;
        if (wrapped.reach > WRAPPER_REACH) {
          // Give up and say so, rather than swallowing the remainder. Then
          // resume ordinary scanning on this same line, so one unreadable
          // wrapper costs one site and not a whole file.
          unreadable.push(file);
          wrapped = null;
        } else {
          continue;
        }
      }
      if (!line.includes('await app.')) continue;
      const match = CALL.exec(line);
      if (!match) continue;
      sites.push({ file, tool: match[3] as string, dropped: match[2] === undefined });
    }
  }
  return sites;
}

/**
 * Every currently-dropped result, with the verdict it earned.
 *
 * Five rows on day one; the three that were live defects — refusal arms that
 * silently vanished on reactivate, agent-archive, and strategy-archive — were
 * fixed by `three-actions-silence-their-refusals` and their rows deleted, as
 * this file demands. The two that remain are benign: the result union has a
 * single success arm and every refusal throws, so there is nothing on the
 * value to branch on. They stay listed rather than exempted invisibly,
 * because "benign" is a claim about the current result type, and the row is
 * where that claim is auditable.
 */
const KNOWN_DROPPED: ReadonlyArray<{ file: string; tool: string; verdict: string }> = [
  // rebindAgent's row left 2026-07-31: RebindAgentResult grew a
  // destination-moved arm (`rebind-binds-the-destination-it-described`) and
  // the page reads it — exactly the "benign today" expiry the old verdict
  // predicted.
  {
    file: 'app/(app)/strategies/[id]/edit/page.tsx',
    tool: 'applyPlan',
    verdict:
      'benign today: ApplyPlanResult is {applied} with no refusal arm; refusals throw. The applied payload goes unread by design — the page re-reads',
  },
  {
    file: 'app/(app)/strategies/[id]/conditions/save/page.tsx',
    tool: 'applyPlan',
    verdict:
      'benign today, and for the same reason as its sibling above: ApplyPlanResult is {applied} with no refusal arm. This action does not discard the refusal — it catches the throw and returns to a fresh describe over the same edit with ?problem=, which is the outcome reaching the person. What goes unread is the success payload, whose shape apply has never published; the proof is the strategy page re-read',
  },
];

const key = (s: { file: string; tool: string }): string => `${s.file} :: ${s.tool}`;

describe('the outcome of a write reaches the person who asked for it', () => {
  const sites = executeSites();
  const droppedNow = sites.filter((s) => s.dropped);

  it('can read every spending() wrapper it finds', () => {
    // The wrapper's execute must be reachable, or this scanner is reporting
    // on a file it stopped understanding. Silence here was the defect: the
    // loop used to skip the rest of the file rather than admit it had lost
    // the thread.
    expect(
      unreadable,
      'a spending() wrapper whose execute was not found within ' +
        `${WRAPPER_REACH} lines — the scan lost the thread here`,
    ).toEqual([]);
  });

  it('sees the app at all', () => {
    // A path or regex drift would report zero call sites and pass vacuously —
    // the exact blindness this file exists to remove. 33 at time of writing.
    expect(sites.length).toBeGreaterThanOrEqual(30);
    expect(
      sites.some((s) => s.file.endsWith('agents/[id]/edit/page.tsx') && !s.dropped),
      'the fixed rename/edit action should register as reading its result',
    ).toBe(true);
  });

  it('every dropped result is in the ledger, with its verdict on record', () => {
    const ledger = new Set(KNOWN_DROPPED.map(key));
    const unlisted = droppedNow.filter((s) => !ledger.has(key(s)));
    expect(
      unlisted.map(key),
      'these calls discard their results — read "The Outcome Of A Write Reaches ' +
        'The Person Who Asked For It" before considering a ledger row',
    ).toEqual([]);
  });

  it('every ledger row still names a real dropped call', () => {
    const found = new Set(droppedNow.map(key));
    const stale = KNOWN_DROPPED.filter((row) => !found.has(key(row)));
    expect(
      stale.map(key),
      'these sites no longer drop their results — delete the rows; the ledger only shrinks',
    ).toEqual([]);
  });

  it('the ledger carries a verdict on every row', () => {
    for (const row of KNOWN_DROPPED) {
      expect(row.verdict.length, key(row)).toBeGreaterThan(20);
    }
  });
});
