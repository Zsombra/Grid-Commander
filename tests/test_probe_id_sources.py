"""The probe's id table, checked against what the platform actually returned.

`ID_SOURCES` maps an argument name to the tool and array field that answer it.
The first version was written from assumption and three of five rows were wrong:
`list_entry_decisions` returns `entries` rather than `decisions`,
`list_signal_logs` returns `entries` rather than `logs`, and the argument is
`logId` rather than `signalLogId`.

Nothing failed. The lookups simply returned nothing, the tools stayed uncalled,
and the artifact reported them as needing an argument the account plainly had.
A silently empty lookup is the exact failure mode this probe exists to remove
from the product, so it should not survive inside the probe.
"""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "tools"))

from probe_mcp_surface import ID_SOURCES, arguments_for, harvest  # noqa: E402

ARTIFACT = os.path.join(os.path.dirname(__file__), "..", "docs", "battlegrid-mcp-surface.json")


def surface():
    with open(ARTIFACT) as f:
        return json.load(f)


def by_name():
    return {t["name"]: t for t in surface()["tools"]}


class ProbeIdSources(unittest.TestCase):
    def test_every_id_source_names_a_tool_the_probe_actually_calls(self):
        tools = by_name()
        for argument, (tool, _field) in ID_SOURCES.items():
            assert tool in tools, f"{argument}: {tool} is not a tool"
            assert tools[tool]["classification"] == "read", f"{tool} must be a read"
            assert tools[tool].get("observed") is not None, (
                f"{argument}: {tool} was never called, so it can answer nothing"
            )


    def test_every_id_source_field_exists_and_carries_an_id(self):
        """The check that would have caught the three wrong rows.

        A wrong row names a field the tool does not return — that must fail,
        it is the silently-empty-lookup defect this file exists for. An empty
        *list* under the right name is different: it is the account's state on
        the day of the probe, not a defect in the row. The 2026-07-31 probe
        recorded `list_entry_decisions.entries` as `[]` because the account's
        agent had made no entry decisions — the field, the tool and the row
        were all correct, and failing on it would teach people to re-probe
        until the account looks busier. Where rows exist, they must carry an
        `id`; where none do, the artifact already records which arguments went
        unanswered.
        """
        tools = by_name()
        for argument, (tool, field) in ID_SOURCES.items():
            shape = tools[tool].get("observed_shape") or {}
            assert field in shape, (
                f"{argument}: {tool} returns {sorted(shape)}, not '{field}'"
            )
            rows = shape[field]
            assert isinstance(rows, list), f"{argument}: {tool}.{field} is not a list"
            if not rows:
                continue  # the account had no rows that day — a state, not a wrong row
            assert isinstance(rows[0], dict) and "id" in rows[0], (
                f"{argument}: rows of {tool}.{field} carry no 'id'"
            )


    def test_harvest_takes_the_first_row_not_an_arbitrary_one(self):
        """A probe that picks differently each run makes the artifact's diff meaningless."""
        payloads = {"list_intelligence_agents": {"agents": [{"id": "first"}, {"id": "second"}]}}
        assert harvest(payloads)["agentId"] == "first"


    def test_harvest_ignores_a_response_with_no_usable_rows(self):
        assert harvest({"list_intelligence_agents": {"agents": []}}) == {}
        assert harvest({"list_intelligence_agents": {"agents": [{"noId": 1}]}}) == {}
        assert harvest({}) == {}


    def test_a_missing_argument_is_named_rather_than_the_whole_list(self):
        """"needs arguments: agentId, ticker" never said which of the two was missing."""
        args, why = arguments_for(["agentId", "ticker"], {"agentId": "a1"})
        assert args is None
        assert "ticker" in why
        assert "agentId" not in why


    def test_arguments_are_supplied_when_all_are_available(self):
        args, why = arguments_for(["agentId"], {"agentId": "a1", "strategyId": "s1"})
        assert args == {"agentId": "a1"}
        assert why == ""


    def test_the_probe_called_only_read_tools(self):
        """The safety property, asserted against the artifact rather than trusted.

        Supplying discovered arguments widened what could be observed. It must not
        have widened what could be called.
        """
        for tool in surface()["tools"]:
            if tool.get("observed") is not None or tool.get("arguments_from"):
                assert tool["classification"] == "read", (
                    f"{tool['name']} is '{tool['classification']}' and was called"
                )


    def test_the_call_loop_filters_on_classification_in_source(self):
        """The safety property, asserted against the code and not only the run.

        `test_the_probe_called_only_read_tools` checks the artifact, so it can
        only fail *after* someone has already probed live with a broken filter.
        Deleting the classification check and not re-probing failed nothing —
        found by re-injecting exactly that.

        A guard on the safety property has to hold before the request is built,
        which means it has to hold in the source.
        """
        source = open(os.path.join(os.path.dirname(__file__), "..", "tools", "probe_mcp_surface.py")).read()

        # Pass one refuses anything not annotated read-only...
        self.assertIn('if kind != "read":', source)
        # ...and pass two re-checks it for every tool it supplies arguments to.
        self.assertIn('entry["classification"] != "read"', source)

        # `attempt()` is the only thing that issues a tools/call, and both of
        # its call sites sit behind one of those checks.
        self.assertEqual(source.count('rpc(key, "tools/call"'), 1)

    def test_supplying_ids_more_than_doubled_what_is_observed(self):
        called = [t for t in surface()["tools"] if t.get("observed") is not None]
        discovered = [t for t in called if str(t.get("arguments_from", "")).startswith("discovered:")]
        # 21 before this change; 49 after, of 83 read tools.
        assert len(called) > 40, f"only {len(called)} tools observed"
        assert len(discovered) > 20, f"only {len(discovered)} reached by discovered ids"


if __name__ == "__main__":
    unittest.main()
