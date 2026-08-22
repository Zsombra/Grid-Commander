import urllib.request
import json

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"
body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode()
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
                    try:
                        data = json.loads(line[5:].strip())
                        print([t["name"] for t in data["result"]["tools"]])
                    except Exception as e:
                        pass
        else:
            data = json.loads(content)
            print([t["name"] for t in data["result"]["tools"]])
except Exception as e:
    print(f"Error: {e}")
