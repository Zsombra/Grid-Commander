import json
import urllib.request
import time

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"

strats_to_use = [
    ("DIST-01: ATR-Normalized", "f80bef6d-6a3e-4d36-9882-3ad202b69c57"),
    ("Contrarian Squeeze", "fe8e16c7-3add-47ef-aabc-737f3765e385"),
    ("VOL-02: Band Width Squeeze", "df18ef30-2ba1-44cb-87e3-3290fcc32044"),
    ("SQZ-03: Stalling OI CVD", "c5984f71-e97b-42d7-84ca-6c2b2ca0e0f8"),
    ("Iron Fang", "c4252aaa-a5c6-4dae-833c-67a0c7bf683b"),
    ("TRAJ-03: MACD Hist Accel", "bd1fc858-7bfe-4f6a-adaf-b0103ca45dbd"),
    ("Velocity Mean Reversion", "b515649c-4608-4809-8906-ccce9ccdaee7"),
    ("Fade Master", "b2dab00b-7bc3-42b5-a5b7-e9bdb4aff929"),
    ("ABS-01: Dual Oscillator", "a2d28f52-3aee-4dab-a2e9-7d3951c4445f"),
    ("Confluence Multi-Factor", "97183604-c9b1-4aa4-bbeb-cc695425c587"),
    ("ABS-02: Extreme Money Flow", "95213630-ae6d-498b-8faa-65716737ceaf"),
    ("TRAJ-01: Price-RSI Divergence", "8fe2a6f3-45c0-462a-81d6-bcd4b0e6d043"),
    ("ZSCORE-03: PPO Z-Score", "7fdf521e-9b48-49dd-8e04-1cefdcfede41"),
    ("Flow State", "7a1408b6-c751-43a7-91f0-f9dfe2c34de4"),
    ("SQZ-01: Positive Fund Fade", "6b820630-1f08-4529-8479-d8be8508ca4c"),
    ("SQZ-02: Negative Fund Bounce", "5c8010b4-3c31-4284-90fb-0c8422b40e99"),
    ("ZSCORE-02: OI Vol Z-Score", "5b156349-7920-4062-9de6-270c768249f7"),
    ("Granite Shield", "4d511c04-99a6-4a23-b521-b595bdd9a0c2"),
    ("ZSCORE-01: Funding Z-Score", "4893a91f-a373-4ad5-8310-3ed311963472"),
    ("VOL-01: BB %B Outer Breach", "44c1f769-1703-4703-b94f-09358e633ddf"),
    ("Apex", "3f780d99-6515-4bf5-a953-faa2af5382d7"),
    ("DIST-02: VWAP Snapback", "0bd6e443-5629-4a73-ae15-af5323fb68f1")
]

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
    try:
        return json.loads(txt)
    except:
        return None

agents_res = call_mcp("list_intelligence_agents", {})
agents_data = extract_result(agents_res)
existing_agents = agents_data.get("agents", []) if agents_data else []
used_strat_ids = {a.get("strategyId") for a in existing_agents}
used_slots = len(existing_agents)
to_create = 24 - used_slots

print(f"Current agents: {used_slots}. Will create {to_create} agents...")
created = 0

for name, strat_id in strats_to_use:
    if created >= to_create: break
    if strat_id in used_strat_ids: continue
    
    agent_name = f"Fleet {name[:20]}"
    print(f"Creating agent: {agent_name}...")
    
    create_req = {
        "displayName": agent_name,
        "brain": {"kind": "PRESET", "preset": "MONTGOMERY"},
        "strategyId": strat_id,
        "tradingConfig": {
            "tradingMode": "FULL_EXECUTION",
            "minAllocationUsd": 50,
            "maxDailyTrades": 10,
            "balanceThresholdUsd": 10,
            "maxLeverage": 3,
            "maxSlippageBps": 50,
            "maxConcurrentExposureUsd": 50,
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
        created += 1
    time.sleep(1)

print("Fetching all agents for radar deployment...")
agents_res2 = call_mcp("list_intelligence_agents", {})
agents_data2 = extract_result(agents_res2)
all_agents = agents_data2.get("agents", [])

slots = []
for idx, a in enumerate(all_agents):
    slots.append({
        "agentId": a.get("id"),
        "minConviction": None,
        "priority": idx + 1,
        "isDefault": True,
        "conditions": []
    })

print("Fetching top ranked coins...")
coins_res = call_mcp("get_top_ranked_coins", {"metric": "volume", "interval": "1h", "limit": 10})
coins_data = extract_result(coins_res)
coins = coins_data.get("coins", []) if coins_data else []

print(f"Deploying to radar for {len(coins)} coins...")
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
    r = call_mcp("upsert_radar_deployment", radar_req)
    if r.get("error") or r.get("result", {}).get("isError"):
        print(f"  Failed on {coin_id}:", r)
    time.sleep(1)

print("Done! Fleet is fully deployed on the radar.")
