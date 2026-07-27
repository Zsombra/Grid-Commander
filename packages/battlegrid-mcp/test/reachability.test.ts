/**
 * The regression test for the CRITICAL finding: a consumer must not be able to
 * reach the raw, unguarded SDK client from a returned client instance. TS
 * `private` is erased at runtime, so this walks the ACTUAL object graph and
 * asserts no reachable property hands back something with callTool/request.
 *
 * Uses a stub connection (no network) via the exports-blocked _buildForTest seam.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { _buildForTest } from "../src/client.js";
import { CapabilityDeniedError } from "../src/errors.js";

// A stub that stands in for the raw SDK connection. If any of these ever
// becomes reachable off the client instance, the boundary is broken.
function stubConn() {
  let sawCallTool = false;
  const conn = {
    client: {
      callTool: async () => {
        sawCallTool = true;
        return { content: [{ type: "text", text: "{}" }] };
      },
      request: async () => {
        sawCallTool = true;
        return {};
      },
    },
    endpoint: "stub",
    close: async () => {},
  };
  return { conn, tripped: () => sawCallTool };
}

function reachableValues(root: unknown): unknown[] {
  const out: unknown[] = [];
  let obj: unknown = root;
  const seenProtos = new Set<unknown>();
  // own keys of the instance
  if (obj && typeof obj === "object") {
    for (const k of Reflect.ownKeys(obj)) {
      out.push((obj as Record<PropertyKey, unknown>)[k]);
    }
    // walk the prototype chain's own keys too
    let proto = Object.getPrototypeOf(obj);
    while (proto && proto !== Object.prototype && !seenProtos.has(proto)) {
      seenProtos.add(proto);
      for (const k of Reflect.ownKeys(proto)) {
        if (k === "constructor") continue;
        const desc = Object.getOwnPropertyDescriptor(proto, k);
        if (desc && "value" in desc) out.push(desc.value);
      }
      proto = Object.getPrototypeOf(proto);
    }
  }
  return out;
}

function hasDispatch(v: unknown): boolean {
  if (!v || (typeof v !== "object" && typeof v !== "function")) return false;
  const o = v as Record<string, unknown>;
  return typeof o["callTool"] === "function" || typeof o["request"] === "function";
}

test("the raw SDK client is NOT reachable from an observe client instance", () => {
  const { conn } = stubConn();
  const client = _buildForTest("observe", conn) as unknown as Record<string, unknown>;

  // No own property exposes the connection or a dispatchable client.
  assert.equal(client["conn"], undefined, "`conn` must not be an own property");
  for (const v of reachableValues(client)) {
    assert.ok(!hasDispatch(v), "no reachable value may expose callTool/request");
    // one level deeper: a reachable object must not itself hold a dispatcher
    if (v && typeof v === "object") {
      for (const inner of Object.values(v as Record<string, unknown>)) {
        assert.ok(!hasDispatch(inner), "no reachable object may nest a dispatcher");
      }
    }
  }
});

test("even with the stub, an observe client refuses a wager tool via .call()", async () => {
  const { conn, tripped } = stubConn();
  const client = _buildForTest("observe", conn) as unknown as {
    call: (n: string) => Promise<unknown>;
  };
  await assert.rejects(
    () => client.call("submit_market_grid"),
    (err: unknown) => err instanceof CapabilityDeniedError,
  );
  assert.equal(tripped(), false, "the stub client must never have been dispatched to");
});
