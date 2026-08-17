import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // The rendering suite imports page components. Next compiles JSX with the
  // automatic runtime (no `import React`), so vitest must transform it the
  // same way or every element expression is a ReferenceError.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The database suite runs separately — see vitest.db.config.ts. Excluded
    // here rather than made conditional, so `npm test` needs no PostgreSQL on a
    // laptop or in the `app` CI job, and so a database test can never quietly
    // become a skipped one.
    //
    // `tests/live/**` is excluded for the same reason and a sharper one. Thirty
    // probe files `describe.skip` without a credential, so inside this suite
    // they were thirty checks that never ran, reported as a pass — and *with* a
    // credential they all ran at once, which is the concurrent sweep
    // `vitest.live.config.ts` pins `fileParallelism: false` to prevent, against
    // a real trading account. `npm run test:live` is the way in, and
    // `scripts/ci.sh` names it as a gate so its absence is stated rather than
    // assumed.
    //
    // This is not what compiles them: `tsconfig.json` includes `**/*.ts`, so a
    // probe that stops parsing still fails `npm run typecheck`. Asserted in
    // `tests/architecture/live-probes-are-named.test.ts`.
    exclude: ['**/node_modules/**', 'tests/db/**', 'tests/live/**'],
    /*
     * Sized for scheduler contention, not for how long a test's own work takes.
     *
     * vitest's default is 5000 ms and was chosen by vitest, not by anyone here.
     * The cases that kept tripping it need about **0.5 s** each when run alone —
     * `new-agent.test.ts` timed out in a full run and passed in 512 ms
     * immediately after, on the same tree. What they compete with is 212 files
     * transforming and collecting in parallel: `collect` alone has been observed
     * swinging between **138 s and 231 s** across runs of an unchanged tree.
     *
     * The failure that settled it (#330): one gate run reported **13 failures
     * across 6 different files** and the very next run of the same commit
     * reported 2713/2713. Zero assertion failures in the 13 — every one was this
     * clock. A gate that can report a double-digit failure count for no reason
     * stops being read and starts being re-run until green, which is the habit
     * that lets a real failure through.
     *
     * **This is not licence for a case that genuinely got slower.** 15 s against
     * a 0.5 s workload is 30x headroom for the scheduler; a test that needs more
     * than that has a real problem and should be fixed rather than accommodated
     * by raising this again.
     */
    testTimeout: 15_000,
    // `PerformButton` is a client component and the rendering harness calls
    // components directly, so its hook has no dispatcher and throws. Registered
    // once here rather than at the top of every file that renders a ceremony
    // page — see the setup file for why mocking is the only route.
    setupFiles: ['tests/setup/form-status.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
