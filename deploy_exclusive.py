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

print("Fetching top 36 coins...", flush=True)
coins_res = call_mcp("get_top_ranked_coins", {"metric": "volume", "interval": "1h", "limit": 36})
coins_data = extract_result(coins_res)
coins = coins_data.get("coins", []) if coins_data else []
coin_map = {c['ticker']: c['ticker'] for c in coins}
coin_tickers = list(coin_map.keys())

agents_res = call_mcp("list_intelligence_agents", {})
agents_data = extract_result(agents_res)
all_agents = agents_data.get("agents", []) if agents_data else []
active_agents = [a for a in all_agents if a.get("tradingConfig", {}).get("tradingMode") != "OFF"]

print(f"Evaluating {len(active_agents)} agents...", flush=True)

def chunk_list(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

# Track best agent per coin: {coin_ticker: {'agentId': id, 'score': val, 'atr': val}}
coin_best_agent = {ticker: {'agentId': None, 'score': -1, 'atr': -1} for ticker in coin_tickers}

for agent in active_agents:
    agent_id = agent['id']
    agent_name = agent['displayName']
    print(f"Evaluating {agent_name}...", flush=True)
    
    for batch in chunk_list(coin_tickers, 12):
        qual_res = call_mcp('get_agent_coin_qualification', {'agentId': agent_id, 'coinTickers': batch})
        if qual_res.get('error') or qual_res.get('result', {}).get('isError'):
            continue
            
        data = qual_res.get('result', {}).get('structuredContent', {})
        verdicts = data.get('verdicts', [])
        
        for v in verdicts:
            ticker = v['coinTicker']
            score = v.get('gates', {}).get('aggregateScore', {}).get('scorePercent', 0)
            atr = v.get('gates', {}).get('atrVolatility', {}).get('atrPct', 0)
            
            # Update if better
            current_best = coin_best_agent[ticker]
            if score > current_best['score'] or (score == current_best['score'] and atr > current_best['atr']):
                coin_best_agent[ticker] = {'agentId': agent_id, 'score': score, 'atr': atr, 'name': agent_name}
                
        time.sleep(1)

print("\nDeploying to radar...", flush=True)
for ticker, best in coin_best_agent.items():
    if not best['agentId']:
        continue
    
    print(f"Assigning {ticker} to {best['name']} (Score: {best['score']}, ATR: {best['atr']})", flush=True)
    
    radar_req = {
        "coinId": ticker,
        "request": {
            "deploymentTimeframe": "1h",
            "enabled": True,
            "slots": [{
                "agentId": best['agentId'],
                "minConviction": None,
                "priority": None,
                "isDefault": True,
                "conditions": []
            }],
            "expectedRevision": None
        }
    }
    r = call_mcp("upsert_radar_deployment", radar_req)
    if r.get("error") or r.get("result", {}).get("isError"):
        print("  Failed:", r, flush=True)
    time.sleep(1)

print("\nFinished deploying exclusively!", flush=True)
