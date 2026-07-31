import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
    return entry.name.endsWith('.tsx') ? [path] : [];
  });
}

interface ExecuteSite {
  file: string;
  tool: string;
  dropped: boolean;
}

const CALL = /^(\s*)(const |return |.*= )?await app\.(\w+)\.execute\(/;

function executeSites(): ExecuteSite[] {
  const sites: ExecuteSite[] = [];
  for (const file of tsxFilesUnder(APP)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    for (const line of lines) {
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
];

const key = (s: { file: string; tool: string }): string => `${s.file} :: ${s.tool}`;

describe('the outcome of a write reaches the person who asked for it', () => {
  const sites = executeSites();
  const droppedNow = sites.filter((s) => s.dropped);

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
