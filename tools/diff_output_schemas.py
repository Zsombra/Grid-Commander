#!/usr/bin/env python3
"""Diff two BattleGrid capability records' OUTPUT schemas.

    python3 tools/diff_output_schemas.py <old.json> [new.json]
    git show fbe0aa2:docs/battlegrid-mcp-capabilities.json > /tmp/old.json
    python3 tools/diff_output_schemas.py /tmp/old.json

`new` defaults to `docs/battlegrid-mcp-capabilities.json`.

## Why this exists

#198: 188 output-schema leaves moved across 11 tools and nothing saw it,
because the artifact holding output schemas was itself a major version behind
and nothing compared it to anything. The lesson recorded at the time was
"outputs drift when inputs do not". The tool that would have caught it did not
exist, so at v19 the same thing happened again — 34 output schemas moved while
every input-facing check stayed green — and the survey that found it was
hand-rolled in a scratch directory (#301).

This is that survey, made repeatable. Run it after every re-probe.

## Two metrics, and the difference matters

`--nodes` counts **raw JSON nodes**: every terminal value in the schema text,
including `type`, `required` entries and `description` strings. It is the right
measure for *did the schema move* — it is sensitive to everything, so it cannot
miss a change.

The default counts **readable property paths**: what a consumer could actually
read, with union arms flattened and array items collapsed to `[]`. It is the
right measure for *is there anything new to read*, which is the question that
turns into work.

They diverge by roughly threefold. At v19.1.0 `preview_strategy_report` moved
+66 nodes and gained **+19 readable fields**; across the surface it was
34 schemas / raw-node vs 27 schemas / 57 added leaves / 18 removed. Sizing work
off the node count overestimates it badly, and reporting drift off the leaf
count would miss a schema that tightened `required` without adding a field.
Print both when you are recording a version bump.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

DEFAULT_NEW = Path("docs/battlegrid-mcp-capabilities.json")


def leaves(schema, prefix: str = "") -> set:
    """Every readable path in a JSON Schema, as dotted strings.

    Union arms contribute their leaves at the same path — a consumer must cope
    with either, so both are readable. Array items collapse to `[]` rather than
    an index, because a schema describes every element identically.
    """
    out: set = set()
    if not isinstance(schema, dict):
        return out

    for key in ("anyOf", "oneOf", "allOf"):
        for arm in schema.get(key, []) or []:
            out |= leaves(arm, prefix)

    if schema.get("type") == "array" or "items" in schema:
        item = schema.get("items")
        if isinstance(item, dict):
            out |= leaves(item, prefix + "[]")

    props = schema.get("properties")
    if isinstance(props, dict):
        for name, sub in props.items():
            path = f"{prefix}.{name}" if prefix else name
            out.add(path)
            out |= leaves(sub, path)
    return out


def nodes(value) -> int:
    """Terminal values in the raw JSON — the drift-sensitive metric."""
    if isinstance(value, dict):
        return sum(nodes(v) for v in value.values())
    if isinstance(value, list):
        return sum(nodes(v) for v in value)
    return 1


def outputs(record: dict) -> dict:
    return {
        t["name"]: (t.get("outputSchema") or {})
        for t in record.get("tools", [])
        if isinstance(t, dict) and t.get("name")
    }


def main(argv: list) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0

    show_nodes = "--nodes" in argv
    paths = [a for a in argv if not a.startswith("-")]
    old_path = Path(paths[0])
    new_path = Path(paths[1]) if len(paths) > 1 else DEFAULT_NEW

    old = json.loads(old_path.read_text(encoding="utf-8"))
    new = json.loads(new_path.read_text(encoding="utf-8"))
    print(f"{old['serverInfo']['version']} -> {new['serverInfo']['version']}")

    o, n = outputs(old), outputs(new)
    gained, lost = sorted(set(n) - set(o)), sorted(set(o) - set(n))
    print(f"tools: {len(o)} -> {len(n)}" + (f"; added {gained}" if gained else "") + (f"; removed {lost}" if lost else ""))

    if show_nodes:
        moved = [x for x in sorted(set(o) & set(n))
                 if json.dumps(o[x], sort_keys=True) != json.dumps(n[x], sort_keys=True)]
        print(f"\nraw-node metric: {len(moved)} output schemas differ")
        for name in sorted(moved, key=lambda x: nodes(o[x]) - nodes(n[x])):
            print(f"  {name:<44} {nodes(n[name]) - nodes(o[name]):+d}")

    rows = []
    for name in sorted(set(o) & set(n)):
        lo, ln = leaves(o[name]), leaves(n[name])
        if lo != ln:
            rows.append((len(ln - lo) - len(lo - ln), name, sorted(ln - lo), sorted(lo - ln)))
    rows.sort(key=lambda r: -r[0])

    added = sum(len(r[2]) for r in rows)
    removed = sum(len(r[3]) for r in rows)
    print(f"\nreadable-leaf metric: {len(rows)} output schemas changed, "
          f"{added} leaves added, {removed} removed\n")

    for delta, name, plus, minus in rows:
        print(f"=== {name}  ({delta:+d})")
        for p in plus:
            print(f"    + {p}")
        for m in minus:
            print(f"    - {m}")
        print()

    # A removed leaf with a reader is the only thing here that can already be
    # broken. Naming them is not the same as checking them — grep src/ for each.
    if removed:
        print("removed leaves have readers? grep src/ for each of:")
        for _, _, _, minus in rows:
            for m in minus:
                print(f"    {m.split('.')[-1]}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
