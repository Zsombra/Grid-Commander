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

targets = [
    "iron fang",
    "granite shield",
    "flow state",
    "dunkirk",
    "contrarian squeeze",
    "apex",
    "confluence",
    "velocity"
]

to_archive = []
for a in agents:
    name = a.get("displayName", "").lower()
    for t in targets:
        if t in name:
            to_archive.append(a)
            break

print(f"Found {len(to_archive)} agents to archive.")
for a in to_archive:
    print(f"Archiving {a['displayName']} (id {a['id']})...")
    ag_res = call_mcp('get_intelligence_agent', {'agentId': a['id']})
    ag_full = json.loads(ag_res['result']['content'][0]['text']).get('agent', {})
    res = call_mcp('archive_intelligence_agent', {'agentId': a['id'], 'expectedRevision': ag_full.get('revision', 1)})
    if res.get("error") or res.get("result", {}).get("isError"):
        print("Error:", res)
    else:
        print("Archived!")
