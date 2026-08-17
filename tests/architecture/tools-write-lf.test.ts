import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { slashed } from '../support/source-tree.js';

/**
 * The repository's own tools pin the line endings they write.
 *
 * Python translates `\n` to `\r\n` on Windows unless `newline` is given, and
 * **pinning `encoding` does not imply it**. `.claude/tools/openspec.py` passed
 * `encoding="utf-8"` and still wrote 799 carriage returns into a merged spec on
 * 2026-08-13; the first of the day's two archives was committed that way before
 * anyone noticed (#209). The write looked careful, which is exactly why this is
 * a check rather than a habit.
 *
 * `.gitattributes` normalises on commit, so no committed blob is ever wrong.
 * The cost is in the working tree, where the guards run — and its own header
 * records what that cost: CRLF made two matchers compare `\n` against `\r\n`
 * and read nothing, and made esbuild refuse a CRLF `.mjs` outright, so
 * `tests/tools/mutate-guard.test.ts` collected zero tests and the suite reported
 * nineteen failures about the platform and none about the product (#171).
 *
 * **Derived from the source, deliberately.** A check that reads the committed
 * artifacts would pass on every platform and prove nothing, because git has
 * already normalised them by then. Reading the writers instead covers the
 * eighth one on the day it is written rather than the day it bites.
 */

const TOOL_DIRS = ['.claude/tools', 'tools'];

/** Every Python file in the repository's tooling. */
function pythonTools(): string[] {
  return TOOL_DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.py'))
      .map((f) => slashed(join(dir, f))),
  );
}

/**
 * Lines that open a file for text writing.
 *
 * Matches the two forms the tooling uses — `open(..., "w")` and
 * `Path.write_text(...)` — and deliberately not `"wb"`: a binary write has no
 * line endings to translate, and demanding `newline` there would be a rule
 * about spelling rather than about behaviour.
 */
function textWrites(source: string): { line: number; text: string }[] {
  return source
    .split('\n')
    .map((text, i) => ({ line: i + 1, text }))
    .filter(({ text }) => /\.write_text\(|\bopen\([^)]*["']w["']/.test(text))
    .filter(({ text }) => !/["']wb["']/.test(text));
}

/**
 * The two pins, named so they can be exercised.
 *
 * They were written inline in the rule loops below, and #252 named the
 * consequence: the floor counts `textWrites` output and the matcher cases feed
 * `textWrites`, so *both* prove the selector. Make either predicate permissive
 * (`/newline\s*=/` -> `/./`) and the offender list empties forever — the floor
 * stays satisfied, every case stays green, and the rule is dead.
 */
function namesNewline(text: string): boolean {
  return /newline\s*=/.test(text);
}

function namesEncoding(text: string): boolean {
  return /encoding\s*=/.test(text);
}

/**
 * The rule, composed: the text writes in `source` that fail `pins`.
 *
 * The two rules and the matcher proof all call this one function, deliberately.
 * A proof that re-typed the regex would assert against a copy and leave the
 * live predicate unexercised — the same vacuity, wearing a test's clothes.
 */
function unpinned(
  source: string,
  pins: (text: string) => boolean,
): { line: number; text: string }[] {
  return textWrites(source).filter(({ text }) => !pins(text));
}

describe('the tools pin the line endings they write', () => {
  it('every text write names its newline', () => {
    const offenders: string[] = [];
    for (const file of pythonTools()) {
      const source = readFileSync(file, 'utf8');
      for (const { line, text } of unpinned(source, namesNewline)) {
        offenders.push(`${file}:${line}  ${text.trim()}`);
      }
    }
    expect(
      offenders,
      'these inherit the platform default, which is CRLF on Windows:\n    ' +
        offenders.join('\n    '),
    ).toEqual([]);
  });

  it('every text write names its encoding too', () => {
    /**
     * The neighbouring defect, and the one that came first: an unpinned
     * `encoding` made `generate_mcp_reference.py` unrunnable on Windows
     * entirely (#186). Three of the writes fixed alongside #209 had no encoding
     * either.
     */
    const offenders: string[] = [];
    for (const file of pythonTools()) {
      const source = readFileSync(file, 'utf8');
      for (const { line, text } of unpinned(source, namesEncoding)) {
        offenders.push(`${file}:${line}  ${text.trim()}`);
      }
    }
    expect(offenders, `these inherit the platform codepage:\n    ${offenders.join('\n    ')}`).toEqual(
      [],
    );
  });

  it('is looking at writers that exist', () => {
    /**
     * A scan that silently matched nothing would pass vacuously — the failure
     * this directory exists to prevent, and the one that let a dead regex sit
     * green over a planted violation (#87).
     */
    const files = pythonTools();
    expect(files.length, 'no python tooling found').toBeGreaterThan(4);
    const writes = files.flatMap((f) => textWrites(readFileSync(f, 'utf8')));
    expect(writes.length, 'the matcher found no text writes at all').toBeGreaterThan(4);
  });

  it('reports a write that names neither pin, and passes one that names both', () => {
    /**
     * The predicates' own coverage (#252), run through the same `unpinned()`
     * the two rules above call.
     *
     * The offender is not synthetic. It is the line as it actually stood at
     * `.claude/tools/openspec.py:1685` until #212 pinned it — the write that
     * put 799 carriage returns into a merged spec (#209). It names `encoding`
     * and not `newline`, which makes it prove a second thing for free: the two
     * predicates are not one regex, because the newline rule must report this
     * line and the encoding rule must pass it.
     */
    const NEITHER = '        path.write_text(text)';
    const ENCODING_ONLY = '        path.write_text(text, encoding="utf-8")';
    // Double-backslash on purpose: the Python source reads `newline="\\n"`, and a
    // single one here would split this fixture into two lines and pass for the
    // wrong reason. The length assertion below is what keeps that honest.
    const PINNED = '        path.write_text(text, encoding="utf-8", newline="\\n")';
    expect(textWrites(PINNED), 'the pinned fixture is one write, not a split string').toHaveLength(
      1,
    );

    expect(unpinned(ENCODING_ONLY, namesNewline).map((w) => w.text)).toEqual([ENCODING_ONLY]);
    expect(unpinned(PINNED, namesNewline)).toEqual([]);

    expect(unpinned(NEITHER, namesEncoding).map((w) => w.text)).toEqual([NEITHER]);
    expect(unpinned(PINNED, namesEncoding)).toEqual([]);
  });

  it('does not demand a newline on binary writes', () => {
    // The rule is about translated line endings, and `"wb"` has none. Asserted
    // so the exclusion is a decision rather than an accident of the regex.
    expect(textWrites('    with open(p, "wb") as f:')).toEqual([]);
    expect(textWrites('    with open(p, "w") as f:').length).toBe(1);
  });
});
