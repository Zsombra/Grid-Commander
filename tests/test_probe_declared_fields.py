"""The probe's declared-field derivations, pinned on schemas built to bite.

`input_required_paths` and `input_accepts` exist because the record used to
stop at the top level: a payload could satisfy every top-level requirement and
omit a required field three levels down, and an object closed to twenty keys
rejects a whole payload for one unaccepted twenty-first. Both happened. These
tests pin the derivations on constructed schemas — nested required, closed and
open objects, union variants, arrays, `$ref` chains, and a schema that recurses
through itself — and pin the refresh mode's two promises: observed data is
never touched, and mismatched tool sets are refused rather than merged.
"""

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from probe_mcp_surface import (  # noqa: E402
    input_accepts,
    input_constants,
    input_required_paths,
    refresh_declared,
)


def tool(schema):
    return {"inputSchema": schema}


class RequiredPaths(unittest.TestCase):
    def test_top_level_and_nested_required_are_both_paths(self):
        schema = {
            "type": "object",
            "required": ["agentId"],
            "properties": {
                "agentId": {"type": "string"},
                "config": {
                    "type": "object",
                    "required": ["mode"],
                    "properties": {
                        "mode": {"type": "string"},
                        "limits": {
                            "type": "object",
                            "required": ["daily"],
                            "properties": {"daily": {"type": "number"}},
                        },
                    },
                },
            },
        }
        assert input_required_paths(tool(schema)) == [
            "agentId",
            "config.limits.daily",
            "config.mode",
        ]

    def test_array_items_use_the_bracket_grammar(self):
        schema = {
            "type": "object",
            "properties": {
                "rules": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["allocation"],
                        "properties": {"allocation": {"type": "number"}},
                    },
                }
            },
        }
        assert input_required_paths(tool(schema)) == ["rules[].allocation"]

    def test_union_contributes_only_what_every_branch_requires(self):
        # `brain`: PRESET requires kind+preset, CUSTOM requires kind+modelId.
        # Only `kind` is unconditionally required; the rest is per-variant.
        schema = {
            "type": "object",
            "properties": {
                "brain": {
                    "anyOf": [
                        {
                            "type": "object",
                            "required": ["kind", "preset"],
                            "properties": {
                                "kind": {"const": "PRESET"},
                                "preset": {"type": "string"},
                            },
                        },
                        {
                            "type": "object",
                            "required": ["kind", "modelId"],
                            "properties": {
                                "kind": {"const": "CUSTOM"},
                                "modelId": {"type": "string"},
                            },
                        },
                    ]
                }
            },
        }
        assert input_required_paths(tool(schema)) == ["brain.kind"]


class Accepts(unittest.TestCase):
    def test_closed_object_records_its_accepted_set(self):
        schema = {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "config": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {"b": {}, "a": {}},
                }
            },
        }
        accepts = input_accepts(tool(schema))
        assert accepts[""] == {"closed": True, "accepts": ["config"]}
        assert accepts["config"] == {"closed": True, "accepts": ["a", "b"]}

    def test_open_object_is_absent(self):
        schema = {
            "type": "object",
            "properties": {"free": {"type": "object", "properties": {"x": {}}}},
        }
        assert input_accepts(tool(schema)) == {}

    def test_union_records_variants_keyed_by_their_consts(self):
        schema = {
            "type": "object",
            "properties": {
                "request": {
                    "anyOf": [
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["operation", "name"],
                            "properties": {
                                "operation": {"const": "CREATE"},
                                "name": {"type": "string"},
                            },
                        },
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["operation", "strategyId"],
                            "properties": {
                                "operation": {"const": "UPDATE"},
                                "strategyId": {"type": "string"},
                                "sub": {
                                    "type": "object",
                                    "required": ["deep"],
                                    "properties": {"deep": {}},
                                },
                            },
                        },
                    ]
                }
            },
        }
        entry = input_accepts(tool(schema))["request"]
        whens = [v["when"] for v in entry["variants"]]
        assert whens == [{"operation": "CREATE"}, {"operation": "UPDATE"}]
        update = entry["variants"][1]
        assert update["closed"] is True
        assert update["accepts"] == ["operation", "strategyId", "sub"]
        # A variant carries its own required paths, nested included — the
        # branch-conditional half that input_required_paths deliberately omits.
        assert update["required"] == ["operation", "strategyId", "sub.deep"]

    def test_closed_object_inside_a_union_branch_is_still_recorded(self):
        schema = {
            "type": "object",
            "properties": {
                "request": {
                    "anyOf": [
                        {
                            "type": "object",
                            "properties": {
                                "inner": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "properties": {"only": {}},
                                }
                            },
                        },
                        {"type": "string"},
                    ]
                }
            },
        }
        # One object branch → no variants; the branch's subtree is walked.
        accepts = input_accepts(tool(schema))
        assert accepts["request.inner"] == {"closed": True, "accepts": ["only"]}


class Refs(unittest.TestCase):
    def test_a_constant_behind_a_ref_is_found(self):
        # The dedup pattern the dump actually uses: first occurrence inline,
        # later occurrences point at it.
        schema = {
            "type": "object",
            "properties": {
                "first": {"enum": ["A", "B"]},
                "second": {"$ref": "#/properties/first"},
            },
        }
        constants = input_constants(tool(schema))
        assert constants["second"] == ["A", "B"]

    def test_required_and_accepts_follow_refs(self):
        schema = {
            "type": "object",
            "properties": {
                "original": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["x"],
                    "properties": {"x": {}},
                },
                "alias": {"$ref": "#/properties/original"},
            },
        }
        assert "alias.x" in input_required_paths(tool(schema))
        assert input_accepts(tool(schema))["alias"] == {"closed": True, "accepts": ["x"]}

    def test_a_recursive_schema_terminates(self):
        # A condition-tree shape: the group refs its own definition. The walk
        # must record the first level and stop, not loop.
        schema = {
            "type": "object",
            "properties": {
                "definition": {
                    "type": "object",
                    "required": ["kind"],
                    "properties": {
                        "kind": {"enum": ["clause", "group"]},
                        "children": {
                            "type": "array",
                            "items": {"$ref": "#/properties/definition"},
                        },
                    },
                }
            },
        }
        required = input_required_paths(tool(schema))
        assert "definition.kind" in required
        constants = input_constants(tool(schema))
        assert constants["definition.kind"] == ["clause", "group"]

    def test_a_ref_cycle_between_two_nodes_terminates(self):
        schema = {
            "type": "object",
            "properties": {
                "a": {"$ref": "#/properties/b"},
                "b": {"$ref": "#/properties/a"},
            },
        }
        assert input_required_paths(tool(schema)) == []
        assert input_accepts(tool(schema)) == {}


class RefreshDeclared(unittest.TestCase):
    def _write(self, directory, capabilities, surface):
        caps_path = os.path.join(directory, "caps.json")
        out_path = os.path.join(directory, "surface.json")
        with open(caps_path, "w") as f:
            json.dump(capabilities, f)
        with open(out_path, "w") as f:
            json.dump(surface, f)
        return caps_path, out_path

    def test_observed_fields_survive_and_declared_fields_update(self):
        capabilities = {
            "tools": [
                {
                    "name": "list_things",
                    "inputSchema": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["cursor"],
                        "properties": {"cursor": {"type": "string"}},
                    },
                    "outputSchema": {"properties": {"things": {}}},
                }
            ]
        }
        surface = {
            "tools": [
                {
                    "name": "list_things",
                    "classification": "read",
                    "input_required": ["stale"],
                    "input_optional": ["alsoStale"],
                    "input_constants": {},
                    "declared_output": [],
                    "observed": ["things"],
                    "observed_shape": {"things": []},
                }
            ]
        }
        with tempfile.TemporaryDirectory() as directory:
            caps_path, out_path = self._write(directory, capabilities, surface)
            assert refresh_declared(caps_path, out_path) == 0
            with open(out_path) as f:
                entry = json.load(f)["tools"][0]
        assert entry["input_required"] == ["cursor"]
        assert entry["input_optional"] == []
        assert entry["input_required_paths"] == ["cursor"]
        assert entry["input_accepts"] == {"": {"closed": True, "accepts": ["cursor"]}}
        assert entry["declared_output"] == ["things"]
        # The refresh's whole warrant: what was observed is exactly as it was.
        assert entry["observed"] == ["things"]
        assert entry["observed_shape"] == {"things": []}
        assert entry["classification"] == "read"

    def test_mismatched_tool_sets_are_refused(self):
        # Same count, different names — the case a size check would wave past.
        capabilities = {"tools": [{"name": "new_tool", "inputSchema": {}}]}
        surface = {"tools": [{"name": "old_tool", "input_constants": {}}]}
        with tempfile.TemporaryDirectory() as directory:
            caps_path, out_path = self._write(directory, capabilities, surface)
            with open(out_path) as f:
                before = f.read()
            assert refresh_declared(caps_path, out_path) == 2
            with open(out_path) as f:
                assert f.read() == before, "a refused refresh must write nothing"


class RealArtifact(unittest.TestCase):
    """The committed artifact carries the new fields, non-vacuously."""

    ARTIFACT = os.path.join(
        os.path.dirname(__file__), "..", "docs", "battlegrid-mcp-surface.json"
    )

    def test_the_defect_that_motivated_this_is_representable(self):
        with open(self.ARTIFACT) as f:
            tools = {t["name"]: t for t in json.load(f)["tools"]}
        update = tools["update_intelligence_agent"]
        config = update["input_accepts"]["tradingConfig"]
        assert config["closed"] is True
        assert len(config["accepts"]) == 20
        assert any("." in p for p in update["input_required_paths"])

    def test_union_variants_are_recorded_for_the_compile_request(self):
        with open(self.ARTIFACT) as f:
            tools = {t["name"]: t for t in json.load(f)["tools"]}
        variants = tools["compile_strategy_plan"]["input_accepts"]["request"]["variants"]
        assert [v["when"].get("operation") for v in variants] == [
            "CREATE",
            "UPDATE",
            "RESTORE",
        ]


if __name__ == "__main__":
    unittest.main()
