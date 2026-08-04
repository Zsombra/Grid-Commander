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

**It calls read tools only.** A tool is called only when the server annotates it
`readOnlyHint`. Nothing here can create, change, archive or wager, and that is a
property of the code rather than of the operator's care: the write set is
filtered out before any request is built.

It runs in two passes. The first calls reads that require nothing. The second
harvests ids from those responses — an `agentId` from `list_intelligence_agents`,
a `strategyId` from `list_strategies` — and calls the reads whose requirements
they satisfy.

The second pass exists because the first reached 21 of 110 tools, leaving 89 that
could only be modelled from declared schemas. Every defect this product has found
came from an observed response contradicting a declaration, and fourteen of the
sixteen agent-internals tools had never been called by anything, purely because
they take an id the account plainly has.

Supplying arguments widens what can be **observed**. It does not widen what can
be **called**: the classification filter is unchanged and applies first.

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
CAPABILITIES = "docs/battlegrid-mcp-capabilities.json"

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


def server_identity(key: str) -> dict[str, str]:
    """Who answered, from `initialize`.

    Recorded rather than inferred. A missing name or version is written as the
    empty string and never as a plausible-looking default: the staleness guard
    compares this against a live server, and a fabricated version would make it
    pass while the record was unusable.
    """
    result = rpc(
        key,
        "initialize",
        {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "grid-commander-probe", "version": "1.0.0"},
        },
    ).get("result", {})
    info = result.get("serverInfo") or {}
    return {
        "name": str(info.get("name") or ""),
        "version": str(info.get("version") or ""),
        "protocol": str(result.get("protocolVersion") or ""),
    }


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
    root = tool.get("inputSchema") or {}
    found: dict[str, list[Any]] = {}

    def walk(node: Any, path: str, active: frozenset[str]) -> None:
        # Refs are followed — a constant behind a `$ref` was invisible to the
        # first version of this walk, the same blindness at one remove.
        node, active = _resolve(node, root, active)
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
            walk(child, f"{path}.{key}" if path else key, active)
        if isinstance(node.get("items"), dict):
            walk(node["items"], f"{path}[]", active)
        # A union contributes to the *same* path — see `brain.kind`, which is
        # `const: "PRESET"` on one branch and `const: "CUSTOM"` on the other.
        for branch in (node.get("anyOf") or []) + (node.get("oneOf") or []):
            walk(branch, path, active)

    walk(root, "", frozenset())
    return {k: v for k, v in sorted(found.items()) if k}


def _jump(root: Any, pointer: str) -> Any:
    """The node a local JSON pointer names, or None."""
    node = root
    for raw in pointer[2:].split("/"):
        part = raw.replace("~1", "/").replace("~0", "~")
        if isinstance(node, list):
            node = node[int(part)] if part.isdigit() and int(part) < len(node) else None
        elif isinstance(node, dict):
            node = node.get(part)
        else:
            return None
        if node is None:
            return None
    return node


def _resolve(node: Any, root: Any, active: frozenset[str]) -> tuple[Any, frozenset[str]]:
    """Follow a chain of local `$ref` pointers to the node they name.

    The dump carries 370 of these — zod's dedup output, every one a `#/`-rooted
    pointer into the same tool's schema. A walk that does not follow them
    records nothing where a ref stands; `apply_strategy_plan`'s `plan` subtree
    is reachable no other way.

    `active` is the set of pointers already being expanded on this walk path.
    Meeting one again means the schema recurses through itself; the branch ends
    there rather than looping. Returns the resolved node and the widened set.
    """
    seen = active
    while isinstance(node, dict) and isinstance(node.get("$ref"), str):
        pointer = node["$ref"]
        if not pointer.startswith("#/") or pointer in seen:
            return None, seen
        seen = seen | {pointer}
        node = _jump(root, pointer)
    return node, seen


def _required_paths(node: Any, root: Any, path: str, active: frozenset[str]) -> set[str]:
    """Every required parameter beneath `node`, as paths from `path`.

    A field required in only some branches of a union is *conditionally*
    required, so unions contribute the intersection of their branches here.
    Branch-specific requirements are carried per variant by `input_accepts`,
    where a check can hold a payload against the branch it actually uses.
    """
    node, active = _resolve(node, root, active)
    if not isinstance(node, dict):
        return set()
    out: set[str] = set()
    for name in node.get("required") or []:
        out.add(f"{path}.{name}" if path else name)
    for key, child in (node.get("properties") or {}).items():
        out |= _required_paths(child, root, f"{path}.{key}" if path else key, active)
    if isinstance(node.get("items"), dict):
        out |= _required_paths(node["items"], root, f"{path}[]", active)
    branches = (node.get("anyOf") or []) + (node.get("oneOf") or [])
    if branches:
        per_branch = [_required_paths(b, root, path, active) for b in branches]
        out |= set.intersection(*per_branch)
    return out


def input_required_paths(tool: dict[str, Any]) -> list[str]:
    """Every required parameter as a path from the argument root, at any depth.

    `input_required` stops at the top level, which checks that a slot is filled
    and never what fills it: a payload can satisfy every top-level requirement
    and omit a required field three levels down. Dotted paths, `[]` for array
    items — the grammar `input_constants` already uses.
    """
    root = tool.get("inputSchema") or {}
    return sorted(_required_paths(root, root, "", frozenset()))


def _discriminator(branch: dict[str, Any]) -> dict[str, Any]:
    """The const-pinned properties that tell one union branch from another."""
    return {
        key: prop["const"]
        for key, prop in (branch.get("properties") or {}).items()
        if isinstance(prop, dict) and "const" in prop
    }


def input_accepts(tool: dict[str, Any]) -> dict[str, Any]:
    """Per object path: what the schema will accept there, and whether it is closed.

    `additionalProperties: false` rejects the *whole* payload for one unaccepted
    key — which is exactly how `update_intelligence_agent` came to be
    impossible: `tradingConfig` reads back with 23 keys, the write accepts 20,
    and the object is closed. The record carried none of that, so nothing could
    say so before the platform did.

    A plain closed object records `{"closed": true, "accepts": [...]}`. A path
    declared as a union of object shapes records `{"variants": [...]}` instead,
    each variant keyed by the const-pinned properties that discriminate it
    (`operation=UPDATE`, `kind=PRESET`), with its own accepted set, closed flag,
    and required paths relative to that object — because merging branches either
    demands too much or accepts too little, and the branch a payload uses is
    knowable from the payload itself.

    The empty path is the argument root. Where two union branches record the
    same deeper path, the records merge conservatively: accepted names union,
    so a merged record can miss a violation but never invent one.
    """
    root = tool.get("inputSchema") or {}
    out: dict[str, Any] = {}

    def record_closed(path: str, accepts: Any) -> None:
        current = out.get(path)
        if current is None:
            out[path] = {"closed": True, "accepts": sorted(accepts)}
        elif "accepts" in current:
            current["accepts"] = sorted(set(current["accepts"]) | set(accepts))

    def walk(node: Any, path: str, active: frozenset[str]) -> None:
        node, active = _resolve(node, root, active)
        if not isinstance(node, dict):
            return

        resolved_branches: list[tuple[dict[str, Any], frozenset[str]]] = []
        for raw in (node.get("anyOf") or []) + (node.get("oneOf") or []):
            branch, branch_active = _resolve(raw, root, active)
            if isinstance(branch, dict):
                resolved_branches.append((branch, branch_active))

        object_branches = [(b, a) for b, a in resolved_branches if b.get("properties")]
        if len(object_branches) == 1:
            # One object shape among non-object alternatives — a nullable
            # object, typically. It IS the object at this path; a variant
            # record with nothing to discriminate against would hide it.
            lone, _ = object_branches[0]
            if lone.get("additionalProperties") is False:
                record_closed(path, (lone.get("properties") or {}).keys())
        if len(object_branches) >= 2 and path not in out:
            out[path] = {
                "variants": [
                    {
                        "when": _discriminator(branch),
                        "closed": branch.get("additionalProperties") is False,
                        "accepts": sorted((branch.get("properties") or {}).keys()),
                        "required": sorted(
                            _required_paths(branch, root, "", branch_active)
                        ),
                    }
                    for branch, branch_active in object_branches
                ]
            }
        elif node.get("additionalProperties") is False:
            record_closed(path, (node.get("properties") or {}).keys())

        for branch, branch_active in resolved_branches:
            for key, child in (branch.get("properties") or {}).items():
                walk(child, f"{path}.{key}" if path else key, branch_active)
            if isinstance(branch.get("items"), dict):
                walk(branch["items"], f"{path}[]", branch_active)

        for key, child in (node.get("properties") or {}).items():
            walk(child, f"{path}.{key}" if path else key, active)
        if isinstance(node.get("items"), dict):
            walk(node["items"], f"{path}[]", active)

    walk(root, "", frozenset())
    return {k: out[k] for k in sorted(out)}


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
    useful is which keys exist and what type each holds.

    The depth cap was 2, which is one level short of where the answers are. A
    paginated response nests `entries[] → {…}` before reaching a single field,
    so every per-entry type in `get_user_thought_log` recorded as `…` — the key
    names were captured and not one type was. A mapper written against that
    knows `confidenceScore` exists and has to guess whether it is a number or a
    string, which is the same guess that made `sizingStrategy` wrong.

    Six is enough for the deepest response observed and still cannot leak a
    value: only `type(...).__name__` is ever emitted for a leaf.
    """
    if depth > 6:
        return "…"
    if isinstance(value, dict):
        return {k: shape(v, depth + 1) for k, v in sorted(value.items())}
    if isinstance(value, list):
        return [shape(value[0], depth + 1), f"…×{len(value)}"] if value else []
    if value is None:
        return "null"
    return type(value).__name__


# Which response field answers which argument name. Written out rather than
# derived: `agentId` is answered by an agent's `id`, and guessing that pairing
# by string surgery is how an id lands in a parameter it does not belong to —
# the same reasoning as `BOUND_KEYS` in the agent mapper.
#
# Every row here was checked against a real response. The first version was
# written from assumption and three of five were wrong: `list_entry_decisions`
# returns `entries` rather than `decisions`, `list_signal_logs` returns
# `entries` rather than `logs`, and the argument is named `logId` rather than
# `signalLogId`. They yielded nothing and said nothing, which is the failure
# mode this whole file exists to remove — so `test_probe_id_sources.py` now
# fails if a row stops resolving against the artifact.
ID_SOURCES: dict[str, tuple[str, str]] = {
    # argument     (tool that returns it,        array field carrying `id`)
    "agentId":     ("list_intelligence_agents",  "agents"),
    "strategyId":  ("list_strategies",           "strategies"),
    "decisionId":  ("list_entry_decisions",      "entries"),
    "logId":       ("list_signal_logs",          "entries"),
    # `list_market_grid_sessions` is deliberately absent: its rows carry no
    # `id` at all, so a `sessionId` cannot be taken from them. Recorded here
    # rather than left as a silently empty lookup.
}


def harvest(observed: dict[str, Any]) -> dict[str, str]:
    """One id per argument name, from responses the probe already holds.

    The first element of each list, not a random one: a probe that picks
    differently on each run produces an artifact that appears to change when
    nothing did, and the point of the artifact is that a diff means something.
    """
    found: dict[str, str] = {}
    for argument, (tool, field) in ID_SOURCES.items():
        payload = observed.get(tool)
        if not isinstance(payload, dict):
            continue
        rows = payload.get(field)
        if not isinstance(rows, list) or not rows:
            continue
        first = rows[0]
        if isinstance(first, dict) and isinstance(first.get("id"), str):
            found[argument] = first["id"]
    return found


def arguments_for(required: list[str], ids: dict[str, str]) -> tuple[dict[str, Any] | None, str]:
    """The call's arguments, or the reason it cannot be made.

    Names the argument that could not be supplied rather than the whole list —
    "needs arguments: agentId, ticker" does not say which of the two the account
    lacks, and that is the fact worth recording.
    """
    args: dict[str, Any] = {}
    for name in required:
        if name not in ids:
            return None, f"no {name} available on this account"
        args[name] = ids[name]
    return args, ""


DECLARED_FIELDS = (
    "input_required",
    "input_optional",
    "input_constants",
    "input_required_paths",
    "input_accepts",
    "declared_output",
)


def refresh_declared(capabilities_path: str = CAPABILITIES, out_path: str = OUT) -> int:
    """Recompute the artifact's declared fields from the committed dump. No network.

    Both files come from the same `tools/list`; the declared fields are pure
    derivations of it, so refreshing them needs no credential and calls
    nothing. Everything observed — responses, shapes, failure reasons — is left
    exactly as it was: a refresh MUST NOT invent an observation, and a value it
    cannot derive it does not touch.

    Refuses when the two files disagree about which tools exist. That means
    they are snapshots of different deployments, and the honest fix is a live
    re-probe, not a merge of two generations of the truth.
    """
    with open(capabilities_path) as f:
        dump = {t["name"]: t for t in json.load(f)["tools"]}
    with open(out_path) as f:
        surface = json.load(f)

    artifact_names = {e["name"] for e in surface["tools"]}
    if artifact_names != set(dump):
        missing = sorted(artifact_names - set(dump))
        extra = sorted(set(dump) - artifact_names)
        print(
            "tool sets differ — these are snapshots of different deployments; "
            f"re-probe live instead. only in artifact: {missing or 'none'}; "
            f"only in capabilities dump: {extra or 'none'}",
            file=sys.stderr,
        )
        return 2

    for entry in surface["tools"]:
        tool = dump[entry["name"]]
        required = required_input(tool)
        computed = {
            "input_required": required,
            "input_optional": sorted(
                set((tool.get("inputSchema") or {}).get("properties", {}).keys())
                - set(required)
            ),
            "input_constants": input_constants(tool),
            "input_required_paths": input_required_paths(tool),
            "input_accepts": input_accepts(tool),
            "declared_output": declared_output_keys(tool),
        }
        # Rebuilt rather than updated in place, so the new fields land in the
        # same position a live probe writes them — a refresh and a probe must
        # not produce two orderings of the same artifact.
        rebuilt: dict[str, Any] = {}
        for key, value in entry.items():
            if key == "input_constants":
                for field in ("input_constants", "input_required_paths", "input_accepts"):
                    rebuilt[field] = computed[field]
            elif key in DECLARED_FIELDS:
                if key not in rebuilt:
                    rebuilt[key] = computed[key]
            else:
                rebuilt[key] = value
        entry.clear()
        entry.update(rebuilt)

    with open(out_path, "w") as f:
        json.dump(surface, f, indent=2, sort_keys=False)
        f.write("\n")
    print(f"refreshed declared fields for {len(surface['tools'])} tools in {out_path}")
    return 0


def main() -> int:
    if "--refresh-declared" in sys.argv[1:]:
        return refresh_declared()

    key = os.environ.get("BATTLEGRID_API_KEY")
    if not key:
        print("BATTLEGRID_API_KEY is not set.", file=sys.stderr)
        return 2

    # `initialize` is called for one reason: to learn which server answered.
    # The probe worked for its whole life without it, because `tools/list` needs
    # no handshake here — and that is exactly how a record with no version in it
    # came to gate every write this product makes. BattleGrid went v3.0.0 → v5.0.0
    # with the tool count unchanged at 110, and nothing could have noticed,
    # because nothing recorded which version it had looked at.
    server = server_identity(key)
    print(f"server {server['name']} {server['version']}")

    listing = rpc(key, "tools/list", {})
    tools = listing["result"]["tools"]
    print(f"discovered {len(tools)} tools")

    entries: list[dict[str, Any]] = []
    payloads: dict[str, Any] = {}
    called = skipped = failed = 0

    def attempt(entry: dict[str, Any], args: dict[str, Any], how: str) -> None:
        """Call one tool and record what came back. Never called for a non-read."""
        nonlocal called, failed
        name = entry["name"]
        try:
            response = rpc(key, "tools/call", {"name": name, "arguments": args})
            payload, error = unwrap(response.get("result", {}))
            if error is not None:
                entry["observed"] = None
                entry["call_failed"] = error[:300]
                entry["arguments_from"] = how
                failed += 1
                print(f"  fail {name}: {error[:70]}")
                return
            payloads[name] = payload
            entry["observed"] = sorted(payload.keys())
            entry["observed_shape"] = shape(payload)
            entry["arguments_from"] = how
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
            print(f"  ok   {name}{'' if how == 'none-required' else f'  [{how}]'}")
        except Exception as exc:  # noqa: BLE001 — the reason is the finding
            entry["observed"] = None
            entry["call_failed"] = str(exc)[:300]
            entry["arguments_from"] = how
            failed += 1
            print(f"  err  {name}: {exc}")

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
            "input_required_paths": input_required_paths(tool),
            "input_accepts": input_accepts(tool),
            "declared_output": declared_output_keys(tool),
        }
        entries.append(entry)

        # THE SAFETY RULE, and it does not move: only a read tool is ever
        # called. Supplying arguments widens what can be *observed*; it must
        # never widen what can be *called*. Filtered here, before any request is
        # built, rather than left to the care of whoever runs this.
        if kind != "read":
            entry["observed"] = None
            entry["not_called_because"] = f"classification is '{kind}' — this tool can change things"
            skipped += 1
            continue

        # Pass one: everything the schema says needs nothing.
        if required:
            continue
        attempt(entry, {}, "none-required")

    # Pass two: reads whose required arguments the first pass can answer.
    #
    # This existed because the probe reached 21 of 110 tools, so 89 could only
    # be modelled from declared schemas — and every defect this product has
    # found came from an observed response contradicting one. Fourteen of the
    # sixteen agent-internals tools had never been called by anything, purely
    # because they take an `agentId` the account plainly has.
    #
    # Repeated until it stops yielding, not run once. `list_entry_decisions`
    # itself needs an `agentId`, so the `decisionId` it returns cannot exist
    # until after a round that had one. A single pass leaves those tools
    # unreachable for no reason other than the order they were tried in.
    #
    # It terminates because every round either calls at least one tool that has
    # never been called, or stops.
    for round_no in range(1, 6):
        ids = harvest(payloads)
        print(f"round {round_no} · ids: {', '.join(sorted(ids)) if ids else 'none'}")

        progressed = False
        for entry in entries:
            if entry.get("observed") is not None or entry.get("call_failed"):
                continue
            if entry["classification"] != "read" or not entry["input_required"]:
                continue

            args, why = arguments_for(entry["input_required"], ids)
            if args is None:
                # Names the argument that could not be supplied, not the whole
                # list: "needs arguments: agentId, ticker" never said which of
                # the two the account lacked, and that is the fact worth having.
                # Overwritten each round — a later round may supply it.
                entry["not_called_because"] = why
                continue

            attempt(entry, args, "discovered:" + ",".join(sorted(args)))
            progressed = True

        if not progressed:
            break

    skipped += sum(
        1
        for e in entries
        if e["classification"] == "read" and e.get("observed") is None and not e.get("call_failed")
    )

    surface = {
        "source": MCP_URL,
        "server": server,
        "probed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
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
            "carrying it went unread for the life of the product. `server` is "
            "which BattleGrid answered: it is the only field that can tell you "
            "this record is stale. `tool_count` cannot — it stayed at 110 across "
            "v3.0.0 → v5.0.0 while enums, required arguments and semantics moved "
            "underneath it."
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
