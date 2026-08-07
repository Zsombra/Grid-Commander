#!/usr/bin/env node
import { app } from '@/composition.js';
import { exitCodeFor } from '@/application/use-cases/capture-signals.command.js';
import type { CookieStore } from '@/infrastructure/http/cookie-session.js';
import { parseRecorderArgs, summariseCapture } from '@/presentation/recorder-cli.js';

/**
 * One capture, then exit — the recorder's unattended entry.
 *
 * The schedule deliberately lives outside the product, in whatever the
 * operator already trusts to run things:
 *
 *   17 * * * *  cd /path/to/grid-commander && \
 *     DATABASE_URL=… BATTLEGRID_API_KEY=bg_live_… \
 *     npx tsx bin/grid-commander-record.ts
 *
 * Exit zero only when the record grew — cron's one question. A run that
 * recorded nothing (refused, nothing to cover, every coin failed) exits
 * nonzero so the operator hears about it, because each day the recorder is
 * quietly dead is signal history permanently lost.
 *
 * Reads only: every platform call this makes is a read, and the account is
 * the same after a run as before it. The write is to this product's own
 * database.
 */

/** No browser, no session — the same stub the MCP server boots with. */
const NO_COOKIES: CookieStore = {
  get: () => undefined,
  set: () => {},
  delete: () => {},
};

async function main(): Promise<void> {
  const args = parseRecorderArgs(process.argv.slice(2));
  if (args.kind === 'usage') {
    process.stderr.write(
      `grid-commander-record: ${args.problem}\n` +
        'usage: grid-commander-record [--coins BTC,ETH --interval 4h]\n' +
        'With no arguments, the account’s radar deployments are captured at their own timeframes.\n',
    );
    process.exit(1);
  }

  const built = app(NO_COOKIES);
  const user = await built.currentUser.execute();

  if (user.kind !== 'acting') {
    // Refusing beats recording an empty run: a capture with no authority
    // would fail every read and write ten explained gaps where the real
    // problem is one missing credential.
    process.stderr.write(
      'grid-commander-record cannot capture: no BattleGrid authority.\n' +
        'Set BATTLEGRID_API_KEY (a bg_live_ key) in this command’s environment.\n',
    );
    process.exit(1);
  }

  const result = await built.captureSignals.execute({
    userId: user.authority.userId,
    accessToken: user.authority.accessToken,
    named: args.named,
  });

  process.stdout.write(`${summariseCapture(result)}\n`);
  process.exit(exitCodeFor(result));
}

main().catch((err: unknown) => {
  process.stderr.write(
    `grid-commander-record failed: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
