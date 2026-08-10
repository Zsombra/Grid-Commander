import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The live probes are reached deliberately, or not at all.
 *
 * They used to sit inside the ordinary suite, because `vitest.config.ts`
 * included `tests/**` and excluded only `node_modules` and `tests/db/**`. That
 * had two costs and the second is the expensive one:
 *
 * - **Without a credential** thirty files `describe.skip`, silently, inside a
 *   gate reporting `ok`. Thirty checks that never ran, summarised as a pass.
 * - **With a credential they all ran, in parallel**, against a real trading
 *   account — the sweep `vitest.live.config.ts` pins `fileParallelism: false`
 *   to prevent, after a concurrent run on 2026-08-07 produced nine phantom
 *   failures that a serial re-run collapsed to two. And `HANDOFF.md` tells the
 *   next session to run `./scripts/ci.sh` with a key.
 *
 * **Every assertion here asks a tool what it actually resolves**, never what a
 * config file says. `vitest list --filesOnly` is vitest's own selection and
 * `tsc --showConfig` is TypeScript's own; a check that read the `exclude` array
 * as text would pass on a config whose glob had stopped matching, which is this
 * repository's recurring defect (GitHub #87) and precisely what it would be
 * guarding against here.
 */

const LIVE_DIR = 'tests/live';

/** The probe files on disk — the denominator every claim below is against. */
function probeFiles(): string[] {
  return readdirSync(LIVE_DIR)
    .filter((f) => f.endsWith('.test.ts'))
    .map((f) => `${LIVE_DIR}/${f}`)
    .sort();
}

/** What vitest itself selects for a config. Its resolution, not our reading of it. */
function selects(config: string): string[] {
  const out = execFileSync(
    'npx',
    ['vitest', 'list', '--filesOnly', '--config', config],
    { encoding: 'utf8', timeout: 120_000 },
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.endsWith('.test.ts'));
}

describe('the offline suite does not reach the live probes', () => {
  it('has probes to be wrong about', () => {
    // Vacuity guard. An empty tests/live/ would satisfy every assertion below
    // while proving nothing — and the file count has already grown from the
    // nineteen the freshness gate's comment names to thirty.
    expect(probeFiles().length).toBeGreaterThan(20);
  });

  it('selects none of them', () => {
    const live = selects('vitest.config.ts').filter((f) => f.startsWith(LIVE_DIR));
    expect(
      live,
      'a credential would make these run in parallel against a real trading account',
    ).toEqual([]);
  });

  it('still selects the offline tests, so the exclusion is not a deletion', () => {
    // The other direction. An exclude of `tests/**` would also pass the check
    // above, and would be a far worse change than the one it is guarding.
    const all = selects('vitest.config.ts');
    expect(all.length).toBeGreaterThan(100);
  });
});

describe('the live suite is reached only through the config that paces it', () => {
  it('selects every probe file', () => {
    const live = selects('vitest.live.config.ts').filter((f) => f.startsWith(LIVE_DIR));
    expect(live.sort()).toEqual(probeFiles());
  });

  it('is pinned to one file at a time', () => {
    // The pacing is the whole point of routing through this config; a live
    // suite that ran in parallel would make the exclusion above pointless.
    const config = readFileSync('vitest.live.config.ts', 'utf8');
    expect(config).toMatch(/fileParallelism:\s*false/);
  });
});

describe('the probes are still compiled', () => {
  it('is what makes the exclusion safe', () => {
    /**
     * Leaving the offline suite is only harmless because something else still
     * parses these files. If it stopped, a probe could rot untouched until the
     * day someone ran it with a key and a real account in front of them.
     *
     * `tsc --showConfig` is TypeScript's own resolution of include/exclude —
     * the same list `npm run typecheck` compiles.
     */
    const shown = execFileSync('npx', ['tsc', '--showConfig'], {
      encoding: 'utf8',
      timeout: 120_000,
    });
    const files: string[] = (JSON.parse(shown).files ?? []).map((f: string) =>
      f.replace(/^\.\//, ''),
    );
    const compiled = files.filter((f) => f.includes(`${LIVE_DIR}/`));

    expect(compiled.length, 'typecheck no longer compiles the probes').toBe(probeFiles().length);
  });
});

describe('the verification run names what it did not do', () => {
  const ci = readFileSync('scripts/ci.sh', 'utf8');

  /**
   * Each of these gates has a skip arm, and the skip arm is the requirement.
   * A check that disappears from the summary when it cannot run is
   * indistinguishable from one that ran and passed — `platform-mapping` says
   * so for the freshness gate, and this is that rule applied to the rest.
   */
  it.each(['freshness', 'live', 'oauth-live'])('names %s in both arms', (name) => {
    expect(ci, `${name} has no gate`).toMatch(new RegExp(`gate "${name}"`));
    expect(ci, `${name} can vanish from the summary`).toMatch(new RegExp(`skip "${name}"`));
  });

  it('runs the single-file live gates through the live config', () => {
    // Naming a live file without `--config vitest.live.config.ts` now selects
    // nothing, because the default config excludes the directory — so the gate
    // would pass having run no tests. That is the failure this change would
    // otherwise have introduced into the check it was written to protect.
    //
    // Shell line-continuations are joined before matching. The first draft read
    // the invocation with `[^\n]*(?:\\\n[^\n]*)*` and failed: the greedy class
    // consumes the trailing backslash, leaving the alternation nothing to
    // match, so it saw only the first line of a two-line gate. The same shape
    // as the dead pattern in #87 — worth saying out loud, because it appeared
    // while writing a guard whose subject is checks that quietly match nothing.
    const joined = ci.replace(/\\\n\s*/g, ' ');
    const gates = [...joined.matchAll(/gate "(freshness|oauth-live)"([^\n]*)/g)];

    expect(gates.map((m) => m[1]).sort(), 'both single-file live gates are read').toEqual([
      'freshness',
      'oauth-live',
    ]);
    for (const [, name, invocation] of gates) {
      expect(invocation, `${name}: a live file without the live config runs nothing`).toContain(
        'vitest.live.config.ts',
      );
    }
  });
});
