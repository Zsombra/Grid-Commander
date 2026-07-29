#!/usr/bin/env python3
"""Probe the live BattleGrid MCP surface and record what it actually answers.

The reference this sits beside was generated from `tools/list` alone: names,
descriptions, input schemas. That is what a server *declares*. It is not what a
server *returns*, and the difference is not academic — every read in this
product returned an empty object for its entire life, because `tools/call`
answers inside an MCP envelope that `tools/list` never mentions. The payload
field names in the reference were all correct. Nobody had looked at a response.

So this tool records four things per tool, and keeps them apart:

  declared   — inputSchema and outputSchema, from `tools/list`
  constants  — every enum and const in the input schema, at any depth
  observed   — the top-level shape of a real response, from `tools/call`
  divergence — declared output keys that did not appear, and vice versa

`constants` was added after the first version of this file recorded field
*names* and nothing else. That omission is why `create_intelligence_agent` could
never succeed for the life of the product: the conformance check could see that
a `brain` was sent, and could not see that it said `kind: 'preset'` where the
schema says `const: "PRESET"`. A name-only record checks that a slot is filled,
never that what fills it would be accepted.

**It calls read tools only.** A tool is called only when `readOnlyHint` is true
*and* its input schema has no required arguments. Nothing here can create,
change, archive or wager, and that is a property of the code rather than of the
operator's care: the write set is filtered out before any request is built.

Usage:
    BATTLEGRID_API_KEY=bg_live_... python3 tools/probe_mcp_surface.py

The key is read from the environment and never written to any output.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from typing import Any

MCP_URL = "https://mcp.battlegrid.trade/mcp"
OUT = "docs/battlegrid-mcp-surface.json"

# One run makes 30+ sequential requests to a live server, and a single timeout
# used to abandon the whole probe — including `tools/list`, which every other
# step depends on. Retried rather than lengthened: the failure observed was a
# read that never returned, which a longer wait does not fix.
ATTEMPTS = 4
TIMEOUT_S = 90


def rpc(key: str, method: str, params: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    last: Exception | None = None
    for attempt in range(ATTEMPTS):
        req = urllib.request.Request(
            MCP_URL,
            data=body,
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                return parse(resp.read())
        except (TimeoutError, OSError) as exc:
            last = exc
            if attempt < ATTEMPTS - 1:
                print(f"    retry {attempt + 1}/{ATTEMPTS - 1} after {exc}", file=sys.stderr)
                time.sleep(2**attempt)
    raise last if last else RuntimeError("unreachable")


def parse(raw: bytes) -> dict[str, Any]:
    """JSON, whether the server answered plainly or as an SSE frame.

    The `Accept` header offers both, and the server chooses. A frame looks like
    `event: message\\ndata: {…}` — feeding that to `json.loads` fails on the
    first character.
    """
    text = raw.decode()
    if text.startswith("event:"):
        for line in text.splitlines():
            if line.startswith("data: "):
                text = line[len("data: ") :]
                break
    return json.loads(text)


def classify(tool: dict[str, Any]) -> str:
    """What the server says this tool does. Never inferred from the name."""
    ann = tool.get("annotations") or {}
    if ann.get("readOnlyHint"):
        return "read"
    if ann.get("destructiveHint"):
        return "destructive"
    if ann.get("readOnlyHint") is False:
        return "write"
    # Unannotated is treated as dangerous, exactly as the product does.
    return "unclassified"


def declared_output_keys(tool: dict[str, Any]) -> list[str]:
    return sorted((tool.get("outputSchema") or {}).get("properties", {}).keys())


def required_input(tool: dict[str, Any]) -> list[str]:
    return sorted((tool.get("inputSchema") or {}).get("required", []) or [])


def input_constants(tool: dict[str, Any]) -> dict[str, list[Any]]:
    """Every value the input schema will accept, wherever it is pinned down.

    Field *names* were all this recorded before, at the top level only. That is
    why `create_intelligence_agent` could never succeed and nothing said so: the
    conformance check could see that the product sends a `brain`, and could not
    see that the `brain` it sends says `kind: 'preset'` where the schema says
    `const: "PRESET"`. Same for `sizingStrategy: 'FIXED'` against an enum of
    `MANUAL | VOLATILITY_AUTO`.

    Keyed by dotted path so a nested value is checkable — the two defects were
    three and two levels down respectively, which is exactly where a top-level
    scan stops looking. `anyOf` branches are merged: a discriminated union
    yields every discriminator the schema permits across its branches.

    Permitted values only. Nothing here comes from the account.
    """
    found: dict[str, list[Any]] = {}

    def walk(node: Any, path: str) -> None:
        if not isinstance(node, dict):
            return
        if "enum" in node and isinstance(node["enum"], list):
            found.setdefault(path, [])
            for v in node["enum"]:
                if v not in found[path]:
                    found[path].append(v)
        if "const" in node:
            found.setdefault(path, [])
            if node["const"] not in found[path]:
                found[path].append(node["const"])
        for key, child in (node.get("properties") or {}).items():
            walk(child, f"{path}.{key}" if path else key)
        if isinstance(node.get("items"), dict):
            walk(node["items"], f"{path}[]")
        # A union contributes to the *same* path — see `brain.kind`, which is
        # `const: "PRESET"` on one branch and `const: "CUSTOM"` on the other.
        for branch in (node.get("anyOf") or []) + (node.get("oneOf") or []):
            walk(branch, path)

    walk(tool.get("inputSchema") or {}, "")
    return {k: v for k, v in sorted(found.items()) if k}


def unwrap(result: dict[str, Any]) -> tuple[Any, str | None]:
    """The payload, out of the MCP envelope — the seam the product was missing.

    Returns (payload, error). Mirrors `payloadOf` in mcp-adapter.ts deliberately:
    if this and the product ever disagree about what an envelope means, the
    conformance check should be the thing that notices.
    """
    if result.get("isError") is True:
        blocks = [b.get("text", "") for b in result.get("content", []) if b.get("type") == "text"]
        return None, "".join(blocks) or "tool reported an error"

    structured = result.get("structuredContent")
    if isinstance(structured, dict):
        return structured, None

    blocks = [b.get("text", "") for b in result.get("content", []) if b.get("type") == "text"]
    if blocks:
        try:
            parsed = json.loads("".join(blocks))
            if isinstance(parsed, dict):
                return parsed, None
        except json.JSONDecodeError:
            pass
    return None, "no readable payload in the envelope"


def shape(value: Any, depth: int = 0) -> Any:
    """A response's shape, without its contents.

    The account's real data does not belong in a committed artifact. What is
    useful is which keys exist and what type each holds, one level into arrays.
    """
    if depth > 2:
        return "…"
    if isinstance(value, dict):
        return {k: shape(v, depth + 1) for k, v in sorted(value.items())}
    if isinstance(value, list):
        return [shape(value[0], depth + 1), f"…×{len(value)}"] if value else []
    if value is None:
        return "null"
    return type(value).__name__


def main() -> int:
    key = os.environ.get("BATTLEGRID_API_KEY")
    if not key:
        print("BATTLEGRID_API_KEY is not set.", file=sys.stderr)
        return 2

    listing = rpc(key, "tools/list", {})
    tools = listing["result"]["tools"]
    print(f"discovered {len(tools)} tools")

    entries = []
    called = skipped = failed = 0

    for tool in sorted(tools, key=lambda t: t["name"]):
        name = tool["name"]
        kind = classify(tool)
        required = required_input(tool)

        entry: dict[str, Any] = {
            "name": name,
            "classification": kind,
            "annotations": tool.get("annotations") or {},
            "description": (tool.get("description") or "").strip().split("\n")[0][:200],
            "input_required": required,
            "input_optional": sorted(
                set((tool.get("inputSchema") or {}).get("properties", {}).keys()) - set(required)
            ),
            "input_constants": input_constants(tool),
            "declared_output": declared_output_keys(tool),
        }

        # The safety rule, enforced in code rather than by discipline: only a
        # read tool with nothing required is ever called.
        if kind != "read":
            entry["observed"] = None
            entry["not_called_because"] = f"classification is '{kind}' — this tool can change things"
            skipped += 1
        elif required:
            entry["observed"] = None
            entry["not_called_because"] = f"needs arguments: {', '.join(required)}"
            skipped += 1
        else:
            try:
                response = rpc(key, "tools/call", {"name": name, "arguments": {}})
                payload, error = unwrap(response.get("result", {}))
                if error is not None:
                    entry["observed"] = None
                    entry["call_failed"] = error[:300]
                    failed += 1
                else:
                    entry["observed"] = sorted(payload.keys())
                    entry["observed_shape"] = shape(payload)
                    entry["envelope"] = {
                        "had_structured_content": "structuredContent" in response.get("result", {}),
                        "had_text_block": any(
                            b.get("type") == "text"
                            for b in response.get("result", {}).get("content", [])
                        ),
                    }
                    declared = set(entry["declared_output"])
                    seen = set(entry["observed"])
                    entry["declared_not_returned"] = sorted(declared - seen)
                    entry["returned_not_declared"] = sorted(seen - declared)
                    called += 1
                print(f"  {'ok  ' if entry['observed'] else 'fail'} {name}")
            except Exception as exc:  # noqa: BLE001 — the reason is the finding
                entry["observed"] = None
                entry["call_failed"] = str(exc)[:300]
                failed += 1
                print(f"  err  {name}: {exc}")

        entries.append(entry)

    surface = {
        "source": MCP_URL,
        "tool_count": len(tools),
        "by_classification": {
            k: sum(1 for e in entries if e["classification"] == k)
            for k in ("read", "write", "destructive", "unclassified")
        },
        "probed": {"called": called, "skipped": skipped, "failed": failed},
        "note": (
            "`observed` is what a live call returned. `declared_output` is what the "
            "server's outputSchema promises. They are recorded separately on purpose: "
            "a shape nobody has seen is not a shape that is known, and the whole reason "
            "this file exists is that a declared payload was correct while the envelope "
            "carrying it went unread for the life of the product."
        ),
        "tools": entries,
    }

    with open(OUT, "w") as f:
        json.dump(surface, f, indent=2, sort_keys=False)
        f.write("\n")

    print(f"\ncalled {called} · skipped {skipped} · failed {failed}")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
