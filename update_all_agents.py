import json
import urllib.request
import time

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
    try:
        return json.loads(txt)
    except:
        return None

agents_res = call_mcp("list_intelligence_agents", {})
agents_data = extract_result(agents_res)
agents = agents_data.get("agents", []) if agents_data else []

print(f"Updating {len(agents)} agents...")

for idx, agent in enumerate(agents):
    agent_id = agent["id"]
    agent_name = agent.get("displayName", "Unknown")
    
    # get specific agent to ensure we have the latest revision and full config
    get_res = call_mcp("get_intelligence_agent", {"agentId": agent_id})
    get_data = extract_result(get_res)
    if not get_data or not get_data.get("agent"):
        print(f"Skipping {agent_name}: Could not fetch")
        continue
    
    full_agent = get_data["agent"]
    rev = full_agent.get("revision", 1)
    t_config = full_agent.get("tradingConfig", {})
    
    # Strip readonly fields
    t_config.pop("strategyTimeframe", None)
    t_config.pop("regimeTimeframe", None)
    
    # Apply Risk Management rules
    t_config["minAllocationUsd"] = 10
    t_config["maxDailyTrades"] = 100
    t_config["balanceThresholdUsd"] = 35
    t_config["maxLeverage"] = 5
    t_config["maxSlippageBps"] = 150
    t_config["maxConcurrentExposureUsd"] = 45
    t_config["maxCumulativeDrawdownUsd"] = 5
    t_config["maxDailyLossUsd"] = 1.25
    
    if "positionSizePresets" not in t_config:
        t_config["positionSizePresets"] = {}
    t_config["positionSizePresets"]["sizingStrategy"] = "MANUAL"
    t_config["positionSizePresets"]["smallPct"] = 10
    t_config["positionSizePresets"]["mediumPct"] = 12
    t_config["positionSizePresets"]["largePct"] = 15
    
    # Ensure mandatory fields are present
    if "tradingMode" not in t_config: t_config["tradingMode"] = "FULL_EXECUTION"
    if "signalTimeoutMinutes" not in t_config: t_config["signalTimeoutMinutes"] = 5
    if "maxEntryDeviationAtrMultiple" not in t_config: t_config["maxEntryDeviationAtrMultiple"] = 0.5
    if "minTradeConviction" not in t_config: t_config["minTradeConviction"] = 0.5
    if "gridMinConfidence" not in t_config: t_config["gridMinConfidence"] = 0.5
    if "positionManagement" not in t_config: 
        t_config["positionManagement"] = {
            "positionManagementPreset": "BERETTA",
            "enabled": True,
            "breakEvenEnabled": True,
            "breakEvenTriggerR": 1.0,
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
    
    update_req = {
        "agentId": agent_id,
        "expectedRevision": rev,
        "brainPreset": "CUSTOM",
        "modelId": "z-ai/glm-5.2",
        "tradingConfig": t_config
    }
    
    print(f"[{idx+1}/{len(agents)}] Updating {agent_name}...")
    update_res = call_mcp("update_intelligence_agent", update_req)
    if update_res.get("error") or update_res.get("result", {}).get("isError"):
        print(f"Failed to update {agent_name}:", update_res)
    
    time.sleep(1)

print("Done updating all agents!")
