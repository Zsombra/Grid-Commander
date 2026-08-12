import { readFileSync } from 'node:fs';

/**
 * Paths the architecture guards can compare.
 *
 * The guards walk the source tree and assert on what they find — "this file
 * imports the MCP SDK", "this target is composed outside the builder". Those
 * assertions name files as string literals, written with forward slashes,
 * because that is how the repository talks about itself.
 *
 * `path.join` does not. On Windows it returns `src\domain\errors.ts`, which
 * equals nothing anybody wrote down, so nineteen guards failed on a clean
 * checkout while the code they guard was fine (backlog
 * `the-suite-assumes-a-posix-checkout`). A red suite that is red for the
 * platform rather than the change is a suite that stops being read — the
 * session that found this had to diff its failures against a stashed HEAD to
 * learn whether it had broken anything.
 *
 * `failure-is-explained.test.ts` already carried a private copy of this and
 * was the one guard in its family that passed on Windows. This is that copy,
 * moved somewhere its siblings can reach.
 *
 * Not a general path utility: it normalises *for comparison and display*.
 * `readFileSync` is happy with forward slashes on every platform, so nothing
 * needs converting back.
 */
export const slashed = (file: string): string => file.split(/[/\\]/).join('/');

/**
 * A source file's text, with one spelling of "new line".
 *
 * The other half of the same problem. Git checks these files out with CRLF on
 * Windows, and a guard matching `/required\n/` or joining shell continuations
 * with `/\\\n/` sees `\r\n` and matches nothing — silently, which is the worst
 * way for a check to fail. These guards assert on the *shape of lines*, not on
 * bytes, so normalising is not hiding a difference: it is reading the file the
 * way the assertion already assumes it was written.
 *
 * `readFileSync` stays available for the guards that genuinely want bytes.
 */
export const readText = (file: string): string =>
  readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
