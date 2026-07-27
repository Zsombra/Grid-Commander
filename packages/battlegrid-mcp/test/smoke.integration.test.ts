/**
 * Live smoke against the real server. OBSERVE-ONLY — never calls a wager tool.
 * Skipped automatically when BG_API_KEY is not set, so unit runs stay offline.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createObserveClient } from "../src/client.js";
import { CapabilityDeniedError } from "../src/errors.js";

const hasKey = !!process.env["BG_API_KEY"];

test("connects observe-only and reads account identity", { skip: !hasKey }, async () => {
  const client = await createObserveClient();
  try {
    const health = await client.health();
    assert.equal(health.reachable, true);
    assert.ok(health.account.username.length > 0);
  } finally {
    await client.close();
  }
});

test("observe client reads an observe tool", { skip: !hasKey }, async () => {
  const client = await createObserveClient();
  try {
    const res = await client.call("list_market_grid_sessions", { status: "PENDING" });
    assert.ok(Array.isArray(res.content));
  } finally {
    await client.close();
  }
});

test("observe client refuses a wager tool against the real server (no call made)", { skip: !hasKey }, async () => {
  const client = await createObserveClient();
  try {
    await assert.rejects(
      // @ts-expect-error — wager tool is intentionally not on the observe surface
      () => client.call("submit_market_grid", {}),
      (err: unknown) => err instanceof CapabilityDeniedError,
    );
  } finally {
    await client.close();
  }
});
