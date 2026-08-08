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

    def test_a_nullable_closed_object_is_recorded_at_its_path(self):
        # `anyOf: [closed object, null]` — one object shape among non-object
        # alternatives. It is the object at this path, not a variant of one.
        schema = {
            "type": "object",
            "properties": {
                "config": {
                    "anyOf": [
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {"mode": {}},
                        },
                        {"type": "null"},
                    ]
                }
            },
        }
        assert input_accepts(tool(schema))["config"] == {
            "closed": True,
            "accepts": ["mode"],
        }

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


CAPABILITIES = os.path.join(
    os.path.dirname(__file__), "..", "docs", "battlegrid-mcp-capabilities.json"
)


def declared(name):
    """One tool, as the platform declared it — `$ref`s and nested `anyOf`s intact.

    The committed dump rather than a fixture. The union this class exists for is
    three `anyOf` levels deep with five `$ref`s pointing back into the first
    branch, and a hand-written imitation would be tidier than the thing that
    broke the walk — which is how a test comes to pass on a schema nobody sends.
    """
    with open(CAPABILITIES) as f:
        for tool in json.load(f)["tools"]:
            if tool["name"] == name:
                return tool
    raise AssertionError(f"{name} is not in the capabilities dump")


def matching_variants(entry, payload):
    """The variants a reader would match this payload to. Mirrors the guard.

    `tests/architecture/payload-conformance.test.ts` picks a variant exactly this
    way — `when` by equality, `when_one_of` by membership — so if the two ever
    disagree about what the record means, one of them is checking something else.
    A record is only usable when this answers with exactly one.
    """
    found = []
    for variant in entry["variants"]:
        if any(payload.get(key) != value for key, value in variant["when"].items()):
            continue
        if any(
            payload.get(key) not in values
            for key, values in (variant.get("when_one_of") or {}).items()
        ):
            continue
        found.append(variant)
    return found


class TheConditionUnion(unittest.TestCase):
    """The nested union the walk used to describe one sixth of.

    `conditions[].definition` is an `anyOf` over the group object and a further
    `anyOf` — which holds a third `anyOf` of the four clause forms, plus the
    reference. The walk saw one object branch, recorded it with `record_closed`,
    and closed the set: `conditions[].definition` accepted `kind/members/n/op`,
    so a clause's `column` and a reference's `conditionKey` read as violations of
    a set the platform does not close. An invented violation — the direction
    `input_accepts` promises never to take, and the damaging one.
    """

    def setUp(self):
        self.tool = declared("preview_strategy_report")
        self.accepts = input_accepts(self.tool)

    def test_the_declared_union_really_is_nested(self):
        """The anti-vacuity pass, and it guards every case below.

        If BattleGrid ever flattens this union, the walk under test would pass
        these cases without ever following a nested branch — proving nothing
        about the thing that was broken. Then this fails first, and says so.
        """
        definition = self.tool["inputSchema"]["properties"]["conditions"]["items"][
            "properties"
        ]["definition"]
        branches = definition["anyOf"]
        assert len(branches) == 2, "the declared union stopped being two-branched"
        signposts = [b for b in branches if not b.get("properties") and b.get("anyOf")]
        assert len(signposts) == 1, "no branch is a bare union — the walk has nothing to follow"
        assert any(b.get("properties") for b in branches), "no branch is a plain object"

    def test_every_declared_shape_reaches_the_record(self):
        entry = self.accepts["conditions[].definition"]
        assert [v["when"] for v in entry["variants"]] == [
            {"kind": "clause"},
            {"kind": "clause", "op": "between"},
            {"kind": "clause", "op": "is"},
            {"kind": "clause", "op": "in"},
            {"kind": "conditionRef"},
            {"kind": "group"},
        ]

    def test_the_keys_that_used_to_read_as_violations_are_accepted_somewhere(self):
        entry = self.accepts["conditions[].definition"]
        accepted = set()
        for variant in entry["variants"]:
            accepted |= set(variant["accepts"])
        for key in ("column", "value", "low", "high", "label", "labels", "conditionKey"):
            assert key in accepted, f"{key} is still unrepresentable"

    def test_the_fourth_clause_form_is_told_apart_by_its_enum(self):
        """The collision this change exists to solve.

        Three clause forms pin `op` with `const`; the fourth pins it with
        `enum: [lt, lte, gte, gt]` and so discriminates on `kind: "clause"`
        alone — which every one of the other three also answers.
        """
        variants = self.accepts["conditions[].definition"]["variants"]
        assert variants[0]["when_one_of"] == {"op": ["lt", "lte", "gte", "gt"]}
        # And the branches that need no widening did not get any.
        for variant in variants[1:]:
            assert "when_one_of" not in variant, variant["when"]

    def test_each_form_the_product_writes_matches_exactly_one_variant(self):
        """The property the record has to have to be usable at all.

        These are the seven shapes `src/domain/strategy/condition-draft.ts`
        emits. Two matches is worse than none: a reader taking the first would
        check a `between` clause against the comparison branch and report `low`
        and `high` as violations of a closed set — the old defect, moved.
        """
        column = {"sectionKey": "includeRegimeContext", "header": "regTrend_now"}
        forms = [
            {"kind": "clause", "column": column, "op": "gt", "value": 50},
            {"kind": "clause", "column": column, "op": "lte", "value": 0.5},
            {"kind": "clause", "column": column, "op": "between", "low": 1, "high": 9},
            {"kind": "clause", "column": column, "op": "is", "label": "trending up"},
            {"kind": "clause", "column": column, "op": "in", "labels": ["a", "b"]},
            {"kind": "conditionRef", "conditionKey": "FLOW_UP"},
            {"kind": "group", "op": "N_OF", "n": 2, "members": []},
        ]
        entry = self.accepts["conditions[].definition"]
        for form in forms:
            matched = matching_variants(entry, form)
            assert len(matched) == 1, f"{form['op']}: matched {len(matched)} variants"
            unaccepted = sorted(set(form) - set(matched[0]["accepts"]))
            assert unaccepted == [], f"{form['op']}: {unaccepted} read as violations"

    def test_a_member_of_a_group_carries_the_same_union(self):
        """The recursion. `members[]` is a `$ref` back to `definition` itself."""
        entry = self.accepts["conditions[].definition.members[]"]
        assert [v["when"].get("kind") for v in entry["variants"]] == [
            "clause",
            "clause",
            "clause",
            "clause",
            "conditionRef",
            "group",
        ]

    def test_a_clause_column_is_recorded_now_that_the_walk_reaches_it(self):
        # Reachable only through a branch inside the inner union — the walk
        # stopped before it, so the path did not exist in the record at all.
        assert self.accepts["conditions[].definition.column"] == {
            "closed": True,
            "accepts": ["header", "sectionKey"],
        }

    def test_the_same_union_on_the_other_two_tools_that_take_conditions(self):
        for name, path in (
            ("compile_strategy_plan", "request.conditions[].definition"),
            ("apply_strategy_plan", "request.plan.conditions[].definition"),
        ):
            entry = input_accepts(declared(name))[path]
            assert len(entry["variants"]) == 6, name


class Collisions(unittest.TestCase):
    """What the record does when a discriminator cannot separate two branches."""

    def test_branches_nothing_pins_are_merged_rather_than_left_to_first_match(self):
        """The other invented violation, found while fixing the first.

        A report column's `timeframe` is `{rel}` or `{abs}` — nothing is pinned
        on either, so both recorded `when: {}`, both matched everything, and a
        reader taking the first read `abs` as a violation of a closed set holding
        only `rel`. Nothing can discriminate here, so the honest record is one
        merged variant: accepted names union, required paths intersect.
        """
        entry = input_accepts(declared("preview_strategy_report"))[
            "sections[].columns[].timeframe"
        ]
        assert entry["variants"] == [
            {"when": {}, "closed": True, "accepts": ["abs", "rel"], "required": []}
        ]

    def test_a_union_that_consts_already_separate_is_left_exactly_as_it_was(self):
        # The regression guard for every other union on the surface: widening a
        # discriminator that already separates would make the record assert more
        # than it needs to, and checking permitted *values* is another file's job.
        entry = input_accepts(declared("compile_strategy_plan"))["request"]
        assert [v["when"] for v in entry["variants"]] == [
            {"operation": "CREATE"},
            {"operation": "UPDATE"},
            {"operation": "RESTORE"},
        ]
        for variant in entry["variants"]:
            assert "when_one_of" not in variant

    def test_a_branch_that_is_only_a_union_is_followed(self):
        schema = {
            "type": "object",
            "properties": {
                "definition": {
                    "anyOf": [
                        {
                            "anyOf": [
                                {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["kind", "a"],
                                    "properties": {"kind": {"const": "A"}, "a": {}},
                                },
                                {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": ["kind", "b"],
                                    "properties": {"kind": {"const": "B"}, "b": {}},
                                },
                            ]
                        },
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["kind"],
                            "properties": {"kind": {"const": "C"}},
                        },
                    ]
                }
            },
        }
        entry = input_accepts(tool(schema))["definition"]
        assert [v["when"]["kind"] for v in entry["variants"]] == ["A", "B", "C"]

    def test_an_enum_on_a_property_a_branch_does_not_demand_never_discriminates(self):
        """A `when_one_of` a payload can legitimately omit is unmatchable.

        And an unmatchable variant reads as "no declared variant matches what is
        sent" — an invented violation of exactly the kind being removed here. So
        an optional enum does not widen, and the two branches merge instead.
        """
        schema = {
            "type": "object",
            "properties": {
                "thing": {
                    "anyOf": [
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["kind"],
                            "properties": {
                                "kind": {"const": "T"},
                                "mode": {"enum": ["x", "y"]},
                                "left": {},
                            },
                        },
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["kind"],
                            "properties": {
                                "kind": {"const": "T"},
                                "mode": {"enum": ["z"]},
                                "right": {},
                            },
                        },
                    ]
                }
            },
        }
        entry = input_accepts(tool(schema))["thing"]
        assert entry["variants"] == [
            {
                "when": {"kind": "T"},
                "closed": True,
                "accepts": ["kind", "left", "mode", "right"],
                "required": ["kind"],
            }
        ]

    def test_a_chain_of_collisions_merges_whole(self):
        """Told-apart is symmetric and not transitive.

        A and C pin `op` to different values; B pins nothing but `kind`, so it
        collides with both. A reader has no rule for picking, so all three belong
        in one merged record — first-fit grouping would have left C on its own.
        """
        def branch(properties, required):
            return {
                "type": "object",
                "additionalProperties": False,
                "required": required,
                "properties": properties,
            }

        schema = {
            "type": "object",
            "properties": {
                "thing": {
                    "anyOf": [
                        branch({"kind": {"const": "T"}, "op": {"const": "a"}}, ["kind", "op"]),
                        branch({"kind": {"const": "T"}, "only": {}}, ["kind"]),
                        branch({"kind": {"const": "T"}, "op": {"const": "c"}}, ["kind", "op"]),
                    ]
                }
            },
        }
        entry = input_accepts(tool(schema))["thing"]
        assert entry["variants"] == [
            {
                "when": {"kind": "T"},
                "closed": True,
                "accepts": ["kind", "only", "op"],
                "required": ["kind"],
            }
        ]

    def test_a_merged_variant_is_open_when_any_branch_it_covers_is_open(self):
        # `closed` licenses the accepted-set check. One open branch means the
        # platform accepts keys nobody enumerated, and claiming closure would
        # invent violations for every one of them.
        schema = {
            "type": "object",
            "properties": {
                "thing": {
                    "anyOf": [
                        {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {"a": {}},
                        },
                        {"type": "object", "properties": {"b": {}}},
                    ]
                }
            },
        }
        entry = input_accepts(tool(schema))["thing"]
        assert entry["variants"] == [
            {"when": {}, "closed": False, "accepts": ["a", "b"], "required": []}
        ]


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
        # v13 accepted 20 names here; v14 accepts 18. The platform resizes this
        # object across deploys, so the count is not the property — a closed
        # object whose accepted names are recorded non-vacuously is.
        assert "tradingMode" in config["accepts"]
        assert len(config["accepts"]) > 10
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
