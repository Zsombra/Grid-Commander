import json
import urllib.request
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"

def call_mcp(name, arguments):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": name, "arguments": arguments}}).encode()
    req = urllib.request.Request("https://mcp.battlegrid.trade/mcp", data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    })
    try:
        with urllib.request.urlopen(req) as r:
            content = r.read().decode()
            if content.startswith("event:"):
                for line in content.split("\n"):
                    if line.startswith("data:"):
                        try: return json.loads(line[5:].strip())
                        except: pass
            else:
                return json.loads(content)
    except Exception as e:
        print(f"Error calling {name}: {e}")
    return {}

def extract_result(res):
    if res.get("error"):
        print("Error:", res["error"])
        return None
    txt = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
    try: return json.loads(txt)
    except: return None

strategies_to_create = [
    {
        "name": "MATH-C8: Perp-Spot Basis",
        "sections": ["includePriceAction", "includePerpSpotFlow"],
        "conditions": [],
        "rules": [
            {"signalId": "flow_perp_spot_bull_divergence", "allocation": 3, "required": False},
            {"signalId": "flow_perp_spot_bear_divergence", "allocation": 3, "required": False}
        ]
    },
    {
        "name": "MATH-C10: Funding & Crowding Fade",
        "sections": ["includePriceAction", "includeFundingRates"],
        "conditions": [],
        "rules": [
            {"signalId": "funding_extreme_negative", "allocation": 3, "required": False},
            {"signalId": "funding_extreme_positive", "allocation": 3, "required": False}
        ]
    },
    {
        "name": "MATH-C13: Crowd Fade",
        "sections": ["includePriceAction", "includeCrowdIntelligence"],
        "conditions": [],
        "rules": [
            {"signalId": "volatility_atr_expanding", "allocation": 1, "required": False}
        ]
    }
]

created_strats = []

print("Creating 8 new strategies...")
for strat in strategies_to_create:
    sections_payload = [{"kind": "platform", "sectionKey": s} for s in strat['sections']]
    req = {
        "request": {
            "operation": "CREATE",
            "intentSummary": f"Creating {strat['name']} based on mathematical family.",
            "assumptions": ["Assuming standard configuration."],
            "coinSelection": {"mode": "ranked", "limit": 25, "category": "CRYPTO"},
            "name": strat['name'],
            "timeframe": "1h",
            "minAggregateScore": 0.65,
            "minRequiredCount": 0,
            "sections": sections_payload,
            "conditions": strat['conditions'],
            "rules": strat['rules']
        }
    }
    print(f"Compiling {strat['name']}...")
    res = call_mcp("compile_strategy_plan", req)
    data = extract_result(res)
    strategy_id = data.get("approvedPlan", {}).get("postState", {}).get("id") if data else None
    
    if strategy_id and "planToken" in data:
        import base64
        import datetime
        planToken = data["planToken"]
        token_payload = json.loads(base64.b64decode(planToken.split('.')[1] + '==').decode())
        expiresAt = datetime.datetime.fromtimestamp(token_payload['expiresAtEpochMs']/1000, tz=datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
        
        postState = data["approvedPlan"]["postState"]
        plan = postState.copy()
        plan['operation'] = 'CREATE'
        plan['strategyId'] = plan.pop('id')
        plan['expiresAt'] = expiresAt
        plan['rules'] = plan.pop('signalRules')
        
        # Remove unrecognized keys
        plan.pop('scope', None)
        plan.pop('systemKey', None)
        plan.pop('visibility', None)
        plan.pop('cadence', None)
        plan.pop('regimeTimeframe', None)
        plan.pop('forkedFromStrategyId', None)
        plan.pop('isActive', None)
        plan.pop('createdAt', None)
        plan.pop('updatedAt', None)
        plan.pop('revision', None)
        plan.pop('boundAgentCount', None)
        plan.pop('openPositionCount', None)
        plan.pop('ownerUserId', None)
        
        print(f"Applying plan for {strat['name']} (ID: {strategy_id})...")
        apply_res = call_mcp("apply_strategy_plan", {
            "request": {
                "plan": plan,
                "planToken": planToken,
                "confirm": True
            }
        })
        print("APPLY RES:", apply_res)
        created_strats.append((strat['name'], strategy_id))
    else:
        print(f"Failed to compile {strat['name']}: {repr(res)}")
    time.sleep(2)

print("\nCreated strategies:")
for name, sid in created_strats:
    print(f"- {name}: {sid}")

print("\nCreating 8 new agents...")
created_agents = []
for name, strat_id in created_strats:
    agent_name = f"Fleet {name.split(':')[0]}"
    print(f"Creating agent: {agent_name}...")
    create_req = {
        "displayName": agent_name,
        "brain": {"kind": "PRESET", "preset": "MONTGOMERY"},
        "strategyId": strat_id,
        "tradingConfig": {
            "tradingMode": "FULL_EXECUTION",
            "minAllocationUsd": 50,
            "maxDailyTrades": 4,
            "balanceThresholdUsd": 10,
            "maxLeverage": 5,
            "maxSlippageBps": 50,
            "maxConcurrentExposureUsd": 45,
            "maxCumulativeDrawdownUsd": 25,
            "maxDailyLossUsd": 15,
            "signalTimeoutMinutes": 5,
            "maxEntryDeviationAtrMultiple": 0.5,
            "minTradeConviction": 0.5,
            "gridMinConfidence": 0.5,
            "positionSizePresets": {
                "sizingStrategy": "MANUAL",
                "smallPct": 10,
                "mediumPct": 25,
                "largePct": 50
            },
            "positionManagement": {
                "positionManagementPreset": "BERETTA",
                "enabled": True,
                "breakEvenEnabled": True,
                "breakEvenTriggerR": 1,
                "trailingEnabled": True,
                "trailingGivebackPct": 30,
                "trailingBufferPct": 0.1,
                "timeDecayEnabled": True,
                "timeDecayGracePeriodMinutes": 60,
                "timeDecayIntervalMinutes": 15,
                "timeDecayTightenPct": 5,
                "timeDecayMaxTightenPct": 50,
                "timeDecayStaleThresholdTpProgressPct": 25
            }
        }
    }
    res = call_mcp("create_intelligence_agent", create_req)
    if res.get("error") or res.get("result", {}).get("isError"):
        print("Failed to create agent:", res)
    else:
        created_agents.append(agent_name)
        print(f"Success: {agent_name}")
    time.sleep(2)

print("\nFetching all agents for radar deployment...")
agents_res = call_mcp("list_intelligence_agents", {})
agents_data = extract_result(agents_res)
all_agents = agents_data.get("agents", []) if agents_data else []

active_agents = [a for a in all_agents if a.get("tradingConfig", {}).get("tradingMode") != "OFF"]
print(f"Total active agents: {len(active_agents)}")

slots = []
for idx, a in enumerate(active_agents):
    slots.append({
        "agentId": a.get("id"),
        "minConviction": None,
        "priority": idx + 1,
        "isDefault": True,
        "conditions": []
    })

print("\nFetching top ranked coins...")
coins_res = call_mcp("get_top_ranked_coins", {"metric": "volume", "interval": "1h", "limit": 10})
coins_data = extract_result(coins_res)
coins = coins_data.get("coins", []) if coins_data else []

print(f"\nDeploying {len(active_agents)} agents to radar for {len(coins)} coins...")
for coin in coins:
    coin_id = coin.get("id")
    if not coin_id: continue
    
    print(f"Deploying fleet to radar for {coin_id}...")
    radar_req = {
        "coinId": coin_id,
        "request": {
            "deploymentTimeframe": "1h",
            "enabled": True,
            "slots": slots,
            "expectedRevision": None
        }
    }
    r = call_mcp("upsert_deployment_policy", radar_req)
    if r.get("error") or r.get("result", {}).get("isError"):
        print(f"  Failed on {coin_id} using upsert_deployment_policy. Falling back to upsert_radar_deployment...")
        r2 = call_mcp("upsert_radar_deployment", radar_req)
        if r2.get("error") or r2.get("result", {}).get("isError"):
            print(f"  Failed fallback on {coin_id}:", r2)
    time.sleep(1)

print("\nDone! Mathematical fleet is fully deployed.")
