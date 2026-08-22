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

agents_res = call_mcp("list_intelligence_agents", {})
txt = agents_res.get("result", {}).get("content", [{}])[0].get("text", "{}")
agents = json.loads(txt).get("agents", [])
used = set(a.get("strategyId") for a in agents)

strats_res = call_mcp("list_strategies", {"scope": "PRIVATE", "status": "ACTIVE"})
txt2 = strats_res.get("result", {}).get("content", [{}])[0].get("text", "{}")
strats = json.loads(txt2).get("strategies", [])

unused = [s for s in strats if s["id"] not in used]
print("All Unused Strategies:")
for s in unused:
    print(s["name"], s["id"])
