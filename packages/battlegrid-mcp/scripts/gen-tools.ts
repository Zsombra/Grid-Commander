/**
 * Refresh the tool classification from a live `tools/list`.
 *
 * The server warns its tool surface changes between deploys. This script
 * connects, lists the current tools, and reports how they line up against the
 * committed classification in src/scopes.ts:
 *   - NEW tools not yet classified (currently fail safe as wager)
 *   - tools we classify that the server no longer advertises
 *
 * It is a reviewer's aid, not an automatic rewrite: MANAGE_TOOLS is a safety
 * judgment, so a human confirms where each new tool belongs. Run with a key in
 * the environment: `pnpm gen:tools`.
 */
import { connect } from "../src/transport.js";
import { KNOWN_TOOLS, classify } from "../src/scopes.js";

async function main(): Promise<void> {
  const conn = await connect();
  try {
    const { tools } = await conn.client.listTools();
    const live = new Set(tools.map((t) => t.name));

    const added = [...live].filter((n) => !KNOWN_TOOLS.has(n)).sort();
    const removed = [...KNOWN_TOOLS].filter((n) => !live.has(n)).sort();

    process.stdout.write(`Live tools: ${live.size}\n`);
    process.stdout.write(`Known tools: ${KNOWN_TOOLS.size}\n\n`);

    if (added.length) {
      process.stdout.write(
        `NEW — not yet classified (treated as wager until triaged):\n`,
      );
      for (const n of added) process.stdout.write(`  + ${n}\n`);
      process.stdout.write(
        `\nDecide observe/manage/wager for each, then update src/scopes.ts.\n`,
      );
    }
    if (removed.length) {
      process.stdout.write(`\nGONE — classified but no longer advertised:\n`);
      for (const n of removed) process.stdout.write(`  - ${n} (was ${classify(n)})\n`);
    }
    if (!added.length && !removed.length) {
      process.stdout.write(`In sync — no classification changes needed.\n`);
    }
  } finally {
    await conn.close();
  }
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
