#!/usr/bin/env node
/**
 * Break a guard's matcher on purpose, and see whether the guard notices.
 *
 *   node tools/mutate-guard.mjs <testFile> <find> <replace> [<find> <replace> …]
 *
 * Prints **KILLED** when the guard failed — it saw the damage — or **SURVIVED**
 * when it stayed green with its own rule dead.
 *
 * ## Why this is a command and not a paragraph
 *
 * Reading a guard cannot tell you whether its pattern can match. This project
 * has now proved that six times, twice while writing a check against it: a
 * `[A-Za-z_$][\w$]*` prefix that consumed the first letter of the constant it
 * was hunting, a `[^\n]*(?:\\\n[^\n]*)*` continuation reader whose greedy class
 * ate the backslash. Both were written, run, and passed green against a planted
 * violation before anyone noticed.
 *
 * The 2026-08-10 audit (GitHub #87) found **10 of 16 architecture guards passed
 * with their offender matcher dead**, including both guards standing between a
 * model and a live trading account. Every one of those findings came from
 * running this, and until now "this" lived in a session transcript — so the
 * only thing that has ever proven these guards work was not in the repository.
 * That is the same defect the audit is about, one level up.
 *
 * ## The two ways a guard goes quiet
 *
 * **Blind** — the matcher finds nothing, so `expect(offenders).toEqual([])`
 * passes. The obvious one.
 *
 * **Permissive** — the matcher finds everything, which silences rules shaped as
 * *nothing is missing*. `sends()` returning `true` unconditionally left thirteen
 * MCP conformance checks green while asserting nothing. Mutate in both
 * directions; a rule proven against only one is proven against half of how it
 * fails.
 *
 * ## What this refuses to do
 *
 * A find string that is not in the file is an **error**, not a no-op. Running an
 * unmutated file and printing a verdict would make this lie in the one direction
 * that matters — reporting a guard as proven when nothing was ever broken.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Apply literal substitutions, or throw naming the first one that is absent.
 *
 * Literal rather than regex, deliberately: the input is usually itself a regex,
 * and asking someone to escape a pattern in order to break a pattern is how
 * this tool would end up with the bug it exists to find.
 */
export function applyMutations(source, pairs) {
  if (pairs.length === 0 || pairs.length % 2 !== 0) {
    throw new Error('mutations must be find/replace pairs');
  }
  let out = source;
  let applied = 0;
  for (let i = 0; i < pairs.length; i += 2) {
    const find = pairs[i];
    const replace = pairs[i + 1];
    if (!out.includes(find)) {
      throw new Error(`not found in file, so nothing would have been mutated: ${find}`);
    }
    const parts = out.split(find);
    applied += parts.length - 1;
    out = parts.join(replace);
  }
  return { source: out, applied };
}

/**
 * The verdict, from the guard's exit status.
 *
 * Inverted on purpose, and the naming follows mutation testing rather than
 * test-running: a **failing** guard is the good outcome, because it means the
 * damage was detected. Calling that "passed" would read as though the mutation
 * had succeeded.
 */
export const verdictOf = (guardPassed) => (guardPassed ? 'SURVIVED' : 'KILLED');

/**
 * Mutate, run, restore. The restore is in `finally` and runs on every path.
 *
 * The original is held in memory *and* written beside the system temp
 * directory — outside the repository, so a killed process can never leave
 * anything committable behind. An earlier session left a stray `__mutant.test.ts`
 * in `tests/architecture/` and a `git add -A` swept it into a commit; the
 * backup goes where `git add` cannot reach it.
 *
 * `run` is injectable so this is testable without invoking vitest inside vitest.
 */
export function mutateAndRun(file, pairs, run) {
  const original = readFileSync(file, 'utf8');
  // Applied before anything is written, so a missing find string leaves the
  // file untouched rather than half-mutated.
  const { source, applied } = applyMutations(original, pairs);

  const backup = join(tmpdir(), `mutate-guard-${process.pid}-${file.replace(/[^\w]/g, '_')}`);
  writeFileSync(backup, original);

  const restore = () => {
    writeFileSync(file, original);
    if (existsSync(backup)) unlinkSync(backup);
  };
  // A signal is one of the ways "the run ends", and the commonest one in
  // practice — someone watching a slow suite and pressing ctrl-C.
  const onSignal = () => {
    restore();
    process.exit(130);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    writeFileSync(file, source);
    const { passed, output } = run(file);
    return { verdict: verdictOf(passed), applied, output };
  } finally {
    restore();
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
  }
}

/** Run one test file through vitest. Non-zero exit means the guard failed. */
function runVitest(file) {
  try {
    const output = execFileSync('npx', ['vitest', 'run', file, '--reporter=dot'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { passed: true, output };
  } catch (e) {
    return { passed: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function main() {
  const [file, ...pairs] = process.argv.slice(2);
  if (!file || pairs.length === 0 || pairs.length % 2 !== 0) {
    console.error('usage: node tools/mutate-guard.mjs <testFile> <find> <replace> [<find> <replace> …]');
    console.error('');
    console.error('  Prints KILLED when the guard notices its matcher is broken,');
    console.error('  SURVIVED when it stays green with its own rule dead.');
    process.exit(2);
  }

  let result;
  try {
    result = mutateAndRun(file, pairs, runVitest);
  } catch (e) {
    console.error(`refused: ${e.message}`);
    process.exit(3);
  }

  console.log(result.output.trim().split('\n').slice(-10).join('\n'));
  console.log('─'.repeat(60));
  console.log(`${result.verdict}  ·  ${result.applied} substitution(s)  ·  ${file}`);
  // Non-zero on SURVIVED: the guard is not proven, and a caller scripting this
  // over several mutations should be able to tell without parsing the word.
  process.exit(result.verdict === 'SURVIVED' ? 1 : 0);
}

// `node tools/mutate-guard.mjs …` runs; `import` for the tests does not.
if (process.argv[1] && process.argv[1].endsWith('mutate-guard.mjs')) main();
