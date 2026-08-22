import json
import urllib.request
from collections import defaultdict

key = 'bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs'
url = 'https://mcp.battlegrid.trade/mcp'
headers = {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}

def call_mcp(method, args):
    body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': method, 'arguments': args}}).encode()
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

res = call_mcp('list_intelligence_agents', {})
agents = json.loads(res['result']['content'][0]['text']).get('agents', [])

res2 = call_mcp('list_strategies', {})
strats = {s['id']: s['name'] for s in json.loads(res2['result']['content'][0]['text']).get('strategies', [])}

strat_to_agents = defaultdict(list)
for a in agents:
    if a.get('tradingConfig', {}).get('tradingMode') != 'OFF':
        strat_name = strats.get(a['strategyId'], 'Unknown Strategy')
        strat_to_agents[strat_name].append(a['displayName'])

print('Agents per strategy:')
for strat, ags in strat_to_agents.items():
    print(f"{strat} ({len(ags)} agents):")
    for ag in ags:
        print(f"  - {ag}")
