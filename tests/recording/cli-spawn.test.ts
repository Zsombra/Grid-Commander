import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { NODE, TSX_CLI } from '../support/platform.js';

/**
 * The recorder CLI's refusals, exercised on the real process.
 *
 * The verifier caught this suite missing: "No credential" is an error
 * scenario, and error scenarios are written down precisely because they are
 * easy to skip. Both refusal paths run here without any BattleGrid — the
 * usage path before configuration is even read, the no-authority path on a
 * delegated boot with dummy config (the session read never touches the
 * database, so the connection string can point at nothing).
 */

const CLI = 'bin/grid-commander-record.ts';

/** Config that satisfies the boot and grants nothing. */
const DUMMY_ENV = {
  ...process.env,
  BATTLEGRID_API_KEY: '',
  BATTLEGRID_CLIENT_ID: 'dummy-client',
  BATTLEGRID_REDIRECT_URI: 'http://localhost:3000/api/auth/battlegrid/callback',
  DATABASE_URL: 'postgres://nobody:nowhere@localhost:9/nothing',
  TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  SESSION_SECRET: 'dummy-session-secret',
};

function run(args: readonly string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(NODE, [TSX_CLI, CLI, ...args], {
    env,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

describe('a refusal names itself, on the real process', () => {
  it('refuses named coins without an interval before touching any config', { timeout: 90_000 }, () => {
    // No environment at all beyond the shell's: the usage check runs first,
    // so a misspelled cron line fails the same way on any deployment.
    const { status, stderr } = run(['--coins', 'BTC'], process.env);
    expect(status).toBe(1);
    expect(stderr).toContain('--interval');
    expect(stderr).toContain('usage:');
  });

  it('refuses to capture without BattleGrid authority, naming what is missing', { timeout: 90_000 }, () => {
    const { status, stderr, stdout } = run([], DUMMY_ENV);
    expect(status).toBe(1);
    expect(stderr).toContain('no BattleGrid authority');
    expect(stderr).toContain('BATTLEGRID_API_KEY');
    // And no empty capture was recorded: the summary line never printed,
    // because the refusal came before the command ran.
    expect(stdout).not.toContain('capture run');
  });
});
