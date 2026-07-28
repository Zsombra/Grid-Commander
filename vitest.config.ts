import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // The database suite runs separately — see vitest.db.config.ts. Excluded
    // here rather than made conditional, so `npm test` needs no PostgreSQL on a
    // laptop or in the `app` CI job, and so a database test can never quietly
    // become a skipped one.
    exclude: ['**/node_modules/**', 'tests/db/**'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
