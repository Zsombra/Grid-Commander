import json
import urllib.request

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"

def call_mcp(name, arguments):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": arguments}}).encode()
    req = urllib.request.Request("https://mcp.battlegrid.trade/mcp", data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    })
    try:
        with urllib.request.urlopen(req) as r:
            content = r.read().decode()
            if content.startswith("event:"):
                for line in content.split("\n"):
                    if line.startswith("data:"):
                        try: return json.loads(line[5:].strip())
                        except: pass
            else:
                return json.loads(content)
    except Exception as e:
        print(f"Error calling {name}: {e}")
    return {}

def extract_result(res):
    if res.get("error"): return None
    txt = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
    try: return json.loads(txt)
    except: return None

# 1. Get all agents
agents_res = call_mcp("list_intelligence_agents", {})
agents_data = extract_result(agents_res)
agents = agents_data.get("agents", []) if agents_data else []

print("Current Agents:")
fade_agents = []
used_strategy_ids = set()
for a in agents:
    agent_id = a["id"]
    agent_name = a["displayName"]
    strategy_id = a.get("strategyId")
    strategy_name = a.get("strategyName", "")
    used_strategy_ids.add(strategy_id)
    print(f"- {agent_name} | Strategy: {strategy_name}")
    if "fade master" in strategy_name.lower():
        fade_agents.append((agent_id, agent_name, strategy_id, strategy_name))

print(f"\nFound {len(fade_agents)} agents using Fade Master strategies:")
for fa in fade_agents:
    print(f"  {fa[1]} -> {fa[3]}")

# 2. Get all private strategies
strats_res = call_mcp("list_strategies", {"scope": "PRIVATE", "status": "ACTIVE"})
strats_data = extract_result(strats_res)
strats = strats_data.get("strategies", []) if strats_data else []

print("\nAvailable Unused Private Strategies:")
unused_strats = []
for s in strats:
    if s["id"] not in used_strategy_ids and "fade master" not in s["name"].lower():
        unused_strats.append(s)

for s in unused_strats[:10]:
    print(f"- {s['name']}")

if unused_strats:
    # Save to JSON for next step
    with open("fade_replace_plan.json", "w") as f:
        json.dump({
            "fade_agents": fade_agents,
            "available_strategies": unused_strats
        }, f)
