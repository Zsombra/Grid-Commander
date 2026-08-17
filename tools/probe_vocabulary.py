#!/usr/bin/env python3
"""Record the strategy vocabulary's *values* — the carve-out from shape-only.

`tools/probe_mcp_surface.py` records response shapes, deliberately: the
account's real data does not belong in a committed artifact. For
`list_strategy_vocabulary` that rule loses the thing that matters. The
vocabulary payload *is* the authoring contract, and it is almost entirely
values — condition budgets, enabled timeframes, transform ids, per-metric
legal transforms. A record that reduces `strategyConditions: 16` to `"int"`
records that a budget exists while losing what it permits, and anything
composed against the reduced record can over-commit fourfold without any
gate noticing (#92).

The carve-out's condition is what makes it safe: the vocabulary is
platform-owned and account-independent. Nothing in it is anyone's private
data, holdings, agents, or identity. This tool calls exactly two tools —
`list_strategy_categories` and `list_strategy_vocabulary` — both annotated
read-only by the server, and records their answers verbatim.

Categories are taken from the platform's own answer at run time, never from
a remembered list; the schema's pinned enum for `category` is recorded
beside them so a divergence between the two is visible in the artifact.

Usage:
    BATTLEGRID_API_KEY=bg_live_... python3 tools/probe_vocabulary.py

The key is read from the environment and never written to any output.
Compared against the live platform by `tests/live/surface-freshness.test.ts`.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from typing import Any

MCP_URL = "https://mcp.battlegrid.trade/mcp"
OUT = "docs/battlegrid-vocabulary.json"
SURFACE = "docs/battlegrid-mcp-surface.json"
ATTEMPTS = 4
TIMEOUT_S = 90


def rpc(key: str, method: str, params: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    last: Exception | None = None
    for attempt in range(ATTEMPTS):
        try:
            req = urllib.request.Request(
                MCP_URL,
                data=body,
                headers={
                    "authorization": f"Bearer {key}",
                    "content-type": "application/json",
                    "accept": "application/json, text/event-stream",
                },
            )
            with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
                raw = resp.read().decode()
            if raw.startswith("event:"):
                frame = next(l for l in raw.split("\n") if l.startswith("data: "))
                raw = frame[len("data: ") :]
            return json.loads(raw)
        except Exception as exc:  # noqa: BLE001 — retried, then reported
            last = exc
            if attempt + 1 < ATTEMPTS:
                time.sleep(2**attempt)
    raise RuntimeError(f"{method} failed after {ATTEMPTS} attempts: {last}")


def call_tool(key: str, name: str, arguments: dict[str, Any]) -> Any:
    """One tools/call, unwrapped to its payload. Raises on a tool error."""
    result = rpc(key, "tools/call", {"name": name, "arguments": arguments})["result"]
    if "structuredContent" in result:
        return result["structuredContent"]
    text = next(
        (b.get("text") for b in result.get("content", []) if b.get("type") == "text"), None
    )
    if result.get("isError"):
        raise RuntimeError(f"{name} answered an error: {str(text)[:200]}")
    if text is None:
        raise RuntimeError(f"{name} answered no payload")
    return json.loads(text)


def declared_categories() -> list[str]:
    """The `category` enum as the recorded surface pins it — for the
    divergence check, not as the list to iterate."""
    with open(SURFACE) as f:
        surface = json.load(f)
    for tool in surface.get("tools", []):
        if tool.get("name") == "list_strategy_vocabulary":
            values = (tool.get("input_constants") or {}).get("category") or []
            return [v for v in values if isinstance(v, str)]
    return []


def main() -> int:
    key = os.environ.get("BATTLEGRID_API_KEY")
    if not key:
        print("BATTLEGRID_API_KEY is not set.", file=sys.stderr)
        return 2

    init = rpc(
        key,
        "initialize",
        {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "grid-commander-vocabulary", "version": "1.0.0"},
        },
    )
    server = init["result"]["serverInfo"]
    print(f"server {server.get('name')} {server.get('version')}")

    categories_payload = call_tool(key, "list_strategy_categories", {})
    categories = [
        c["category"] if isinstance(c, dict) and "category" in c else c
        for c in categories_payload.get("categories", [])
    ]
    categories = [c for c in categories if isinstance(c, str)]
    if not categories:
        print("list_strategy_categories answered no categories — refusing to record.", file=sys.stderr)
        return 1
    print(f"categories: {', '.join(categories)}")

    vocabulary: dict[str, Any] = {}
    for category in categories:
        vocabulary[category] = call_tool(key, "list_strategy_vocabulary", {"category": category})
        print(f"  ok   {category}")

    artifact = {
        "source": MCP_URL,
        "server": {"name": server.get("name"), "version": server.get("version")},
        "probed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "note": (
            "The vocabulary payloads verbatim — values, not shapes. This is the "
            "stated carve-out from the shape-only rule: the vocabulary is "
            "platform-owned and account-independent, so nothing in it is "
            "anyone's private data. `categories_declared` is the schema's own "
            "enum for the `category` argument at probe time; `vocabulary` is "
            "keyed by what `list_strategy_categories` actually answered, so a "
            "divergence between the two is visible here rather than hidden. "
            "Compared against the live platform by "
            "tests/live/surface-freshness.test.ts; regenerate with "
            "BATTLEGRID_API_KEY=… python3 tools/probe_vocabulary.py"
        ),
        "categories_declared": declared_categories(),
        "categories_answered": categories,
        "vocabulary": vocabulary,
    }

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(artifact, f, indent=2, sort_keys=False)
        f.write("\n")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
