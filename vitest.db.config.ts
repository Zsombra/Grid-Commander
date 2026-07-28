import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * The suite that needs a real PostgreSQL.
 *
 * Separate from `vitest.config.ts` so that the ordinary run needs no database
 * and this one cannot be satisfied without one. There is deliberately no
 * `skipIf`: a suite that skips when `DATABASE_URL` is absent reads exactly like
 * a suite that passed, and "nobody has run these in months" becomes
 * indistinguishable from green.
 *
 * Runs single-threaded. Every test truncates the same five tables, so two files
 * in parallel would clear each other's rows mid-assertion.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
    fileParallelism: false,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
