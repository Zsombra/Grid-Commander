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


def _union_shapes(
    node: dict[str, Any], root: Any, active: frozenset[str]
) -> list[tuple[dict[str, Any], frozenset[str]]]:
    """Every shape a union at this node declares, with nested unions flattened.

    Unions arrive nested. `conditions[].definition` is an `anyOf` over *two*
    members — the group object, and a further `anyOf` which itself holds a third
    `anyOf` of the four clause forms plus the reference. A walk that reads only
    the outer level sees exactly one object shape, records it as though it were
    the whole grammar, and never reaches the other five: the record then said
    `conditions[].definition` accepts `kind/members/n/op` **and closed the set**,
    so a clause's `column` and a reference's `conditionKey` read as violations of
    a set the platform does not close.

    That is the record *inventing* a violation — the one direction
    `input_accepts` promises it never takes, and the damaging one, because a
    guard that fails against correct code gets disabled rather than fixed.

    A member carrying `properties` is a shape; a member carrying only more
    branches is a signpost, and this follows it. `_resolve`'s `active` set ends a
    branch that recurses through itself, so a union reachable from inside its own
    members — the group's `members[]` is a `$ref` back to `definition` — stops
    here exactly as it does everywhere else.
    """
    shapes: list[tuple[dict[str, Any], frozenset[str]]] = []
    for raw in (node.get("anyOf") or []) + (node.get("oneOf") or []):
        branch, branch_active = _resolve(raw, root, active)
        if not isinstance(branch, dict):
            continue
        if not branch.get("properties") and (branch.get("anyOf") or branch.get("oneOf")):
            shapes.extend(_union_shapes(branch, root, branch_active))
        else:
            shapes.append((branch, branch_active))
    return shapes


def _one_of_pinned(branch: dict[str, Any]) -> dict[str, list[Any]]:
    """The enum-pinned properties a branch *demands* — a discriminator's other half.

    A `const` is an enum of one. Reading one as a discriminator and the other as
    invisible is a distinction of how the schema is *spelled* rather than of what
    it *reaches*, and the four clause forms are where that costs something: three
    pin `op` with `const` (`between`, `is`, `in`) and the fourth pins it with
    `enum: [lt, lte, gte, gt]`. On consts alone the fourth discriminates on
    `kind: "clause"` and collides with the other three.

    Required-only, unlike `_discriminator`. A discriminator naming a property the
    branch does not demand cannot be answered by a payload that legitimately
    omits it, and an unmatchable variant reads as "no declared variant matches" —
    an invented violation of exactly the kind this walk exists to remove. Every
    const-pinned discriminator on the observed surface is already required, so
    the rule costs nothing there; it is stated here because here it is
    load-bearing.
    """
    required = set(branch.get("required") or [])
    return {
        key: list(prop["enum"])
        for key, prop in (branch.get("properties") or {}).items()
        if isinstance(prop, dict)
        and "const" not in prop
        and isinstance(prop.get("enum"), list)
        and prop["enum"]
        and key in required
    }


def _tellable_apart(a: dict[str, list[Any]], b: dict[str, list[Any]]) -> bool:
    """Whether some property pins these two discriminators to disjoint values.

    Both sides are `property -> the values it permits` (a const contributing one).
    They can be told apart only where they *both* pin a property and the two sets
    of permitted values do not meet: anywhere else a single payload satisfies
    both, and a reader picking the first match would check it against the wrong
    branch. Membership by `in` rather than by set intersection, because a const
    is any JSON value and need not be hashable.
    """
    for key in set(a) & set(b):
        if not any(value in b[key] for value in a[key]):
            return True
    return False


def _indistinguishable_groups(discriminators: list[dict[str, list[Any]]]) -> list[list[int]]:
    """Branch indices gathered into the sets a payload cannot choose between.

    Connected components, not first-fit: "tellable apart" is symmetric but not
    transitive — A may separate from C while both collide with B — and in that
    chain a reader still has no rule for picking, so all three belong together.
    Groups come back in declaration order, first member first, because the record
    is read by people diffing it against the schema.
    """
    parent = list(range(len(discriminators)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i in range(len(discriminators)):
        for j in range(i + 1, len(discriminators)):
            if not _tellable_apart(discriminators[i], discriminators[j]):
                parent[find(j)] = find(i)

    groups: dict[int, list[int]] = {}
    for i in range(len(discriminators)):
        groups.setdefault(find(i), []).append(i)
    return [groups[key] for key in sorted(groups, key=lambda k: groups[k][0])]


def _variants(
    object_branches: list[tuple[dict[str, Any], frozenset[str]]], root: Any
) -> list[dict[str, Any]]:
    """One record per branch a payload can actually be matched to.

    Three rules, in this order, and the order is the whole design.

    **Discriminate on consts.** What the record has always done, and what the
    great majority of unions need: `operation=UPDATE`, `kind=PRESET`.

    **Widen with enums only where consts collide.** The clause forms need it (see
    `_one_of_pinned`). Nothing else does, and widening a discriminator that
    already separates would make the record assert more than it needs to: the
    discriminator's job is to say which branch a payload belongs to, and checking
    that the payload's *values* are permitted is a different job, done by
    `input_constants` and its own test. A widened variant records
    `when_one_of: {"op": [...]}` beside `when`; a reader matches on both, `when`
    by equality and `when_one_of` by membership. Kept as a second key rather than
    folded into `when` as a list, because a `const` may itself be a list and a
    reader would have no way to tell "this value" from "one of these".

    **Merge what still cannot be told apart.** Two branches may differ only in
    which keys they *require* — `sections[].columns[].timeframe` is `{rel}` or
    `{abs}`, with nothing pinned on either — and no discriminator can be built
    from that. Recorded as one variant whose accepted sets union and whose
    required paths intersect, which is the merge rule `input_accepts` already
    applies where two paths meet: it can miss a violation, and it cannot invent
    one. The alternative — emitting both and letting a reader take the first
    match — is what made an `{abs}` timeframe read as a violation of a closed set
    containing only `rel`.
    """
    consts = [_discriminator(branch) for branch, _ in object_branches]
    one_of: list[dict[str, list[Any]]] = [{} for _ in object_branches]

    def permitted(index: int) -> dict[str, list[Any]]:
        merged: dict[str, list[Any]] = {key: [value] for key, value in consts[index].items()}
        merged.update(one_of[index])
        return merged

    groups = _indistinguishable_groups([permitted(i) for i in range(len(object_branches))])
    if any(len(group) > 1 for group in groups):
        for group in groups:
            if len(group) == 1:
                continue
            for index in group:
                branch, _ = object_branches[index]
                one_of[index] = {
                    key: values
                    for key, values in _one_of_pinned(branch).items()
                    if key not in consts[index]
                }
        # Widening only ever narrows what a discriminator matches, so a group can
        # break apart here and none can newly form.
        groups = _indistinguishable_groups([permitted(i) for i in range(len(object_branches))])

    records: list[dict[str, Any]] = []
    for group in groups:
        members = [object_branches[index] for index in group]
        required_per_branch = [
            _required_paths(branch, root, "", branch_active) for branch, branch_active in members
        ]
        accepts: set[str] = set()
        for branch, _ in members:
            accepts |= set((branch.get("properties") or {}).keys())

        first = group[0]
        if len(group) == 1:
            when = consts[first]
            widened = one_of[first]
        else:
            # What the whole group shares — the weakest constraint that still
            # matches every payload any member would have matched. A
            # `when_one_of` here would be one that failed to separate them, so it
            # could only make the merged variant unmatchable.
            when = {
                key: value
                for key, value in consts[first].items()
                if all(key in consts[index] and consts[index][key] == value for index in group)
            }
            widened = {}

        record: dict[str, Any] = {"when": when}
        if widened:
            record["when_one_of"] = {key: list(values) for key, values in sorted(widened.items())}
        record["closed"] = all(branch.get("additionalProperties") is False for branch, _ in members)
        record["accepts"] = sorted(accepts)
        record["required"] = sorted(set.intersection(*required_per_branch))
        records.append(record)
    return records


def input_accepts(tool: dict[str, Any]) -> dict[str, Any]:
    """Per object path: what the schema will accept there, and whether it is closed.

    `additionalProperties: false` rejects the *whole* payload for one unaccepted
    key — which is exactly how `update_intelligence_agent` came to be
    impossible: `tradingConfig` reads back with 23 keys, the write accepts 20,
    and the object is closed. The record carried none of that, so nothing could
    say so before the platform did.

    A plain closed object records `{"closed": true, "accepts": [...]}`. A path
    declared as a union of object shapes records `{"variants": [...]}` instead,
    each variant keyed by what discriminates it — the const-pinned properties in
    `when` (`operation=UPDATE`, `kind=PRESET`), and where consts alone cannot
    tell two branches apart, the enum-pinned ones in `when_one_of`
    (`op` ∈ `lt|lte|gte|gt`). Each carries its own accepted set, closed flag, and
    required paths relative to that object — because merging branches either
    demands too much or accepts too little, and the branch a payload uses is
    knowable from the payload itself. Where nothing at all can tell two branches
    apart they are recorded as one merged variant. `_variants` holds the rules
    and the reasoning.

    Unions are flattened before any of that: `_union_shapes` follows a branch
    that is itself a union, which is how `conditions[].definition` is declared
    and why the record used to describe one sixth of that grammar as though it
    were all of it.

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

        resolved_branches = _union_shapes(node, root, active)

        object_branches = [(b, a) for b, a in resolved_branches if b.get("properties")]
        if len(object_branches) == 1:
            # One object shape among non-object alternatives — a nullable
            # object, typically. It IS the object at this path; a variant
            # record with nothing to discriminate against would hide it.
            lone, _ = object_branches[0]
            if lone.get("additionalProperties") is False:
                record_closed(path, (lone.get("properties") or {}).keys())
        if len(object_branches) >= 2 and path not in out:
            out[path] = {"variants": _variants(object_branches, root)}
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
ID_SOURCES: dict[str, tuple[str, str, str]] = {
    # argument     (tool that returns it,        array field,   key on the row)
    "agentId":     ("list_intelligence_agents",  "agents",      "id"),
    "strategyId":  ("list_strategies",           "strategies",  "id"),
    "decisionId":  ("list_entry_decisions",      "entries",     "id"),
    "logId":       ("list_signal_logs",          "entries",     "id"),
    # Coins are named, not identified: `get_top_ranked_coins` returns rows of
    # `{ticker, rank, latestMetricValue}` and no id at all. Four tools take a
    # ticker under four different argument names, so each is listed rather than
    # derived — the same rule as everything else in this table.
    #
    # This row only became reachable when `arguments_for` learned to fill
    # `interval` and `metric` from the schema: the coin list was itself blocked
    # on two enums the artifact already held.
    "ticker":      ("get_top_ranked_coins",      "coins",       "ticker"),
    "coinTicker":  ("get_top_ranked_coins",      "coins",       "ticker"),
    # `list_market_grid_sessions` is deliberately absent: its rows carry no
    # `id` at all, so a `sessionId` cannot be taken from them. Recorded here
    # rather than left as a silently empty lookup.
}


# Arguments that take a list of what an id source yields one of.
#
# Written out rather than derived by stripping an "s": `coinTickers` and
# `tickers` both want one thing, and `sections` and `assumptions` — which also
# end in "s" — want objects no id source produces. String surgery would fill
# those with a ticker, which is the id-in-the-wrong-parameter defect `ID_SOURCES`
# is written out to avoid.
PLURAL_OF: dict[str, str] = {
    "tickers": "ticker",
    "coinTickers": "coinTicker",
}


# Arguments that are objects rather than ids or enums, and how to build one.
#
# A builder gets everything the probe has already read and returns a value, or
# `None` to decline. Written out per argument for the same reason `ID_SOURCES`
# is: a composite assembled by guessing is a request the platform refuses in a
# way that looks like the tool being broken.
#
# **Why this exists.** `preview_strategy_report` needs a `coinSelection`, so it
# could never be called, so it had no observed shape, so no conformance guard
# had anything to compare against — and v9 moved each rendered section's body
# from `{sectionKey, title, text}` to `{sectionKey, section: {…}}` without a
# single gate noticing. The preview page rendered five empty sections for days.
# A tool the probe cannot call is a tool whose shape can change in silence.
#
# Deliberately minimal values: two coins, not fifty. The artifact records a
# *shape*, and asking for more makes it depend on how busy the platform was.


def _first_constant(constants: dict[str, Any], path: str) -> Any:
    choices = constants.get(path)
    return choices[0] if isinstance(choices, list) and choices else None


def _sections_from_a_strategy(payloads: dict[str, Any], _c: dict[str, Any]) -> Any:
    """A real strategy's own sections — the only shape the platform accepts."""
    strategy = (payloads.get("get_strategy") or {}).get("strategy")
    sections = (strategy or {}).get("sections")
    if not isinstance(sections, list) or not sections:
        return None
    out = []
    for s in sections:
        if isinstance(s, dict) and isinstance(s.get("sectionKey"), str):
            out.append({"kind": s.get("kind", "platform"), "sectionKey": s["sectionKey"]})
    return out or None


COMPOSITES: dict[str, Any] = {
    # `{mode, limit}` — mode is an enum the schema declares; the limit is ours,
    # and small on purpose.
    "coinSelection": lambda p, c: (
        {"mode": _first_constant(c, "coinSelection.mode") or "ranked", "limit": 2}
    ),
    "sections": _sections_from_a_strategy,
    # Booleans and numbers the schema constrains but cannot supply.
    "regimeAutoDerive": lambda p, c: False,
    "gate": lambda p, c: 0.5,
    "signals": lambda p, c: [{"label": "probe", "score": 0.5, "allocation": 1}],
    # `column` is deliberately absent, and the attempt is worth recording.
    #
    # Two tries. `{metric: "OPEN"}` — the one obviously-required field — was
    # answered with four more required paths. Building from the tool's own
    # declared `input_required_paths` satisfied the schema and was then refused
    # on *grammar*:
    #
    #     spread operand 'OPEN' is not a legal relational operand for base
    #     'OPEN' — it must declare a numeric output in the base's OWN unit
    #
    # A legal column needs the report-table grammar, which is a domain this
    # product models deliberately (`docs/REPORT_TABLE_GRAMMAR.md`) and a probe
    # should not reimplement to fill an argument. Declining leaves a skip that
    # says "not asked"; guessing left a failure that reads as a broken tool.
    #
    # `request` is deliberately absent for the same reason. Its shape differs
    # per tool —
    # `compile_strategy_plan` wants a whole plan, `get_strategy_section_template`
    # wants a section descriptor — so one builder would have to guess which, and
    # the artifact would record a refusal that looks like a broken tool.
}


def harvest(observed: dict[str, Any]) -> dict[str, str]:
    """One id per argument name, from responses the probe already holds.

    The first element of each list, not a random one: a probe that picks
    differently on each run produces an artifact that appears to change when
    nothing did, and the point of the artifact is that a diff means something.
    """
    found: dict[str, str] = {}
    for argument, (tool, field, key) in ID_SOURCES.items():
        payload = observed.get(tool)
        if not isinstance(payload, dict):
            continue
        rows = payload.get(field)
        if not isinstance(rows, list) or not rows:
            continue
        first = rows[0]
        if isinstance(first, dict) and isinstance(first.get(key), str):
            found[argument] = first[key]
    return found


def arguments_for(
    required: list[str],
    ids: dict[str, str],
    constants: dict[str, Any] | None = None,
    payloads: dict[str, Any] | None = None,
) -> tuple[dict[str, Any] | None, str]:
    """The call's arguments, or the reason it cannot be made.

    `constants` are the tool's own declared enum values, used for arguments that
    are not ids. Passing none keeps the old id-only behaviour.

    Names the argument that could not be supplied rather than the whole list —
    "needs arguments: agentId, ticker" does not say which of the two the account
    lacks, and that is the fact worth recording.
    """
    constants = constants or {}
    args: dict[str, Any] = {}
    for name in required:
        if name in ids:
            args[name] = ids[name]
            continue
        # Not every required argument is an id to harvest. `interval`, `metric`,
        # `gameType`, `strategyTimeframe` and `sourceKey` are **enums the schema
        # already declares**, and the probe was reporting "no interval available
        # on this account" for a value sitting in its own artifact — which left
        # eleven read tools never once observed.
        #
        # First declared value, for the same reason `harvest` takes the first
        # row: a probe that picks differently each run produces an artifact that
        # appears to change when nothing did.
        choices = constants.get(name)
        if isinstance(choices, list) and choices:
            args[name] = choices[0]
            continue
        # A list of one, where the singular was harvested. `get_coin_market_context`
        # takes `tickers` and the coin list yields `ticker`; one row is enough to
        # observe a shape, and asking for more would make the artifact depend on
        # how many coins the platform happened to rank that day.
        singular = PLURAL_OF.get(name)
        if singular and singular in ids:
            args[name] = [ids[singular]]
            continue
        builder = COMPOSITES.get(name)
        if builder is not None:
            built = builder(payloads or {}, constants)
            if built is not None:
                args[name] = built
                continue
        return None, f"no {name} available on this account"
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
                # The platform often refuses by naming what it wanted, and for
                # an either/or it *has* to: `get_market_context` requires
                # "sessionId or primaryTimeframe", which no `required` list can
                # express — so both are optional, the probe sent neither, and
                # four tools were recorded as failures for years.
                #
                # One retry, and only with values the tool's own schema declares
                # for an argument the refusal named. Not a guess and not a loop:
                # if the second refusal names something else, that is the answer.
                retry = {
                    arg: choices[0]
                    for arg, choices in (entry.get("input_constants") or {}).items()
                    if arg not in args and isinstance(choices, list) and choices and arg in error
                }
                if retry:
                    print(f"  retry {name}: refusal named {', '.join(sorted(retry))}")
                    attempt(entry, {**args, **retry}, how + "+refusal-named:" + ",".join(sorted(retry)))
                    return
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

            args, why = arguments_for(
                entry["input_required"], ids, entry.get("input_constants"), payloads
            )
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
