import json
with open('strategies_dump.json', encoding='utf-8') as f:
    data = json.load(f)
strategies = data.get('strategies', [])
priv = [s for s in strategies if s.get('scope') == 'PRIVATE']
print(f"Found {len(priv)} PRIVATE strategies.")
for s in priv:
    print(f"- {s.get('name')} (ID: {s.get('id')}) | Active: {s.get('isActive')}")
