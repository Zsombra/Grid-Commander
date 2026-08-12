/**
 * How the guards launch a real child process, on any platform.
 *
 * The guards that spawn something — the vitest selection check and the
 * recorder's refusal probes — used to call `npx`. On a POSIX box that is an
 * executable; on Windows it is `npx.cmd`, which `spawnSync`/`execFileSync`
 * cannot find without a shell, and which modern Node then refuses to run
 * through one anyway (the `.cmd` argument-injection fix, CVE-2024-27980). So
 * five assertions about the product failed on a Windows checkout over one
 * fact about the launcher — backlog `the-suite-assumes-a-posix-checkout`.
 *
 * The fix is to stop asking a launcher to find what we already know the path
 * of. `npx vitest` resolves to a JS entry point and runs it with node; these
 * constants *are* that entry point, and `process.execPath` is the node
 * already running this suite. Same program, no shell, no `.cmd`, no PATH
 * lookup, and no quoting rules to get wrong on a repository whose checkout
 * path contains a space.
 *
 * It is also faster: `npx` re-resolves the package on every call.
 *
 * If a dependency moves its entry point, these fail loudly at spawn time
 * rather than silently selecting nothing — which is the failure mode the
 * live-probe guard exists to prevent in the first place.
 */
export const NODE = process.execPath;

/** vitest's own CLI entry, as `npx vitest` would resolve it. */
export const VITEST_CLI = 'node_modules/vitest/vitest.mjs';

/** tsx's CLI entry, as `npx tsx` would resolve it. */
export const TSX_CLI = 'node_modules/tsx/dist/cli.mjs';

/** tsc's CLI entry, as `npx tsc` would resolve it. */
export const TSC_CLI = 'node_modules/typescript/bin/tsc';
