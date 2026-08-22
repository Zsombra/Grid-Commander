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

agents_res = call_mcp('list_intelligence_agents', {})
txt = agents_res.get('result', {}).get('content', [{}])[0].get('text', '{}')
agents = json.loads(txt).get('agents', [])

used_strats = set(a.get('strategyId') for a in agents if a['id'] != dunkirk_id)

strats_res = call_mcp('list_strategies', {})
txt2 = strats_res.get('result', {}).get('content', [{}])[0].get('text', '{}')
strats = json.loads(txt2).get('strategies', [])

bad_keywords = ["iron fang", "granite shield", "flow state", "dunkirk", "contrarian squeeze", "apex", "confluence", "velocity", "fade master"]

unused_good = []
for s in strats:
    if s.get('scope') == 'PRIVATE' and s.get('isActive') and s['id'] not in used_strats:
        name_lower = s['name'].lower()
        if not any(b in name_lower for b in bad_keywords):
            unused_good.append(s)

print("Good unused strategies:", [s['name'] for s in unused_good])

if unused_good:
    target_strat = unused_good[0]
    print(f"Rebinding Dunkirk to {target_strat['name']}...")
    
    ag_res = call_mcp('get_intelligence_agent', {'agentId': dunkirk_id})
    ag_full = json.loads(ag_res['result']['content'][0]['text']).get('agent', {})
    rev = ag_full.get('revision', 1)
    
    rebind_res = call_mcp('rebind_intelligence_agent', {
        "agentId": dunkirk_id,
        "strategyId": target_strat["id"],
        "expectedRevision": rev,
        "confirm": True,
        "idempotencyKey": "rebind-dunkirk-456"
    })
    
    if rebind_res.get("error"):
        print("Rebind error:", rebind_res["error"])
    else:
        print("Rebound successfully!")
        
        # update name
        ag_res2 = call_mcp('get_intelligence_agent', {'agentId': dunkirk_id})
        ag_full2 = json.loads(ag_res2['result']['content'][0]['text']).get('agent', {})
        rev2 = ag_full2.get('revision', rev + 1)
        
        call_mcp('update_intelligence_agent', {
            "agentId": dunkirk_id,
            "expectedRevision": rev2,
            "displayName": f"Fleet {target_strat['name']}"[:80]
        })
        print("Renamed.")
else:
    # If no good strategy is available, we will just suspend it.
    print("No unused good strategy found.")
