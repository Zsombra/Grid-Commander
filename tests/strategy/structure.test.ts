import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * The properties of the compile → review → apply pipeline that a future edit
 * could quietly remove, asserted structurally rather than trusted to review.
 */

function filesUnder(dir: string, ext = '.ts'): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, ext));
    else if (full.endsWith(ext)) out.push(slashed(full));
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

/**
 * S-G. The platform made compiling effect-free so a human could look before
 * committing. If one call site can do both, that safety is handed back and the
 * mistake is one line wide with a fleet-sized consequence.
 */
describe('compiling cannot apply', () => {
  /**
   * Three files legitimately name both, and none of them can perform either:
   * the port declares them, the adapter implements them, and the composition
   * root constructs them. What must not exist is a *caller* holding both.
   */
  const WIRING = ['strategy-adapter', 'ports/strategies', 'composition.ts'];

  it('no caller both compiles and applies', () => {
    const offenders: string[] = [];
    for (const file of filesUnder('src')) {
      if (WIRING.some((w) => file.includes(w))) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      if (code.includes('compilePlan') && code.includes('applyPlan')) offenders.push(file);
    }
    expect(
      offenders,
      'compile and apply are separate use cases; a caller that can do both can do the wrong one',
    ).toEqual([]);
  });

  it('the composition root wires them without invoking either', () => {
    // The exemption above is only safe while this holds. A root that started
    // calling them would be a caller, and the scan would stop protecting
    // anything.
    const root = stripComments(readFileSync('src/composition.ts', 'utf8'));
    expect(root).not.toMatch(/\.(compilePlan|applyPlan)\s*\(/);
    expect(root).not.toMatch(/await\s+\w*[Cc]ompile/);
  });

  it('the apply command names apply_strategy_plan nowhere but the adapter', () => {
    const offenders = filesUnder('src').filter(
      (f) =>
        !f.includes('infrastructure/battlegrid') &&
        !f.includes('apply-plan.command') &&
        stripComments(readFileSync(f, 'utf8')).includes('apply_strategy_plan'),
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * S-B. The token parser can subtract confidence and never add it. If a parse can
 * grant, a token-format change becomes an authorisation bug rather than an
 * outage — which is strictly worse.
 */
describe('parsed token claims never grant', () => {
  const source = stripComments(readFileSync('src/domain/strategy/plan-token.ts', 'utf8'));

  it('refuseLocally returns a refusal or null, never a permission', () => {
    // The function's whole vocabulary is refusal. A `valid`/`ok`/`permitted`
    // shape would invite a caller to treat its absence of doubt as certainty.
    expect(source).toMatch(/LocalRefusal \| null/);
    expect(source).not.toMatch(/return\s*{\s*(kind:\s*)?['"]?(valid|permitted|ok)['"]?/);
  });

  it('an unknown token yields no refusal', () => {
    expect(source).toMatch(/if \(token\.kind === 'unknown'\) return null/);
  });
});

/**
 * S-A. `FIELDS_APPLY_REJECTS` is the list the projection protects against, and
 * the projection is the only place the transformation exists.
 */
describe('the plan projection has one home', () => {
  it('nothing outside the domain builds an apply plan by hand', () => {
    const offenders: string[] = [];
    for (const file of filesUnder('src')) {
      if (file.includes('domain/strategy/compiled-plan')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      // Reaching into postState anywhere else means a second projection.
      if (/postState\s*[.[]/.test(code)) offenders.push(file);
    }
    expect(offenders, 'toApplyPlan is the only projection — see findings F-2').toEqual([]);
  });

  it('the applier sends the projection rather than the compiled result', () => {
    const apply = stripComments(readFileSync('src/application/use-cases/apply-plan.command.ts', 'utf8'));
    expect(apply).toMatch(/plan:\s*toApplyPlan\(/);
    expect(apply).not.toMatch(/plan:\s*\w+\.approvedPlan\b/);
  });
});

/**
 * F-8. Two of my first three live calls were rejected for vocabulary facts that
 * only the server holds. None of it belongs in this repo.
 */
describe('platform vocabulary is read, not written down', () => {
  const VOCABULARY = [
    'rsi_oversold',
    'macd_bull_cross',
    'bollinger',
    'DUNKIRK',
    'LENINGRAD',
    'STALINGRAD',
    'momentum',
    'volumeFlow',
    'crossSectional',
  ];

  it('appears in no source file outside the adapter boundary', () => {
    const offenders: Array<[string, string]> = [];
    for (const file of [...filesUnder('src'), ...filesUnder('src', '.tsx')]) {
      if (file.includes('infrastructure/battlegrid')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      for (const value of VOCABULARY) {
        if (code.includes(value)) offenders.push([file, value]);
      }
    }
    expect(
      offenders,
      'categories, metrics and signals come from list_strategy_* at runtime',
    ).toEqual([]);
  });
});

describe('mismatches never gate an apply', () => {
  it('no code path refuses on a non-empty mismatches list', () => {
    // F-5: a one-word tagline edit produced two mismatches while remaining
    // viable. Blocking on them would refuse routine edits with no way around it.
    const offenders: string[] = [];
    for (const file of filesUnder('src')) {
      const code = stripComments(readFileSync(file, 'utf8'));
      if (/mismatches[^\n]*\.length\s*[>!=]/.test(code)) offenders.push(file);
      if (/concerns\([^)]*\)\.length\s*[>!=]/.test(code)) offenders.push(file);
    }
    expect(offenders, 'viability.viable is the gate; mismatches are advisory').toEqual([]);
  });
});
