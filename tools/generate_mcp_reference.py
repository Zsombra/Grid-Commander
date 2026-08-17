"""Generate the complete BattleGrid MCP library reference from a live capability dump."""
import json, re, textwrap, sys, time

SP = sys.argv[1]
init = json.load(open(f"{SP}/init.txt", encoding="utf-8"))["result"]


def bodies(filename):
    """Prose bodies from the capture, or a loud failure naming the fix.

    A dump taken before `capture_mcp_dump.py` learned to fetch bodies has no
    such file. Defaulting to empty here would emit a record that silently
    describes the platform's prose as absent — the exact shape of #294, where
    a surface nothing recorded read as a surface with nothing in it.
    """
    try:
        return json.load(open(f"{SP}/{filename}", encoding="utf-8"))["entries"]
    except FileNotFoundError:
        raise SystemExit(
            f"{SP}/{filename} is missing — this dump predates prose capture.\n"
            f"Re-capture: BATTLEGRID_API_KEY=… python3 tools/capture_mcp_dump.py {SP}"
        )


cap = {
    "tools": json.load(open(f"{SP}/tools.json", encoding="utf-8"))["result"]["tools"],
    "prompts": json.load(open(f"{SP}/prompts.json", encoding="utf-8"))["result"]["prompts"],
    "resources": json.load(open(f"{SP}/resources.json", encoding="utf-8"))["result"]["resources"],
    "resourceTemplates": json.load(open(f"{SP}/restemplates.json", encoding="utf-8"))["result"].get("resourceTemplates", []),
    "serverInfo": init["serverInfo"],
    "protocolVersion": init["protocolVersion"],
    "capabilities": init.get("capabilities", {}),
    "instructions": init.get("instructions", ""),
    # The prose the lists could only name. Verbatim, and a refused fetch
    # travels as `failure` on its own entry rather than as absence — see
    # `harvest_bodies` in the capture tool (#294).
    "promptBodies": bodies("promptbodies.json"),
    "resourceContents": bodies("resourcebodies.json"),
}
tools = {t["name"]: t for t in cap["tools"]}


def fenced(text):
    """`text` in a code fence long enough to survive whatever it contains.

    The bodies are markdown carrying their own fences and `##` headings. Left
    bare they would fold into this document's heading structure and break its
    contents list; fenced with three backticks they would end early at the
    first fence of their own.
    """
    longest = 0
    run = 0
    for ch in text:
        run = run + 1 if ch == "`" else 0
        longest = max(longest, run)
    fence = "`" * max(3, longest + 1)
    return fence + "text\n" + text + "\n" + fence


def prompt_text(entry):
    """Every message of a fetched prompt, flattened to the text it carries."""
    result = entry.get("result") or {}
    out = []
    for message in result.get("messages") or []:
        content = message.get("content") or {}
        text = content.get("text")
        if text is not None:
            out.append((message.get("role", "?"), text))
    return out


def resource_text(entry):
    result = entry.get("result") or {}
    return [
        (c.get("mimeType", "?"), c.get("text", ""))
        for c in (result.get("contents") or [])
        if c.get("text") is not None
    ]

CATS = [
 ("Market Grid — playing the game", ["list_market_grid_sessions","get_market_grid_session","check_market_grid_submission","submit_market_grid","update_market_grid","random_submit_market_grid","get_market_grid_results","get_market_grid_player_grid","get_mcp_reasoning_journal","list_game_presets"]),
 ("Account, ranking & leaderboard", ["get_account_state","get_leaderboard"]),
 ("Market data & context", ["get_market_context","get_coin_market_context","get_coin_metadata","get_coin_candles","get_coin_performance_history","get_top_ranked_coins","get_macd_heatmap","get_coin_signal_preview","get_agent_coin_qualification"]),
 ("Intelligence agents — lifecycle", ["list_intelligence_agents","get_intelligence_agent","create_intelligence_agent","update_intelligence_agent","rebind_intelligence_agent","archive_intelligence_agent","activate_intelligence_agent","list_approved_models","get_trading_config_catalog"]),
 ("Agent grid generation", ["generate_agent_grid","submit_agent_grid","get_agent_automation_status"]),
 ("Agent introspection & journals", ["get_agent_journal","get_agent_thought_log","get_agent_activity_feed","get_user_thought_log","get_user_activity_feed","get_agent_budget","get_agent_performance","get_agent_fund_allocation","get_agent_explorer","get_agents_hub","get_agent_conviction_calibration","get_agent_decision_context","get_agent_prompt_context_preview","get_context_sources_preview","get_context_source_full_preview","get_agent_game_history","get_user_agent_game_history"]),
 ("Strategy — discovery & vocabulary", ["list_strategies","get_strategy","list_strategy_categories","list_strategy_vocabulary","get_metric_construction_hints","get_strategy_column_contract","get_strategy_section_template","preview_strategy_report","list_strategy_signals","get_strategy_signal_definition","derive_strategy_rule_view"]),
 ("Strategy — authoring & lifecycle", ["compile_strategy_plan","apply_strategy_plan","update_strategy_signal_rule","fork_strategy","archive_strategy","restore_strategy"]),
 ("Trading — signals & entry decisions", ["list_signal_logs","get_signal_log","get_signal_performance","simulate_aggregate_score","list_entry_decisions","get_entry_decision","accept_entry_decision","cancel_entry_decision","list_pending_approvals","list_gate_blocks"]),
 ("Trading — positions, orders & outcomes", ["list_user_active_positions","list_session_agent_positions","get_agent_open_positions","get_position_audit_history","get_open_orders","get_order_status","close_agent_position","override_agent_protection","list_trade_outcomes","get_trade_outcome_by_decision","get_trade_chart","get_decision_order_attribution","halt_intelligence_agent","resume_intelligence_agent","set_agent_per_trade_push","reset_agent_drawdown_baseline"]),
 ("Deployment policies & radar", ["get_deployment_policy","upsert_deployment_policy","delete_deployment_policy","list_deployment_policies","preview_deployment_resolution","test_generate_deployment_grid","get_radar_deployment","list_radar_deployments","get_radar_activity","upsert_radar_deployment","delete_radar_deployment","preview_radar_resolution"]),
 ("Market regime", ["get_regime_snapshot","get_regime_history"]),
 ("Public agent explorer (other players)", ["get_public_agent_signal_logs","get_public_agent_signal_log_detail","get_public_agent_signal_performance","get_public_agent_trade_chart","get_public_agent_realized_trades","get_public_agent_game_history","get_public_agent_unrealized_pnl"]),
]

placed = {n for _, ns in CATS for n in ns}
leftover = sorted(set(tools) - placed)
if leftover:
    CATS.append(("Uncategorised", leftover))
missing = sorted(placed - set(tools))

PIPE = "\\|"


def is_wager(t):
    return bool(re.search(r"mcp:wager", json.dumps(t), re.I))


def ann(t):
    return t.get("annotations") or {}


def mutates(t):
    return ann(t).get("readOnlyHint") is False


def badges(t):
    a = ann(t)
    b = []
    b.append("read-only" if a.get("readOnlyHint") else "**writes**")
    if a.get("destructiveHint"):
        b.append("**destructive**")
    if a.get("idempotentHint") is False:
        b.append("non-idempotent")
    if a.get("openWorldHint"):
        b.append("open-world")
    if is_wager(t):
        b.append("**`mcp:wager`**")
    return " · ".join(b)


def out_fields(t):
    """Top-level property names of the declared outputSchema."""
    os_ = t.get("outputSchema") or {}
    props = os_.get("properties") or {}
    return list(props)


def typ(s):
    if not isinstance(s, dict):
        return "?"
    if "enum" in s:
        e = s["enum"]
        return "enum(" + "|".join(str(x) for x in e[:8]) + (",…" if len(e) > 8 else "") + ")"
    t = s.get("type")
    if t == "array":
        it = s.get("items", {})
        return "array<" + (typ(it) if isinstance(it, dict) else "?") + ">"
    if isinstance(t, list):
        return "|".join(t)
    if t is None:
        for k in ("anyOf", "oneOf"):
            if k in s:
                v = [typ(x) for x in s[k]]
                return k + "[" + " | ".join(v[:4]) + ("…" if len(v) > 4 else "") + "]"
        return "object" if "properties" in s else "?"
    return t


def clean(d, limit=150):
    d = " ".join((d or "").split()).replace("|", PIPE)
    return d[: limit - 1] + "…" if len(d) > limit else d


def emit_props(w, schema, prefix="", depth=0, maxdepth=3):
    props = schema.get("properties") or {}
    req = set(schema.get("required") or [])
    for pn, ps in props.items():
        if not isinstance(ps, dict):
            ps = {}
        d = clean(ps.get("description"))
        dflt = ps.get("default")
        if dflt is not None:
            d = (d + " (default `" + str(dflt) + "`)").strip()
        w("| `" + prefix + pn + "` | " + typ(ps) + " | " + ("YES" if pn in req else "") + " | " + d + " |")
        if depth >= maxdepth:
            continue
        if ps.get("type") == "object" and ps.get("properties"):
            emit_props(w, ps, prefix + pn + ".", depth + 1, maxdepth)
        elif ps.get("type") == "array" and isinstance(ps.get("items"), dict) and ps["items"].get("properties"):
            emit_props(w, ps["items"], prefix + pn + "[].", depth + 1, maxdepth)
        else:
            for k in ("anyOf", "oneOf"):
                for i, v in enumerate(ps.get(k, [])):
                    if isinstance(v, dict) and v.get("properties"):
                        w("| `" + prefix + pn + "` *(" + k + " variant " + str(i + 1) + ")* | object | | "
                          + clean(v.get("description")) + " |")
                        emit_props(w, v, prefix + pn + "<" + str(i + 1) + ">.", depth + 1, maxdepth)


out = []
w = out.append
si = cap["serverInfo"]
w("# BattleGrid MCP — complete library reference\n")
w("Generated from a live `tools/list`, `prompts/list` and `resources/list` against")
w("`https://mcp.battlegrid.trade/mcp` (server `" + si.get("name", "?") + " v" + si.get("version", "?")
  + "`, protocol `" + cap["protocolVersion"] + "`) on "
  + time.strftime("%Y-%m-%d", time.gmtime()) + ".")
w("Reconnaissance only — no wager tool was called.\n")
w("> The server instructs clients to rediscover capabilities from the live connection,")
w("> because this list stops being authoritative after a deployment. The machine-readable")
w("> dump alongside this file (`battlegrid-mcp-capabilities.json`) is the diffable artifact;")
w("> regenerate both rather than trusting them blindly.\n")
w("**" + str(len(tools)) + " tools · " + str(len(cap["prompts"])) + " prompts · "
  + str(len(cap["resources"])) + " resources · " + str(len(cap["resourceTemplates"]))
  + " resource templates**\n")

wagers = sorted(n for n, t in tools.items() if is_wager(t))
confirms = sorted(n for n, t in tools.items()
                  if "confirm" in ((t.get("inputSchema", {}) or {}).get("properties") or {}))

w("## Scopes\n")
w("| Scope | Grants |")
w("|---|---|")
w("| `mcp:read` | Discovery **and non-financial configuration writes** — creates agents, authors strategies. Not view-only. |")
w("| `mcp:wager` | Commits funds or grants autonomous authority. |\n")
w("**" + str(len(wagers)) + " of " + str(len(tools)) + " tools require `mcp:wager`**; the remaining "
  + str(len(tools) - len(wagers)) + " are `mcp:read`.\n")
w("Platform caps on MCP-signed wagers: **10 per day**, **$500/day** "
  + "(`mcpSignedWagerDailyCountLimit`, `mcpSignedWagerDailyVolumeLimitUsd`).\n")
w("### Money / autonomous-authority tools — the complete set\n")
for n in wagers:
    w("- `" + n + "`")
w("")
w("### Tools taking an explicit `confirm` flag as a second gate\n")
for n in confirms:
    w("- `" + n + "`")
w("")

mut = [n for n, t in tools.items() if mutates(t)]
mut_nowager = sorted(n for n in mut if not is_wager(tools[n]))
destructive = sorted(n for n, t in tools.items() if ann(t).get("destructiveHint"))
dest_nowager = [n for n in destructive if n in mut_nowager]

w("## Every tool carries MCP annotations — use them, not name heuristics\n")
w("All " + str(len(tools)) + " tools declare `readOnlyHint`, `destructiveHint`, `idempotentHint`")
w("and `openWorldHint`, plus `execution.taskSupport` (`forbidden` on every tool — none may be")
w("run as a detached task).\n")
w("| Classification | Count |")
w("|---|---:|")
w("| Read-only (`readOnlyHint: true`) | " + str(len(tools) - len(mut)) + " |")
w("| Mutating (`readOnlyHint: false`) | " + str(len(mut)) + " |")
w("| Destructive (`destructiveHint: true`) | " + str(len(destructive)) + " |")
w("| Requires `mcp:wager` | " + str(len(wagers)) + " |\n")
w("### The gap that matters: " + str(len(mut_nowager)) +
  " tools mutate state on `mcp:read` alone\n")
w("Scope and mutation are **not** the same axis. These write without needing wager authority —")
w("" + str(len(dest_nowager)) + " of them are flagged destructive:\n")
w("| Tool | Destructive |")
w("|---|:--:|")
for n in mut_nowager:
    w("| `" + n + "` | " + ("**YES**" if n in destructive else "") + " |")
w("")
w("A credential issued as \"read-only\" can therefore create agents, rebind them to a different")
w("strategy (replacing their configuration wholesale), archive them, author and apply strategy")
w("plans, and edit signal rules that propagate immediately to every bound agent. It cannot move")
w("money. Scope `mcp:read` accordingly — it is configuration authority, not view access.\n")
w("## Contents\n")
w("- [Server instructions](#server-instructions)")
for title, _ in CATS:
    anchor = re.sub(r"[^a-z0-9 -]", "", title.lower()).replace(" ", "-")
    w("- [" + title + "](#" + anchor + ")")
w("- [Prompts](#prompts)")
w("- [Resources](#resources)")
w("")

# The prose contract, in the repository rather than only over a live
# connection. It carries constraints no schema expresses — scope semantics,
# copy-don't-construct rules, per-tool pagination, authoring deadlines — and
# was loaded by this generator and written nowhere until #294.
w("\n## Server instructions\n")
w("What the server tells every connecting client, verbatim from the")
w("`initialize` handshake. It addresses the connected account by name, so the")
w("greeting differs per operator and nothing else here should.\n")
w(fenced(cap["instructions"]) if cap["instructions"] else "_The server sent no instructions._\n")
w("")

for title, names in CATS:
    w("\n## " + title + "\n")
    for n in names:
        t = tools.get(n)
        if not t:
            continue
        s = t.get("inputSchema", {}) or {}
        props = s.get("properties", {}) or {}
        w("### `" + n + "`\n")
        if t.get("title"):
            w("*" + str(t["title"]) + "* — " + badges(t) + "\n")
        else:
            w(badges(t) + "\n")
        for para in (t.get("description") or "").strip().split("\n"):
            para = para.strip()
            if para:
                w(textwrap.fill(para, 92) + "\n")
        of = out_fields(t)
        if of:
            w("Returns: " + ", ".join("`" + f + "`" for f in of) + "\n")
        if props:
            w("| Param | Type | Req | Description |")
            w("|---|---|:--:|---|")
            emit_props(w, s)
            w("")
        else:
            w("_No parameters._\n")

by_prompt = {e.get("name"): e for e in cap["promptBodies"]}
by_resource = {e.get("uri"): e for e in cap["resourceContents"]}

w("\n## Prompts\n")
w("Bodies as the server renders them with no argument values supplied — every")
w("declared argument is optional, but the `arguments` key is not: omitting it")
w("entirely is refused `-32602`.\n")
for p in cap["prompts"]:
    args = p.get("arguments") or []
    a = ", ".join("`" + str(x.get("name")) + "`" + ("" if x.get("required") else "?") for x in args) or "—"
    w("### `" + str(p.get("name")) + "`\n")
    w((p.get("description") or "").strip() + "\n")
    w("Arguments: " + a + "  \n_(`?` marks optional)_\n")
    entry = by_prompt.get(p.get("name"))
    if entry is None:
        w("_No body recorded._\n")
    elif "failure" in entry:
        w("**The server refused this body:** `"
          + clean(json.dumps(entry["failure"]), 300) + "`\n")
    else:
        for role, text in prompt_text(entry):
            w("*" + role + ":*\n")
            w(fenced(text))
            w("")

w("\n## Resources\n")
w("| Name | URI | Description |")
w("|---|---|---|")
for r in cap["resources"]:
    w("| `" + str(r.get("name")) + "` | `" + str(r.get("uri")) + "` | " + clean(r.get("description")) + " |")
w("")
for r in cap["resources"]:
    uri = str(r.get("uri"))
    w("### `" + uri + "`\n")
    entry = by_resource.get(uri)
    if entry is None:
        w("_No content recorded._\n")
    elif "failure" in entry:
        w("**The server refused this content:** `"
          + clean(json.dumps(entry["failure"]), 300) + "`\n")
    else:
        for mime, text in resource_text(entry):
            w("*" + mime + "*\n")
            w(fenced(text))
            w("")

# encoding pinned: the reference contains arrows and em-dashes, and Windows
# hands Python a cp1252 default that cannot encode them — so this script
# could not run there at all, which is part of why the reference went a
# major version stale (#186).
open(f"{SP}/mcp-reference.md", "w", encoding="utf-8", newline="\n").write("\n".join(out))
json.dump(cap, open(f"{SP}/mcp-capabilities.json", "w", encoding="utf-8", newline="\n"), indent=2, sort_keys=True, ensure_ascii=False)

covered = sum(len([n for n in ns if n in tools]) for _, ns in CATS)
print("tools in list      :", len(tools))
print("tools documented   :", covered)
print("uncategorised      :", len(leftover), leftover or "")
print("names not on server:", len(missing), missing or "")
assert covered == len(tools), "COVERAGE GAP"
print("COVERAGE OK — every tool documented")
