import json
import urllib.request

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"
body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}).encode()
req = urllib.request.Request("https://mcp.battlegrid.trade/mcp", data=body, headers={
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
})
try:
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
        tools = data.get("result", {}).get("tools", [])
        for t in tools:
            if t["name"] == "update_intelligence_agent":
                with open("update_agent_schema.json", "w") as f:
                    json.dump(t, f, indent=2)
                print("Saved update_intelligence_agent schema")
            elif "agent" in t["name"]:
                print("Found agent tool:", t["name"])
except Exception as e:
    print(f"Error: {e}")
