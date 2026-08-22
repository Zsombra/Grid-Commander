import urllib.request
import json
import sys

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"
body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode()
req = urllib.request.Request("https://mcp.battlegrid.trade/mcp", data=body, headers={
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
})

tools_data = None
try:
    with urllib.request.urlopen(req) as r:
        content = r.read().decode()
        if content.startswith("event:"):
            for line in content.split("\n"):
                if line.startswith("data:"):
                    try:
                        tools_data = json.loads(line[5:].strip())
                    except:
                        pass
        else:
            tools_data = json.loads(content)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

if not tools_data:
    sys.exit(1)

tools = tools_data.get("result", {}).get("tools", [])

target_tools = [
    "list_strategies",
    "get_top_ranked_coins"
]

with open("tool_schemas.txt", "w", encoding="utf-8") as f:
    for t in tools:
        if t["name"] in target_tools:
            f.write(f"\n=== {t['name']} ===\n")
            f.write(json.dumps(t.get("inputSchema", {}), indent=2))
