import json
import urllib.request
key = 'bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs'

def call_mcp(name, arguments):
    body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}).encode()
    req = urllib.request.Request('https://mcp.battlegrid.trade/mcp', data=body, headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    with urllib.request.urlopen(req) as r:
        txt = r.read().decode()
        for line in txt.split("\n"):
            if line.startswith("data:"):
                try: return json.loads(line[5:].strip())
                except: pass
        return json.loads(txt)

agents_res = call_mcp('list_intelligence_agents', {})
txt = agents_res.get('result', {}).get('content', [{}])[0].get('text', '{}')
agents = json.loads(txt).get('agents', [])
for a in agents:
    if 'fade master' in a.get('strategyName', '').lower():
        print(f"Archiving {a['displayName']} (id {a['id']})...")
        ag_res = call_mcp('get_intelligence_agent', {'agentId': a['id']})
        ag_full = json.loads(ag_res['result']['content'][0]['text']).get('agent', {})
        call_mcp('archive_intelligence_agent', {'agentId': a['id'], 'expectedRevision': ag_full.get('revision', 1)})
        print('Archived!')
