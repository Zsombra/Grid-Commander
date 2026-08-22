import json
import urllib.request
import sys

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"

def call_mcp_tool(name, arguments):
    body = json.dumps({
        "jsonrpc": "2.0", 
        "id": 1, 
        "method": "tools/call", 
        "params": {"name": name, "arguments": arguments}
    }).encode()
    
    req = urllib.request.Request(
        "https://mcp.battlegrid.trade/mcp",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode()
            if content.startswith("event:"):
                for line in content.split("\n"):
                    if line.startswith("data:"):
                        try:
                            parsed = json.loads(line[5:].strip())
                            return parsed.get("result", {}).get("content", [{}])[0].get("text", "{}")
                        except Exception as e:
                            pass
            else:
                parsed = json.loads(content)
                return parsed.get("result", {}).get("content", [{}])[0].get("text", "{}")
    except Exception as e:
        print(f"Error calling {name}: {e}")
    return "{}"

strategies_json = call_mcp_tool("list_strategies", {"includeInactive": True})
with open("strategies_dump.json", "w", encoding="utf-8") as f:
    f.write(strategies_json)

try:
    strategies_data = json.loads(strategies_json)
    strategies = strategies_data.get("strategies", [])
    print(f"Found {len(strategies)} strategies.")
    for s in strategies:
        print(f"- {s.get('displayName')} (ID: {s.get('id')}) | Status: {s.get('status')} | Scope: {s.get('scope')}")
except Exception as e:
    print(f"Failed to parse strategies: {e}")
