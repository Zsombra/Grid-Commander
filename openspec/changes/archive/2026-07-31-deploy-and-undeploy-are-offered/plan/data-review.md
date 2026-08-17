# Data Review
Contract map: N/A (no DB contract changes; wire payloads only).
| Rule | Status | Evidence |
|---|---|---|
| Upsert payload ⊆ closed accepted sets, all required paths | PASS | `payload-conformance.test.ts` case mirrors the adapter's composition; live proof: HYPE upsert accepted 2026-07-31 (r1→r2). The live schema also demands `expectedRevision > 0`, a constraint the recorded artifact cannot carry — noted in the test |
| Delete payload exact {coinId, confirm:true, expectedRevision} | PASS | `payload-conformance.test.ts` case; NOT live-walked (DL-4: nothing safe to delete — creation impossible) |
| Timeframes from runtime schema, no baked list | PASS | `deploymentTimeframes()` walks `discoverTools()` → upsert schema enum; empty ⇒ describe refuses; live probe read 13 values 2026-07-31 |
| Revision never invented | PASS | Mapper refuses a policy without `revision` (RadarPayloadError); describe refuses unoccupied coins (DL-3); expectedRevision always a fresh read's value |
