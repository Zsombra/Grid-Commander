import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The risk panel derives from the agent's own record, and from nothing else.
 *
 * `_PM/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES.md` contains measured
 * population figures — a 0.47% mean single-bar adverse excursion, a 0.623%
 * median stop distance, a 74% stop-out rate. They are **measurements taken on a
 * stated date over a stated sample**, not live readings, and the temptation to
 * put one on the panel as a threshold is obvious and wrong: the whole purpose of
 * that surface is to be trusted *instead of* the raw setting, and a number with
 * false precision there is worse than no number. The backlog item says so in as
 * many words, and this test is what stops the next person from doing it anyway.
 *
 * **Two checks, and only one of them is a reachability check.** This repository
 * has learned five times that matching how something is *spelled* rather than
 * what it *reaches* is its characteristic defect, so the weaker check is
 * labelled as weak rather than dressed up:
 *
 *  1. **Reachability (strong).** The module that computes the geometry imports
 *     only port types, so every number it produces comes from its input. A
 *     constant would have to arrive through an import, and there is nowhere for
 *     one to arrive from.
 *  2. **Transcription (weak).** Nothing under `src/` may name the study or
 *     declare a noise-floor-shaped constant. This catches a human copying a
 *     figure across, which is the realistic failure. It cannot catch an
 *     unnamed literal, and it does not pretend to.
 */

function filesUnder(dir: string, ext = '.ts'): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, ext));
    else if (full.endsWith(ext) || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Drop comments, so a file may explain the rule it is obeying. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const imports = (file: string): string[] =>
  [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);

const GEOMETRY = 'src/application/use-cases/read-trading-record.query.ts';

describe('the exit geometry derives from the agent’s own record', () => {
  it('imports only port types, so its numbers can come from nowhere else', () => {
    // The reachability half. Widening this file's imports is the change that
    // would make a smuggled constant possible, so the widening is what fails.
    const outside = imports(GEOMETRY).filter((i) => !i.startsWith('@/ports/'));
    expect(
      outside,
      'the geometry must be computable from the trades it is handed and nothing else',
    ).toEqual([]);
  });

  it('names no population study anywhere in the product', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of [...filesUnder('src'), ...filesUnder('app')]) {
      const source = stripComments(readFileSync(file, 'utf8'));
      if (/TRADE_CATEGORIES_AND_MATHEMATICAL_FAMILIES/.test(source)) {
        offenders.push([file, 'names the study']);
      }
      // The shapes a transcribed floor would take. Named constants only —
      // an unnamed literal is beyond what a text scan can honestly claim.
      //
      // The prefix is `[\w$]*` and not `[A-Za-z_$][\w$]*`. The first draft used
      // the latter and matched nothing: a mandatory leading character consumes
      // the `N` of `NOISE_FLOOR_PCT`, and the alternation can then never find
      // its own first letter however far the greedy quantifier backtracks. It
      // was proven against a planted constant before being trusted, which is
      // the only reason this comment exists rather than a silent false pass.
      const named = source.match(
        /\b(?:const|let|var|readonly)\s+[\w$]*(?:NOISE_?FLOOR|ADVERSE_?EXCURSION|POPULATION_)[\w$]*/gi,
      );
      if (named) offenders.push([file, named.join(', ')]);
    }
    expect(
      offenders,
      'a measured population figure is not a live reading and must not be a threshold',
    ).toEqual([]);
  });
});
