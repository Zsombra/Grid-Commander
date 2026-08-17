import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `exclude` filters `include`, so the two can silently cancel.
 *
 * This project shipped `.next/types` globs in `include` beside
 * `exclude: [".next"]` for three weeks, and the effect was exact: `next build`
 * generated a type-validation file per route, named it for checking, and the
 * exclusion discarded every one before the checker saw it. Fourteen pages
 * violated Next's page contract while `npm run build` — a declared quality
 * gate — passed on all of them (#216, `the-build-checks-what-next-generates`).
 *
 * The rule is the general lesson, not the incident: no `exclude` entry may
 * cover a path that `include` names, whatever either is called. Hard-coding
 * `.next` here would be the same one-step-behind assumption one guard over —
 * the next self-cancelling pair would just wear different names.
 */

/**
 * The path a glob asks for before its first wildcard — the `.next/types` glob
 * asks for `.next/types`. An entry that is all glob (star-star slash star) has no static
 * prefix and can match outside any excluded subtree, so it is never treated
 * as swallowed.
 */
function staticPrefix(glob: string): string[] {
  const out: string[] = [];
  for (const segment of glob.split('/')) {
    if (/[*?]/.test(segment)) break;
    out.push(segment);
  }
  return out;
}

/**
 * Whether exclude entry `excl` swallows include entry `inc`: the include's
 * static prefix sits inside the excluded subtree, segment for segment. An
 * exclude entry carrying its own wildcard is compared by its static prefix
 * too — conservatively, only a full-prefix match counts, so `.next` cannot
 * claim `.nextgate` and a partial name cannot claim anything.
 */
function swallows(excl: string, inc: string): boolean {
  const e = staticPrefix(excl);
  // An exclude entry with wildcard segments is compared conservatively:
  // only a fully static exclude can claim a subtree outright.
  if (e.length === 0 || e.length !== excl.split('/').length) return false;
  const i = staticPrefix(inc);
  if (i.length < e.length) return false;
  return e.every((segment, n) => i[n] === segment);
}

/** Every include entry the exclude list discards — the offender list. */
function swallowedIncludes(include: readonly string[], exclude: readonly string[]): string[] {
  return include.filter((inc) => exclude.some((excl) => swallows(excl, inc)));
}

/**
 * tsconfig.json is JSONC — it carries `//` comments (one names this very
 * guard). Stripped with string-awareness rather than a bare regex, because a
 * `//` inside a quoted value is a path, not a comment.
 */
function stripJsonComments(text: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === '\\') {
        out += text[i + 1] ?? '';
        i++;
      } else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

interface TsConfig {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
}

const tsconfig = JSON.parse(stripJsonComments(readFileSync('tsconfig.json', 'utf8'))) as TsConfig;

describe('tsconfig include and exclude do not cancel', () => {
  it('no exclude entry swallows a path the include list names', () => {
    const offenders = swallowedIncludes(tsconfig.include ?? [], tsconfig.exclude ?? []);
    expect(
      offenders,
      'these include entries are filtered out by exclude — every check they name runs on zero files',
    ).toEqual([]);
  });

  it('the generated route types stay named for checking', () => {
    // The presence half: removing the entry instead of un-excluding it would
    // satisfy the rule above by giving it nothing to defend.
    expect(tsconfig.include ?? []).toContain('.next/types/**/*.ts');
  });

  it('is reading a config that really has both lists', () => {
    // Vacuity: a parse or path drift would hand the rule two empty arrays,
    // which it would pass. This project's config always names both.
    expect((tsconfig.include ?? []).length).toBeGreaterThanOrEqual(3);
    expect((tsconfig.exclude ?? []).length).toBeGreaterThanOrEqual(1);
  });

  /**
   * The proof drives the SAME `swallows`/`swallowedIncludes` the live scan
   * uses — a re-stated copy would prove the copy and leave the live matcher
   * unprotected (harness-integrity: "An Architecture Guard Fails When Its Own
   * Matcher Stops Working"). The planted pair below is the shipped defect,
   * so the proof cannot go quiet just because the project is clean today.
   */
  it('the matcher catches the shipped defect, planted', () => {
    expect(
      swallowedIncludes(['**/*.ts', '**/*.tsx', '.next/types/**/*.ts'], ['node_modules', '.next']),
      'the exact pair #216 shipped must be reported',
    ).toEqual(['.next/types/**/*.ts']);
  });

  it('the matcher stays quiet on inputs it must not report', () => {
    // The clean-pass direction: a matcher broadened to report everything is
    // as blind as one that reports nothing.
    expect(swallows('node_modules', '.next/types/**/*.ts')).toBe(false);
    expect(swallows('.next', '.nextgate/types/**/*.ts')).toBe(false);
    expect(swallows('node_modules', '**/*.ts'), 'an all-glob include has no home to swallow').toBe(
      false,
    );
    expect(swallows('.next', '.next/types/**/*.ts')).toBe(true);
    expect(swallows('.next/cache', '.next/types/**/*.ts'), 'a sibling subtree is not a cover').toBe(
      false,
    );
  });

  it('parses comments without eating paths', () => {
    expect(JSON.parse(stripJsonComments('{"a": "http://x", // c\n "b": 1}'))).toEqual({
      a: 'http://x',
      b: 1,
    });
    expect(JSON.parse(stripJsonComments('{/* block */ "a": "a//b"}'))).toEqual({ a: 'a//b' });
  });
});
