import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * The live probes, serially — because the platform rate-limits.
 *
 * The 2026-08-07 concurrent sweep produced nine phantom failures (an empty
 * server version mid-sweep, rosters unreadable) that a serial re-run
 * collapsed to two. The pacing used to live in HANDOFF prose; a rule that
 * matters belongs where the command reads it. `npm run test:live`.
 *
 * The main suite stays parallel (vitest.config.ts): slowing 1,879 unit
 * tests to protect 27 probes would be the wrong trade.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['tests/live/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
