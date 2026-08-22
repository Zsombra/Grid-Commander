import json
import urllib.request

key = 'bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs'
url = 'https://mcp.battlegrid.trade/mcp'
headers = {'Authorization': f'Bearer ' + key, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}

def call_mcp(method, args):
    body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': method, 'arguments': args}}).encode()
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

res = call_mcp('list_intelligence_agents', {})
agents = json.loads(res['result']['content'][0]['text'])['agents']
active_strategy_ids = set([a['strategyId'] for a in agents])

res2 = call_mcp('list_strategies', {})
strats = json.loads(res2['result']['content'][0]['text'])['strategies']

archived_count = 0
for s in strats:
    if s.get('isActive') and s['id'] not in active_strategy_ids:
        print('Archiving ' + s['name'] + ' (ID: ' + s['id'] + ')...')
        try:
            res = call_mcp('archive_strategy', {'strategyId': s['id']})
            print('Response: ' + str(res))
            archived_count += 1
        except Exception as e:
            print('Failed to archive ' + s['name'] + ': ' + str(e))

print('Archived ' + str(archived_count) + ' unused strategies.')
