import urllib.request
import json
import sys

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

print("Getting strategies...")
res = call_mcp("list_strategies", {"limit": 50, "scope": "PRIVATE", "status": "ACTIVE"})
print(res)

print("Getting top coins...")
res_coins = call_mcp("get_top_ranked_coins", {"category": "L1", "limit": 5})
txt_coins = res_coins.get("result", {}).get("content", [{}])[0].get("text", "{}")
print(txt_coins[:200])

print("Getting existing agents...")
res_ag = call_mcp("list_intelligence_agents", {})
txt_ag = res_ag.get("result", {}).get("content", [{}])[0].get("text", "{}")
ag_data = json.loads(txt_ag)
print(f"Found {len(ag_data.get('agents', []))} agents.")
