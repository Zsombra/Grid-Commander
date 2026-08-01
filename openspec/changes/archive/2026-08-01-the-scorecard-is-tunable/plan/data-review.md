# Data Review — the-scorecard-is-tunable

| Check | Result | Evidence |
|---|---|---|
| Wire shape vs declared schema | PASS | payload-conformance case `update_strategy_signal_rule` — the ENVELOPED wrap, uuid strategyId, revision ≥ 1, allocation in 0–3, params object |
| ENVELOPED membership | PASS | mcp-conformance updated: three called `request`-envelope tools, all wrapped |
| Params sent only when declared | PASS | adapter spreads `params` conditionally; unit test pins its absence |
| Values digest = wire values | PASS | `intentRecord` is the single shape both the mint and the spend digest; perform test compares payload and target against the same literal |
| Response not over-read | PASS | pass-through opaque (DL-5/design D5); the surface proves the write by the redirect's fresh read — live: allocation 0→1, r1→r2 read back |
