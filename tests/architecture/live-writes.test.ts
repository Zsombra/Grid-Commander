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

/**
 * A probe can also reach a write through a helper, and this file could not see
 * that.
 *
 * It matched tool names and `*Command` identifiers in the probe's own source.
 * `tests/support/probe-agent.ts` holds the create-or-reuse of the throwaway
 * agent every mutating probe operates on — so the moment that moved out of the
 * probes, the marker moved with it, and a probe reaching
 * `create_intelligence_agent` through one call would have looked inert. The
 * same shape as the miss this file already records: `apply-probe.test.ts` named
 * no tool because it constructed commands, and sailed through the first version
 * of this guard while writing to the operator's account.
 *
 * So the helpers are read too, and reach found in one is attributed to any
 * block that calls it. Attribution is per module rather than per export: a
 * module that can write is treated as writing whichever of its names is used.
 * That over-reports — `probeAgentName` composes a string — and over-reporting
 * costs a probe an opt-in it needs anyway, while under-reporting costs somebody
 * an agent.
 */
const HELPER_DIR = 'tests/support';

/** Exported callables, by name, for every helper whose code can reach a write. */
const WRITING_HELPERS = new Map<string, string>();
for (const file of readdirSync(HELPER_DIR).filter((f) => f.endsWith('.ts'))) {
  const code = stripComments(readFileSync(`${HELPER_DIR}/${file}`, 'utf8'));
  const reaches =
    MUTATING.some((tool) => code.includes(tool)) || /\b[A-Z][A-Za-z]*Command\b/.test(code);
  if (!reaches) continue;
  for (const m of code.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)/g)) {
    WRITING_HELPERS.set(m[1] as string, file);
  }
}

/** Everything in this fragment of source that can end in a BattleGrid write. */
function reachIn(code: string): string[] {
  return [
    ...MUTATING.filter((tool) => code.includes(tool)),
    ...new Set(code.match(/\b[A-Z][A-Za-z]*Command\b/g) ?? []),
    ...[...WRITING_HELPERS]
      .filter(([name]) => new RegExp(`\\b${name}\\b`).test(code))
      .map(([name, file]) => `${name} (via ${HELPER_DIR}/${file})`),
  ];
}

describe('a live probe that can mutate requires more than a credential', () => {
  it('has mutating tools to look for, and live probes to look at', () => {
    // Guards the guard. If the classification key were ever renamed, MUTATING
    // would empty and every assertion below would pass vacuously.
    expect(MUTATING.length, 'the surface record classifies mutating tools').toBeGreaterThan(20);
    expect(liveFiles.length).toBeGreaterThan(10);
    // And the same for the indirect route: the helper that acquires a probe's
    // throwaway agent creates one, so it must register as able to write. An
    // empty map would mean the export scan drifted, not that the helpers got
    // safer.
    expect(
      WRITING_HELPERS.get('acquireProbeAgent'),
      'the throwaway-agent helper reaches a create and must be seen to',
    ).toBe('probe-agent.ts');
  });

  it('gates every probe that can mutate on the explicit opt-in', () => {
    /**
     * Two ways a probe reaches a write, and the first version of this guard
     * only saw one of them.
     *
     * It matched BattleGrid tool *names* in the source. `apply-probe.test.ts`
     * names none: it forks a strategy and applies a plan by constructing
     * `ForkStrategyCommand` and `ApplyPlanCommand`, so it sailed through and
     * ran unasked during CI on 2026-08-04 — the exact exposure this file was
     * written to close, missed by the file itself.
     *
     * A `*Command` is this codebase's own name for the write side of a
     * use-case (`Query` reads, `Command` writes). Gating on it is deliberately
     * conservative: a Command that only touches this product's store would
     * also be gated, which costs nothing, because a live probe needs a
     * credential regardless.
     */
    const offenders: Array<[string, string]> = [];
    for (const file of liveFiles) {
      const raw = readFileSync(`tests/live/${file}`, 'utf8');
      const reach = reachIn(stripComments(raw));
      if (reach.length === 0) continue;
      if (!raw.includes('BATTLEGRID_LIVE_WRITES')) offenders.push([file, reach.join(', ')]);
    }
    expect(
      offenders,
      'a probe that can reach a mutating tool must require BATTLEGRID_LIVE_WRITES=1, ' +
        'not merely a key in the environment',
    ).toEqual([]);
  });

  it('never treats the key alone as sufficient for a block that writes', () => {
    /**
     * The specific regression: adding the opt-in constant but leaving the
     * `describe` chosen by the key alone.
     *
     * Checked per **block**, not per file. This read "the file's one
     * `const live =` line must mention WRITES", which held while every probe
     * had a single gate and broke the moment one legitimately had two:
     * `proposal-probe.test.ts` describes a real agent read-only under a key,
     * and creates one under the opt-in. A file-wide rule can only answer that
     * by failing an honest split or by exempting the file — and the file it
     * would exempt is the one doing the more careful thing.
     *
     * So: find each gate the file declares, note whether it consults the
     * opt-in, and require that no block reaching a write runs under one that
     * does not.
     */
    const offenders: string[] = [];

    for (const file of liveFiles) {
      const raw = readFileSync(`tests/live/${file}`, 'utf8');
      if (!raw.includes('BATTLEGRID_LIVE_WRITES')) continue;
      const code = stripComments(raw);

      // `const live = KEY && WRITES ? describe : describe.skip` — the name, and
      // whether the opt-in is consulted in choosing between them.
      //
      // Matched on `describe.skip` rather than `describe`, and on one line: a
      // gate is the thing that can *decline* to run, and every helper in these
      // files that merely mentions the word would otherwise be read as one —
      // `archiveOf` was, and dragged three probes into the offender list.
      const gates = new Map<string, boolean>();
      for (const m of code.matchAll(/const\s+(\w+)\s*=\s*([^;\n]*describe\.skip[^;\n]*);/g)) {
        gates.set(m[1] as string, /WRITES/.test(m[2] as string));
      }
      expect(gates.size, `${file} declares a gate`).toBeGreaterThan(0);
      expect(
        [...gates.values()].some(Boolean),
        `${file} mentions the opt-in but no gate consults it`,
      ).toBe(true);

      // Where each gated block starts. Blocks run to the next one, which is
      // exact enough here because gates are invoked at the top level and in
      // order — and far less brittle than counting braces through strings.
      const starts: Array<{ at: number; gate: string }> = [];
      for (const [gate] of gates) {
        for (const m of code.matchAll(new RegExp(`\\b${gate}\\s*\\(`, 'g'))) {
          starts.push({ at: m.index, gate });
        }
      }
      starts.sort((a, b) => a.at - b.at);

      for (const [i, start] of starts.entries()) {
        if (gates.get(start.gate) === true) continue;
        const block = code.slice(start.at, starts[i + 1]?.at ?? code.length);
        const reach = reachIn(block);
        if (reach.length > 0) {
          offenders.push(`${file}: a "${start.gate}" block reaches ${reach.join(', ')}`);
        }
      }
    }

    expect(
      offenders,
      'a block that can write must run under a gate consulting BATTLEGRID_LIVE_WRITES',
    ).toEqual([]);
  });
});
