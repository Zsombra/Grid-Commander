// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The boundary rules below are not style. They are how the architecture
 * checklist's P6 ("One way in") and the Clean Architecture dependency rule
 * become something CI can fail on rather than something a reviewer must notice.
 */
export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'drizzle/**',
      'tests/**/fixtures/**',
      // Written by `next build`, gitignored, and documented as not-to-be-edited.
      // Without this, lint's result depends on whether a build has run — it
      // passes on a fresh checkout and fails afterwards, which is a worse
      // property for a gate than simply failing.
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // P6 — the MCP SDK may be imported in exactly two places, one per direction.
  //
  // This product speaks MCP twice, in opposite directions:
  //
  //   as a CLIENT of BattleGrid   → src/infrastructure/battlegrid/
  //   as a SERVER to the operator → src/mcp/ and bin/
  //
  // The original rule named only the first, because for months there was
  // only the first. Its reason — "reach BattleGrid through BattleGridPort"
  // — still binds every file: nothing outside the adapter may call the
  // platform. The server side calls nothing outward at all; it answers a
  // model that connected to us. Widening for that is not a weakening, and
  // the ignore list stays exact so a third place fails here.
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['src/infrastructure/battlegrid/**', 'src/mcp/**', 'bin/**', 'tests/mcp/**', 'tests/live/mcp-*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '@modelcontextprotocol/sdk',
          message:
            'P6: reach BattleGrid through BattleGridPort. The MCP SDK is imported in src/infrastructure/battlegrid/ (client) and src/mcp/ or bin/ (server), nowhere else.',
        }],
        patterns: [{
          group: ['@modelcontextprotocol/sdk/*'],
          message:
            'P6: reach BattleGrid through BattleGridPort. The MCP SDK is imported in src/infrastructure/battlegrid/ (client) and src/mcp/ or bin/ (server), nowhere else.',
        }],
      }],
    },
  },

  // The domain imports nothing outward. Not the database, not the network,
  // not the framework. This is what makes it exhaustively testable.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: [
            '@/infrastructure/*', '@/application/*', '@/presentation/*',
            'next/*', 'next', 'drizzle-orm', 'drizzle-orm/*', 'postgres',
            '@modelcontextprotocol/*', 'react', 'react-dom',
          ],
          message: 'The domain layer imports nothing outward. Depend on a port instead.',
        }],
      }],
    },
  },

  // Use cases depend on ports and the domain — never on a concrete adapter.
  {
    files: ['src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/infrastructure/*', 'drizzle-orm', 'drizzle-orm/*', 'postgres', 'next/*'],
          message: 'Use cases depend on ports, not infrastructure. Inject the dependency.',
        }],
      }],
    },
  },


  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'error',
    },
  },

  /**
   * Build tooling and root config files are Node programs, not application
   * code. `console` is its
   * only output channel and `process.exit` is how it fails a build, so the two
   * rules that exist to keep those out of the app would only be silenced with
   * inline disables here — which hides them from the app as well.
   */
  {
    files: ['tools/**/*.mjs', '*.config.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
