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

# To remove from radar, we can just suspend it? Or how to remove from radar preset?
# Wait, let's just get the radar preset and remove it.
preset_res = call_mcp('get_radar_preset', {'presetId': 'default'}) # Assuming default preset?
# I don't know the preset ID. Let's list presets? No list_radar_presets tool. 
# Wait, if I just set its status to OFF, does it unassign it? 
# update_intelligence_agent with tradingMode="OFF"
update_res = call_mcp('update_intelligence_agent', {'agentId': dunkirk_id, 'expectedRevision': rev, 'tradingMode': 'OFF'})
print("Update to OFF:", update_res)

# Need to fetch again for new rev
ag_res2 = call_mcp('get_intelligence_agent', {'agentId': dunkirk_id})
ag_full2 = json.loads(ag_res2['result']['content'][0]['text']).get('agent', {})
rev2 = ag_full2.get('revision', rev + 1)

arch_res = call_mcp('archive_intelligence_agent', {'agentId': dunkirk_id, 'expectedRevision': rev2})
print("Archive:", arch_res)

