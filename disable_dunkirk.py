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

dunkirk_id = 'dc8776cd-ef43-445f-be00-50159986904b'
ag_res = call_mcp('get_intelligence_agent', {'agentId': dunkirk_id})
ag_full = json.loads(ag_res['result']['content'][0]['text']).get('agent', {})
rev = ag_full.get('revision', 1)

cfg = ag_full.get('tradingConfig', {})
cfg['tradingMode'] = 'OFF'

if 'strategyTimeframe' in cfg: del cfg['strategyTimeframe']
if 'regimeTimeframe' in cfg: del cfg['regimeTimeframe']

update_res = call_mcp('update_intelligence_agent', {'agentId': dunkirk_id, 'expectedRevision': rev, 'tradingConfig': cfg})
print("Update to OFF:", update_res)

# Then we just rename it to something like "[ARCHIVED] Fleet Dunkirk"
ag_res2 = call_mcp('get_intelligence_agent', {'agentId': dunkirk_id})
ag_full2 = json.loads(ag_res2['result']['content'][0]['text']).get('agent', {})
rev2 = ag_full2.get('revision', rev + 1)
call_mcp('update_intelligence_agent', {'agentId': dunkirk_id, 'expectedRevision': rev2, 'displayName': '[ARCHIVED] Dunkirk'})

