import json
import urllib.request
import time

key = "bg_live_hfGImVbGeAClv1FQH6-L2nP971Ydybsp3KKjtMUlLZs"
agent_id = "2e3e08cd-e12b-4400-aa0f-11e3d3b6f1a5"
rev = 1

def try_model(model_id):
    req_body = {
        "agentId": agent_id,
        "expectedRevision": rev,
        "brainPreset": "CUSTOM",
        "modelId": model_id
    }
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "update_intelligence_agent", "arguments": req_body}}).encode()
    req = urllib.request.Request("https://mcp.battlegrid.trade/mcp", data=body, headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    })
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            if res.get("error"):
                return False, res["error"]
            txt = res.get("result", {}).get("content", [{}])[0].get("text", "{}")
            if "VALIDATION_ERROR" in txt:
                return False, txt
            if "CONFLICT" in txt:
                # Conflict means revision mismatch, but model is valid!
                return True, "Valid!"
            return True, "Valid!"
    except Exception as e:
        pass
    return False, "Error"

models_to_test = [
    "chatglm", "zhipu/glm-4", "zhipu/glm-4v", "glm-4", "xai/grok-1.5",
    "anthropic/claude-3.5-sonnet", "anthropic/claude-3-5-sonnet", "claude-3-5-sonnet-20240620",
    "google/gemini-1.5-pro", "gemini-1.5-pro-preview-0514", "google/gemini-1.5-flash",
    "openai/gpt-4o", "meta-llama/llama-3-70b",
    "xai/grok-2", "xai/grok-2-mini"
]

print("Testing models...")
for m in models_to_test:
    valid, msg = try_model(m)
    if valid:
        print(f"[OK] {m}")
    else:
        if "approved model" not in msg:
            print(f"[??] {m} -> {msg}")
    time.sleep(0.5)
