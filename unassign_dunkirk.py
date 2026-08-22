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

preset_id = '7f7d6e0b-03c5-4132-9ee7-5ee97d220e0f'
dunkirk_id = 'dc8776cd-ef43-445f-be00-50159986904b'

# Get current policy
pol_res = call_mcp('get_deployment_policy', {'presetId': preset_id})
pol_data = pol_res.get('result', {}).get('content', [{}])[0].get('text', '{}')
policy = json.loads(pol_data).get('policy', {})

slots = policy.get('slots', [])
print(f"Current slots for {preset_id}: {len(slots)}")

# Filter out Dunkirk
new_slots = [s for s in slots if s.get('agentId') != dunkirk_id]

# Remove extra fields from slots that upsert doesn't accept
# Let's just keep the necessary ones based on what is returned or expected.
# Actually, delete_deployment_policy is easier! Is there another agent in this preset?
if len(new_slots) == 0 and len(slots) > 0:
    print("Deleting policy completely since it will be empty")
    # Actually just call delete_deployment_policy
    call_mcp('delete_deployment_policy', {'presetId': preset_id, 'confirm': True})
else:
    # We might need to map them properly. Let's just delete the whole policy if it's an old preset (ALPHA TRADFI is presetIsActive=false anyway!)
    print("Deleting policy")
    res = call_mcp('delete_deployment_policy', {'presetId': preset_id, 'confirm': True})
    print(res)
