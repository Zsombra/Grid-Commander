/** Standalone health check — confirm a session is usable and read its identity. */
import { createObserveClient } from "./client.js";
import type { ConnectOptions } from "./transport.js";
import type { Health } from "./client.js";

/**
 * Connect with the lowest possible privilege (observe) and report reachability
 * plus the authenticated account. Useful as a preflight before any action.
 */
export async function checkHealth(opts: ConnectOptions = {}): Promise<Health> {
  const client = await createObserveClient(opts);
  try {
    return await client.health();
  } finally {
    await client.close();
  }
}
