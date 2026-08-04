import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * A credential in the environment must not turn `npm test` into a write.
 *
 * Every live probe gated itself on `BATTLEGRID_API_KEY` alone. So an operator
 * with a key exported — which is now the normal way to run `./scripts/ci.sh`,
 * because the freshness gate needs one — ran four mutating probes concurrently
 * against their real BattleGrid account. They forked strategies, archived
 * them, created and archived an agent, and tripped each other's optimistic
 * concurrency doing it. Observed 2026-08-04, the first time anything ran the
 * suite with a key present.
 *
 * Nothing was lost; the confirmation ceremony refused what it should. But the
 * exposure was never a decision anyone made, and a key being present is not
 * consent to mutate an account.
 *
 * `oauth-metadata.test.ts` had already argued the general form of this:
 * "gating it on `BATTLEGRID_API_KEY` would tie a check that requires no
 * authority to a variable that grants a lot of it". This is the same mistake
 * in the opposite direction — authority present, intent absent.
 *
 * The list of mutating tools is **derived from the surface record**, never
 * written down here. An allowlist would go stale exactly when it mattered, and
 * this repository has already paid for one of those.
 */

interface Surface {
  tools: Array<{ name: string; classification: string }>;
}

const surface = JSON.parse(readFileSync('docs/battlegrid-mcp-surface.json', 'utf8')) as Surface;

/** The server's own annotation. `read` is safe; everything else is not. */
const MUTATING = surface.tools
  .filter((t) => t.classification !== 'read')
  .map((t) => t.name);

/** Comments describe writes constantly; only code can perform one. */
const stripComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const liveFiles = readdirSync('tests/live').filter((f) => f.endsWith('.test.ts'));

describe('a live probe that can mutate requires more than a credential', () => {
  it('has mutating tools to look for, and live probes to look at', () => {
    // Guards the guard. If the classification key were ever renamed, MUTATING
    // would empty and every assertion below would pass vacuously.
    expect(MUTATING.length, 'the surface record classifies mutating tools').toBeGreaterThan(20);
    expect(liveFiles.length).toBeGreaterThan(10);
  });

  it('gates every probe naming a mutating tool on the explicit opt-in', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of liveFiles) {
      const raw = readFileSync(`tests/live/${file}`, 'utf8');
      const code = stripComments(raw);
      const named = MUTATING.filter((tool) => code.includes(tool));
      if (named.length === 0) continue;
      if (!raw.includes('BATTLEGRID_LIVE_WRITES')) offenders.push([file, named.join(', ')]);
    }
    expect(
      offenders,
      'a probe that can reach a mutating tool must require BATTLEGRID_LIVE_WRITES=1, ' +
        'not merely a key in the environment',
    ).toEqual([]);
  });

  it('never treats the key alone as sufficient in a gated probe', () => {
    /**
     * The specific regression: adding the opt-in constant but leaving the
     * `describe` chosen by the key. Both must be consulted where the file
     * declares its gate.
     */
    for (const file of liveFiles) {
      const raw = readFileSync(`tests/live/${file}`, 'utf8');
      if (!raw.includes('BATTLEGRID_LIVE_WRITES')) continue;
      const gate = stripComments(raw)
        .split('\n')
        .find((l) => l.includes('const live ='));
      expect(gate, `${file} declares a gate`).toBeTruthy();
      expect(gate, `${file} consults the write opt-in in its gate`).toMatch(/WRITES/);
    }
  });
});
