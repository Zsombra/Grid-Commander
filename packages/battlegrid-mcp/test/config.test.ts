/** Missing key must refuse before any network call. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "../src/transport.js";
import { MissingCredentialError } from "../src/errors.js";

test("resolveConfig throws MissingCredentialError when no key is present", () => {
  const saved = process.env["BG_API_KEY"];
  delete process.env["BG_API_KEY"];
  try {
    assert.throws(() => resolveConfig(), (err: unknown) => {
      return err instanceof MissingCredentialError && err.variable === "BG_API_KEY";
    });
  } finally {
    if (saved !== undefined) process.env["BG_API_KEY"] = saved;
  }
});

test("resolveConfig uses an explicit key and default endpoint", () => {
  const cfg = resolveConfig({ apiKey: "test-key" });
  assert.equal(cfg.apiKey, "test-key");
  assert.match(cfg.endpoint, /mcp\.battlegrid\.trade/);
});
