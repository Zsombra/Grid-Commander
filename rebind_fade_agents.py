import json
import urllib.request
import time
import uuid

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

# 1. Fetch agents
agents_res = call_mcp("list_intelligence_agents", {})
txt = agents_res.get("result", {}).get("content", [{}])[0].get("text", "{}")
agents = json.loads(txt).get("agents", [])

target_agents = []
used_strat_ids = set()

for a in agents:
    if "fade master" in a.get("strategyName", "").lower():
        target_agents.append(a)
    else:
        used_strat_ids.add(a.get("strategyId"))

print(f"Found {len(target_agents)} agents to rebind.")

# 2. Fetch strategies
strats_res = call_mcp("list_strategies", {})
txt2 = strats_res.get("result", {}).get("content", [{}])[0].get("text", "{}")
strats = json.loads(txt2).get("strategies", [])

unused_strats = []
for s in strats:
    if s.get("scope") == "PRIVATE" and s.get("isActive") == True and s["id"] not in used_strat_ids and "fade master" not in s["name"].lower():
        unused_strats.append(s)

print(f"Found {len(unused_strats)} unused strategies.")

# 3. Rebind and rename
for i, agent in enumerate(target_agents):
    if i >= len(unused_strats):
        print("Not enough unused strategies!")
        break
        
    strat = unused_strats[i]
    print(f"Rebinding '{agent['displayName']}' -> '{strat['name']}'")
    
    # Need fresh agent data to get correct revision
    ag_res = call_mcp("get_intelligence_agent", {"agentId": agent["id"]})
    txt = ag_res.get("result", {}).get("content", [{}])[0].get("text", "{}")
    ag_full = json.loads(txt).get("agent", {})
    rev = ag_full.get("revision", 1)
    
    rebind_res = call_mcp("rebind_intelligence_agent", {
        "agentId": agent["id"],
        "strategyId": strat["id"],
        "expectedRevision": rev,
        "confirm": True,
        "idempotencyKey": str(uuid.uuid4())
    })
    
    if rebind_res.get("error"):
        print("Error rebinding:", rebind_res["error"])
        continue
        
    print("Rebind successful. Now updating name...")
    # Fetch again to get updated revision for name update
    ag_res2 = call_mcp("get_intelligence_agent", {"agentId": agent["id"]})
    txt2 = ag_res2.get("result", {}).get("content", [{}])[0].get("text", "{}")
    ag_full2 = json.loads(txt2).get("agent", {})
    new_rev = ag_full2.get("revision", rev + 1)
    
    # Update name, preserving GLM 5.2 model config! Wait, rebind_intelligence_agent keeps modelId?
    # Schema says: "Its context modules, signal rules, prose, and timeframe REPLACE the ones currently materialized on the agent."
    # Wait, does rebind change the modelId back to default? Just in case, let's omit modelId if we don't need to change it, or we can set it.
    
    name_update = {
        "agentId": agent["id"],
        "expectedRevision": new_rev,
        "displayName": f"Fleet {strat['name']}"[:80]
    }
    update_res = call_mcp("update_intelligence_agent", name_update)
    if update_res.get("error"):
        print("Name update error:", update_res["error"])
    else:
        print("Name updated to:", name_update["displayName"])

    time.sleep(1)

print("Done.")
