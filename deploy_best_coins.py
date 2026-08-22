import json
import urllib.request
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')
key = 'bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs'
url = 'https://mcp.battlegrid.trade/mcp'
headers = {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'}

def call_mcp(method, args):
    body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': method, 'arguments': args}}).encode()
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req) as r:
        content = r.read().decode()
        if content.startswith("event:"):
            for line in content.split("\n"):
                if line.startswith("data:"):
                    try: return json.loads(line[5:].strip())
                    except: pass
        else:
            return json.loads(content)
    return {}

def extract_result(res):
    txt = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
    try: return json.loads(txt)
    except: return None

# 1. Get Top 36 Coins
print("Fetching top 36 coins...")
coins_res = call_mcp("get_top_ranked_coins", {"metric": "volume", "interval": "1h", "limit": 36})
coins_data = extract_result(coins_res)
coins = coins_data.get("coins", []) if coins_data else []
coin_map = {c['ticker']: c['ticker'] for c in coins}
coin_tickers = list(coin_map.keys())

print(f"Got {len(coin_tickers)} coins.")

# 2. Get All Active Agents
agents_res = call_mcp("list_intelligence_agents", {})
agents_data = extract_result(agents_res)
all_agents = agents_data.get("agents", []) if agents_data else []
active_agents = [a for a in all_agents if a.get("tradingConfig", {}).get("tradingMode") != "OFF"]

print(f"Evaluating {len(active_agents)} agents...")

def chunk_list(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

coin_deployments = {}

for agent in active_agents:
    agent_id = agent['id']
    agent_name = agent['displayName']
    print(f"\nEvaluating coins for {agent_name}...")
    
    scored_coins = []
    
    # Process in chunks of 12 (max for API)
    for batch in chunk_list(coin_tickers, 12):
        qual_res = call_mcp('get_agent_coin_qualification', {'agentId': agent_id, 'coinTickers': batch})
        if qual_res.get('error') or qual_res.get('result', {}).get('isError'):
            continue
            
        data = qual_res.get('result', {}).get('structuredContent', {})
        verdicts = data.get('verdicts', [])
        
        for v in verdicts:
            score = v.get('gates', {}).get('aggregateScore', {}).get('scorePercent', 0)
            atr = v.get('gates', {}).get('atrVolatility', {}).get('atrPct', 0)
            qualifies = v.get('qualifies', False)
            scored_coins.append({
                'ticker': v['coinTicker'],
                'score': score,
                'atr': atr,
                'qualifies': qualifies
            })
            
        time.sleep(1) # rate limit prevention
        
    # Sort coins: primarily by score descending, secondarily by atr descending
    scored_coins.sort(key=lambda x: (x['score'], x['atr']), reverse=True)
    
    top_10 = scored_coins[:10]
    top_10_tickers = [c['ticker'] for c in top_10]
    top_10_ids = [coin_map[t] for t in top_10_tickers]
    
    print(f"Top 10 selected for {agent_name}: {top_10_tickers}")
    
    for t_id in top_10_ids:
        if t_id not in coin_deployments:
            coin_deployments[t_id] = []
        coin_deployments[t_id].append(agent_id)

print("\nDeploying aggregated slots to radar...")
for coin_id, agent_ids in coin_deployments.items():
    slots = []
    for idx, aid in enumerate(agent_ids):
        slots.append({
            "agentId": aid,
            "minConviction": None,
            "priority": idx + 1,
            "isDefault": True,
            "conditions": []
        })
    
    radar_req = {
        "coinId": coin_id,
        "request": {
            "deploymentTimeframe": "1h",
            "enabled": True,
            "slots": slots,
            "expectedRevision": None
        }
    }
    r = call_mcp("upsert_radar_deployment", radar_req)
    time.sleep(1)

print("\nFinished deploying all agents to their best-correlated assets!")
