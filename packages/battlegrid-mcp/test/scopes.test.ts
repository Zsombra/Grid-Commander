/** Classification correctness and the fail-safe default. */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classify,
  isKnownTool,
  KNOWN_TOOLS,
  WAGER_TOOLS,
  MANAGE_TOOLS,
  OBSERVE_TOOLS,
} from "../src/scopes.js";

test("every tool has exactly one tier and the sets are disjoint", () => {
  const wager = new Set<string>(WAGER_TOOLS);
  const manage = new Set<string>(MANAGE_TOOLS);
  const observe = new Set<string>(OBSERVE_TOOLS);
  for (const n of WAGER_TOOLS) {
    assert.ok(!manage.has(n) && !observe.has(n), `${n} in multiple tiers`);
  }
  for (const n of MANAGE_TOOLS) assert.ok(!observe.has(n), `${n} in multiple tiers`);
  assert.equal(KNOWN_TOOLS.size, wager.size + manage.size + observe.size);
});

test("classify returns the right tier for known tools", () => {
  assert.equal(classify("get_account_state"), "observe");
  assert.equal(classify("create_intelligence_agent"), "manage");
  assert.equal(classify("submit_market_grid"), "wager");
});

test("an unknown tool classifies as wager (fail safe)", () => {
  assert.equal(classify("no_such_tool"), "wager");
  assert.equal(isKnownTool("no_such_tool"), false);
});

test("the full surface is 110 tools", () => {
  assert.equal(KNOWN_TOOLS.size, 110);
});
