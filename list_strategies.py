import json
import urllib.request
key = 'bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs'
body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': 'list_strategies', 'arguments': {}}}).encode()
req = urllib.request.Request('https://mcp.battlegrid.trade/mcp', data=body, headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
with urllib.request.urlopen(req) as r:
    data = r.read().decode()
    if data.startswith("event:"):
        for line in data.split("\n"):
            if line.startswith("data:"):
                try: 
                    res = json.loads(line[5:].strip())
                    txt = res['result']['content'][0]['text']
                    strats = json.loads(txt)['strategies']
                    for s in strats:
                        print(f"{s['id']} | {s['name']} | {s['status']}")
                except Exception as e: pass
    else:
        res = json.loads(data)
        txt = res['result']['content'][0]['text']
        strats = json.loads(txt)['strategies']
        for s in strats:
            print(f"{s['id']} | {s['name']} | {s['status']}")
