/**
 * THE money-safety test. Proves, exhaustively and without any network, that a
 * client cannot dispatch a tool above its granted tier. If this passes, an
 * observe- or manage-tier consumer physically cannot place a wager.
 *
 * assertAllowed is the exact precondition the live client runs before every
 * callTool, so a pass here is a pass for the real dispatch path.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertAllowed } from "../src/guard.js";
import { CapabilityDeniedError } from "../src/errors.js";
import { WAGER_TOOLS, MANAGE_TOOLS, OBSERVE_TOOLS } from "../src/scopes.js";

function denied(name: string, grant: "observe" | "manage" | "wager"): boolean {
  try {
    assertAllowed(name, grant);
    return false;
  } catch (err) {
    return err instanceof CapabilityDeniedError;
  }
}

test("observe client refuses every one of the 16 wager tools", () => {
  assert.equal(WAGER_TOOLS.length, 16, "expected exactly 16 wager tools");
  for (const tool of WAGER_TOOLS) {
    assert.ok(denied(tool, "observe"), `observe must refuse wager tool ${tool}`);
  }
});

test("observe client refuses every manage tool", () => {
  for (const tool of MANAGE_TOOLS) {
    assert.ok(denied(tool, "observe"), `observe must refuse manage tool ${tool}`);
  }
});

test("manage client refuses every wager tool but allows manage + observe", () => {
  for (const tool of WAGER_TOOLS) {
    assert.ok(denied(tool, "manage"), `manage must refuse wager tool ${tool}`);
  }
  for (const tool of MANAGE_TOOLS) {
    assert.ok(!denied(tool, "manage"), `manage must allow manage tool ${tool}`);
  }
  for (const tool of OBSERVE_TOOLS) {
    assert.ok(!denied(tool, "manage"), `manage must allow observe tool ${tool}`);
  }
});

test("observe client allows every observe tool", () => {
  for (const tool of OBSERVE_TOOLS) {
    assert.ok(!denied(tool, "observe"), `observe must allow observe tool ${tool}`);
  }
});

test("wager client allows every classified tool", () => {
  for (const tool of [...OBSERVE_TOOLS, ...MANAGE_TOOLS, ...WAGER_TOOLS]) {
    assert.ok(!denied(tool, "wager"), `wager must allow ${tool}`);
  }
});

test("an unknown tool is refused by observe and manage (fail safe)", () => {
  assert.ok(denied("totally_made_up_tool", "observe"));
  assert.ok(denied("totally_made_up_tool", "manage"));
});

test("the error names the tool as a wager tool for a real wager call", () => {
  try {
    assertAllowed("close_agent_position", "observe");
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof CapabilityDeniedError);
    assert.equal(err.requiredTier, "wager");
    assert.equal(err.grantedTier, "observe");
    assert.equal(err.unknownTool, false);
  }
});
