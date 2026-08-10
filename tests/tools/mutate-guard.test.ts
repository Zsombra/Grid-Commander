import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// A plain .mjs dev tool. `allowJs` types it from the source itself, so it needs
// no declaration file — and would not benefit from one nobody keeps in step.
import { applyMutations, mutateAndRun, verdictOf } from '../../tools/mutate-guard.mjs';

/**
 * The tool that proves the guards, proved.
 *
 * This is not ceremony. `tools/mutate-guard.mjs` is the only thing in the
 * repository that can answer whether an architecture guard's matcher works, and
 * a broken *runner* is worse than no runner: it would report KILLED for a file
 * it never mutated, and every guard would look proven.
 *
 * The failure mode is specific and cheap to hit. If a find string is absent and
 * the tool shrugged, it would run the file unmodified, watch it pass, and print
 * SURVIVED — or worse, run a file it did mutate, crash, and leave the mutation
 * on disk for `git add -A` to sweep up. Both are tested below.
 *
 * `run` is injected throughout, so none of this invokes vitest inside vitest.
 * What is under test is the mutate/restore/verdict logic, which is where the
 * damage would come from; the vitest invocation itself is four lines with no
 * branching.
 */

/** A throwaway file, so nothing here can touch a real guard. */
function aFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'mutate-guard-test-'));
  const file = join(dir, 'subject.test.ts');
  writeFileSync(file, content);
  return file;
}

const GUARD = "const offenders = files.filter((f) => /console\\.(log|warn)/.test(read(f)));";

describe('the substitution', () => {
  it('replaces every occurrence and counts them', () => {
    const { source, applied } = applyMutations('a X b X c', ['X', 'Y']);
    expect(source).toBe('a Y b Y c');
    expect(applied).toBe(2);
  });

  it('applies several pairs in order', () => {
    const { source, applied } = applyMutations('one two', ['one', '1', 'two', '2']);
    expect(source).toBe('1 2');
    expect(applied).toBe(2);
  });

  it('refuses a find string the file does not contain', () => {
    // The load-bearing refusal. Silently doing nothing here would mean running
    // an unmutated file and reporting on a mutation that never happened.
    expect(() => applyMutations('hello', ['absent', 'x'])).toThrow(/not found/);
  });

  it('refuses an odd number of arguments', () => {
    expect(() => applyMutations('hello', ['find'])).toThrow(/pairs/);
  });
});

describe('the verdict reads from the guard, inverted', () => {
  it('calls a guard that failed KILLED — it noticed the damage', () => {
    expect(verdictOf(false)).toBe('KILLED');
  });

  it('calls a guard that passed SURVIVED — it did not', () => {
    expect(verdictOf(true)).toBe('SURVIVED');
  });
});

describe('the file is restored however the run ends', () => {
  it('hands the run the mutated content, not the original', () => {
    const file = aFile(GUARD);
    let seen = '';
    mutateAndRun(file, ['console\\.(log|warn)', 'ZZZNEVER'], (f: string) => {
      seen = readFileSync(f, 'utf8');
      return { passed: true, output: '' };
    });
    expect(seen).toContain('ZZZNEVER');
    expect(seen).not.toContain('console');
  });

  it('restores after a run that passed', () => {
    const file = aFile(GUARD);
    const out = mutateAndRun(file, ['console\\.(log|warn)', 'ZZZNEVER'], () => ({
      passed: true,
      output: '',
    }));
    expect(out.verdict).toBe('SURVIVED');
    expect(readFileSync(file, 'utf8')).toBe(GUARD);
  });

  it('restores after a run that failed', () => {
    const file = aFile(GUARD);
    const out = mutateAndRun(file, ['console\\.(log|warn)', 'ZZZNEVER'], () => ({
      passed: false,
      output: '',
    }));
    expect(out.verdict).toBe('KILLED');
    expect(readFileSync(file, 'utf8')).toBe(GUARD);
  });

  it('restores after a run that threw', () => {
    // The path that left a stray mutant behind once already. A crash mid-run
    // must not be the difference between a clean tree and a committed mutation.
    const file = aFile(GUARD);
    expect(() =>
      mutateAndRun(file, ['console\\.(log|warn)', 'ZZZNEVER'], () => {
        throw new Error('vitest exploded');
      }),
    ).toThrow('vitest exploded');
    expect(readFileSync(file, 'utf8')).toBe(GUARD);
  });

  it('leaves the file untouched when a find string is absent', () => {
    // Refused before anything is written — not written, run, and rolled back.
    const file = aFile(GUARD);
    let ran = false;
    expect(() =>
      mutateAndRun(file, ['absent-from-the-file', 'x'], () => {
        ran = true;
        return { passed: true, output: '' };
      }),
    ).toThrow(/not found/);
    expect(ran, 'the guard must not run when nothing was mutated').toBe(false);
    expect(readFileSync(file, 'utf8')).toBe(GUARD);
  });

  it('restores every pair when the second one fails to apply', () => {
    // A partial mutation is the worst outcome: the file is damaged, the run
    // reports on a rule nobody meant to break, and the verdict is meaningless.
    const file = aFile(GUARD);
    expect(() =>
      mutateAndRun(file, ['console', 'ZZZ', 'absent', 'x'], () => ({ passed: true, output: '' })),
    ).toThrow(/not found/);
    expect(readFileSync(file, 'utf8')).toBe(GUARD);
  });
});
