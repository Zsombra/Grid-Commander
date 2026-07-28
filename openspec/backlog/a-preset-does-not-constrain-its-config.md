---
id: a-preset-does-not-constrain-its-config
title: A position-management preset is a label, not a configuration
type: question
status: open
priority: p2
created: 2026-07-28
updated: 2026-07-28
change: ""
capability: agent-authoring
blocked_by: []
tags: [battlegrid, agent-edit-form, ui]
---

# A position-management preset is a label, not a configuration

## What

Established against the live server. `tradingConfig.positionManagement` has
**15 required fields**: the fourteen behavioural values *and*
`positionManagementPreset` alongside them.

```
['breakEvenEnabled', 'breakEvenTriggerTpProgressPct', 'enabled',
 'positionManagementPreset', 'timeDecayEnabled',
 'timeDecayGracePeriodMinutes', 'timeDecayIntervalMinutes',
 'timeDecayMaxTightenPct', 'timeDecayStaleThresholdTpProgressPct',
 'timeDecayTightenPct', 'trailingAtrMultiple', 'trailingBufferPct',
 'trailingEnabled', 'trailingFixedPct', 'trailingType']
```

Nothing makes them agree. An agent may name `WALTHER` and carry values matching
no catalog preset at all. The preset is a label the caller supplies next to the
configuration, not a shorthand the server expands.

The enum is `COLT | WEBLEY | BERETTA | LUGER | WALTHER | CUSTOM` — six values,
where the catalog returns configurations for five. `CUSTOM` is the label for
"these fourteen values are mine".

Checked on a live agent: it names `WALTHER` and all 14 fields match the catalog's
WALTHER exactly. So divergence is *possible*, not *present* — on this account,
today.

## Why it matters

**`agent-edit-form` cannot be a preset dropdown.** The obvious form — one select
of five presets — cannot express fourteen independently settable numbers, and
cannot represent an agent that has drifted from the preset it names. A user who
picks `CUSTOM` must be given the fourteen fields, and a user editing an agent
must be shown the values it actually has rather than the preset it claims.

There is a display problem underneath the editing one: showing "WALTHER" for an
agent whose values are not WALTHER's is a lie the UI would tell confidently.
Whatever is built should compare the two and say so when they diverge.

**The create form already collects this and throws it away.**
`agent-form.tsx:83` renders a position-management select; the create action
sends `tradingConfig: null` (`app/(app)/agents/new/page.tsx:71`). The control
renders, the user picks a value, and nothing is sent. It is the same defect
class as `four-dead-write-paths` — an affordance with nothing behind it — one
level down, inside a form rather than at its submit.

## Fix

1. **Decide what the create form does with position management.** Either send a
   `tradingConfig` — which means the form must supply all ~20 required fields,
   not one — or remove the select until it can. Collecting a value that is
   discarded is worse than not asking.
2. **Build the edit surface from the fourteen fields**, with the preset as a
   selector that *populates* them rather than replacing them, and a visible note
   when current values differ from the named preset.
3. **Read the enum from the discovered schema**, including `CUSTOM`. The form
   currently hardcodes `<option value="CUSTOM">`. It is correct today, and it is
   correct by coincidence — the catalog's preset list does not contain it.

## Related

- `agent-edit-form` — this is the substance of that item, not a detail of it
- `trading-config-read-shape-is-not-write-shape` — the other trap in the same object
