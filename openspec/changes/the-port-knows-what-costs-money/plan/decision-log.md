# Decision Log: The Port Knows What Costs Money

Entries are append-only. Every scope deviation, exception, risk and waiver gets
one. The auditor reads this for decision-log parity.

---

## PD-1 — The judgement already exists; this change gives it a second consumer

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **PLANNING** |
| Type | Scope correction, before planning |
| Decision | Do not invent a list of money-committing tools. Move the existing `WAGER_TOOLS` / `ANSWER_TOOLS` to one module and give it a runtime consumer |
| Impacted files | `tests/agent/wager.test.ts`, new `src/infrastructure/battlegrid/money-tools.ts` |
| Reason | The proposal's first draft asked the planner to decide where a new list should live. `tests/agent/wager.test.ts:79-88` has held exactly that judgement since `author-agents` on 2026-07-27 — eight forbidden names plus the released answer pair. It enforces *unreachability*; nothing carries it into the runtime, where it could drive *classification*. Inventing a second list would have created the drift this change exists to remove |
| Approved by | Operator, who asked for the scope to be adjusted before planning |
| Next action | Task 1.1. `wager.test.ts` imports the module rather than declaring its own copy, so A10 guards the same list the runtime reads |

---

## PD-2 — A10 puts the producer in the adapter, and the domain stays name-free

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **PLANNING** |
| Type | Location decision, settled rather than deferred |
| Decision | `rawDiscoverTools` in `src/infrastructure/battlegrid/mcp-adapter.ts` populates `declaredScope`; `src/domain/capability/classify.ts` names no tool |
| Impacted files | `mcp-adapter.ts`, `classify.ts`, `money-tools.ts` |
| Reason | The first draft framed this as a genuine tension between A10 (names only in `src/infrastructure/battlegrid/`) and the judgement belonging in the domain. It is not a tension: A10 half 1 forbids a `WAGER_TOOLS` name **anywhere** in `src/`/`app/`, so the domain option would violate it outright for eight tools. The adapter is also the only layer permitted to know tool names at all under P6, "one way in" |
| Approved by | Planner, on the checklist rule rather than on preference |
| Next action | Task 2.1–2.2. The domain keeps its existing shape: `tool.declaredScope ?? inferScope(...)` is unchanged, and the field simply acquires a value |

---

## PD-3 — `declaredScope` had no producer, and its comment said otherwise

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **PLANNING** |
| Type | Root cause |
| Decision | Giving `declaredScope` a producer **is** the fix. `inferScope` must stop claiming otherwise or be removed |
| Impacted files | `classify.ts:50`, `:61`, `:63`, `mcp-adapter.ts:387` |
| Reason | `DiscoveredTool.declaredScope` is declared (`tool-class.ts:56`) and read (`classify.ts:50`) and set by nothing. `rawDiscoverTools` maps name, description, annotations and `inputSchema` only. So `inferScope` always runs, and it returns `'mcp:read'` unconditionally — every known tool classifies as read scope, and the port's wager gate can fire only on the fail-closed `UNKNOWN_TOOL` path. `classify.ts:61` says *"tools that need wager authority say so, and are caught by `declaredScope`"*, describing a mechanism with no producer. **That sentence is why the hole survived four months of being read, including twice in one session by the author of this plan** |
| Approved by | Planner |
| Next action | Task 2.7. No comment may describe a mechanism that does not exist; the executor either deletes `inferScope` or rewrites its comment to say what actually happens |

---

## PD-4 — The audit records both claims and never rewrites history

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **PLANNING** |
| Type | Settled rather than deferred to the executor |
| Decision | The audit row carries **the platform's claim** and **this product's judgement** as separate facts. The badge renders ours. Existing rows are not backfilled |
| Impacted files | `audit-entry.ts`, `audit-repository.ts`, `db/schema/index.ts`, `drizzle-audit-repository.ts`, `audit-list.tsx`, a migration |
| Reason | The badge is presented as this product's statement about what it did to someone's account, so it must state our judgement. Replacing rather than recording would discard the platform's inverted claim, which is standing evidence of a real defect — and recording declared-versus-observed side by side is what this repository does everywhere else. **Backfill was rejected outright: an audit you edit is not an audit** |
| Approved by | Planner |
| Next action | Tasks 6.1–6.4, and the two-eras section of `plan/data-review.md`. The gate between phases D and E exists so the schema follows the behaviour it describes |

---

## PD-5 — Only reachable tools need runtime classification

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **PLANNING** |
| Type | Scope reduction |
| Decision | The runtime list names only tools the product can call. The eight forbidden ones stay protected structurally |
| Impacted files | `money-tools.ts` |
| Reason | A10 half 1 means a forbidden tool's name cannot appear in `src/`/`app/`, so the product cannot call it — **you cannot call what you cannot name**. Classifying them at runtime would require naming them, which would violate the guard that already protects them better than a classification would. The reachable set today is `accept_entry_decision` and `cancel_entry_decision`; it grows by one deliberate move per release, the way DL-10 of the approvals change did by hand |
| Approved by | Planner |
| Next action | Task 1.3 asserts the partition, so a tool cannot be in both sets or called while in neither |

---

## PD-6 — RISK: this tightens a guard on the live money path

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **PLANNING** |
| Type | Risk, accepted |
| Decision | Proceed. The asymmetry favours it |
| Impacted files | `call-path.ts` |
| Reason | Getting this wrong refuses a legitimate accept, which is safe and visible. Not doing it leaves the measured state: a position-opening write passing both gates. **The one real hazard is a change that makes accept unreachable without anyone noticing**, since the surface would simply stop offering it — which is why task 7.2 requires a live accept through the product and not merely a green suite |
| Approved by | Planner |
| Next action | Task 7.2 is the operator's gate and nothing in section 7 runs without a named authorisation at the moment |

---

## DE-1 — EXECUTION: the plan's "one home" was impossible, and the reason is the point

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **EXECUTION** |
| Type | Plan error, corrected during execution |
| Decision | Two files, not one: `src/infrastructure/battlegrid/money-tools.ts` holds the **reachable** set; `tests/support/money-tools.ts` holds the **forbidden** set |
| Impacted files | both of the above, `tests/agent/wager.test.ts` |
| Reason | PD-1/PD-2 said to move both sets into one module under `src/infrastructure/battlegrid/`. **That would violate A10 half 1 on the first line**: no forbidden tool name may appear anywhere under `src/`, and putting them there is exactly the violation the guard exists to catch. The sets have opposite requirements about where their names may live, so they cannot share a home. The intent survives — one home *per set*, imported rather than duplicated, so `wager.test.ts` reads the same lists the runtime does |
| Approved by | Executor, on the guard rather than on preference |
| Next action | Inventory updated. The partition test in `money-tools.test.ts` asserts no name is in both |

---

## DE-2 — EXECUTION: section 0 evidence, recorded before anything changed

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **EXECUTION** |
| Type | Evidence |
| Decision | Recorded here and the throwaway deleted per task 8.1 |
| Impacted files | `tests/capability/__defect-evidence.test.ts` (created, then deleted) |
| Reason | Driven through the real `buildClassificationMap` and the real `beginGuardedCall`, before any change: `accept -> {"destructive":false,"requiredScope":"mcp:read"}`, `cancel -> {"destructive":true,"requiredScope":"mcp:read"}`, accept admitted on `mcp:read` alone with no token, audit row `destructive: false`, and `mcp-adapter.ts sets declaredScope: false`. **A flaw in that test is worth keeping**: it built `DiscoveredTool`s by hand without `declaredScope`, so it bypassed the adapter and could never have shown the fix — the same fabricated-input trap this change exists to remove, committed by its own evidence test. `money-tools.test.ts` drives the composed path instead |
| Approved by | Executor |
| Next action | Deleted. `money-tools.test.ts` is the permanent test and asserts the corrected behaviour |

---

## DE-3 — EXECUTION: A10 caught a doc comment, and the ruling already existed

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **EXECUTION** |
| Type | Guard hit, obeyed rather than weakened |
| Decision | The comment was de-named. A10 unchanged |
| Impacted files | `src/domain/capability/tool-class.ts`, `tests/capability/money-tools.test.ts` |
| Reason | A new doc comment on `ToolClass.destructive` named a released tool to explain the defect, and A10 half 2 failed on it — the same event DL-7 of `the-approval-can-be-answered` recorded, with the same answer: the guard is blunt on purpose, a name is the first step toward a call, and weakening it for a comment spends the guard for nothing. **My own "the domain names no tool" assertion missed it**, because it scanned `classify.ts` alone; it now scans all of `src/domain`. A guard narrower than the rule it enforces is a guard with a hole in it |
| Approved by | Executor |
| Next action | None. Both guards green |

---

## DE-4 — EXECUTION: the fabricated-input rule is narrow, and deliberately so

| Field | Value |
|---|---|
| Timestamp | 2026-08-17 |
| Phase | **EXECUTION** |
| Type | Scope judgement on task 5.2 |
| Decision | Guard **fabricated wager classifications beside a real money-tool name**, not every hand-built `ToolClass`. `call-path.test.ts` and `money-tools.test.ts` exempt by name |
| Impacted files | `tests/agent/answer-authority.test.ts`, `tests/capability/money-tools.test.ts` |
| Reason | 22 test files hand-build `{ mutating: false, destructive: false, requiredScope: 'mcp:read' }` inside a fake so a read call can pass. Annotating all of them would be churn for no safety: a read tool's classification is not the subject under test and cannot hide a money defect. The shape that **did** hide one is a fabricated `mcp:wager` classification paired with a real money-tool name — exactly what `answer-authority.test.ts:171-176` carried, correct in every assertion and about an input production never produced. `call-path.test.ts` is exempt because its `READ`/`WRITE`/`DESTRUCTIVE`/`WAGER` fixtures make the **class** the subject rather than standing in for a tool |
| Approved by | Executor |
| Next action | Proven non-vacuous: a probe file pairing the two fails the guard; removed, it passes. `answer-authority.test.ts` now drives `buildClassificationMap`, and reverting the classification fix fails 3 tests across the two files |

---

## Scope boundaries

**In**: the classification, the two port gates, the audit's content, the tests
that assert against fabricated inputs, and the `random_submit_market_grid` gap.

**Out**: asking BattleGrid to fix the annotation; the application-layer binding;
calling any of the four other money-affecting tools; the audit badge's visual
design.

## Assumptions

1. **The five annotations still read as recorded.** Verified against
   `docs/battlegrid-mcp-capabilities.json`, which is current. Task 7.1 re-checks
   live before anything is concluded, because the count has held still while
   semantics moved twice (#198, #301).
2. **`grid_commander_test` remains available and disposable.** It was created and
   used on 2026-08-17. `assertDisposable` refuses anything not marked disposable,
   and `DB_TESTS_MAY_TRUNCATE` must never be set.
3. **No parallel session is touching the capability layer.** Checked at planning
   time: no open PRs.

## Executor handoff notes

1. **Section 0 first, and its output goes in this log.** Everything afterwards is
   measured against a recorded starting state, because the current tests pass
   while the defect is live.
2. **`tests/agent/answer-authority.test.ts:171-176` is the trap.** It hand-builds
   `{ destructive: true, requiredScope: 'mcp:wager' }` and every assertion in it
   is correct about an input production never produces. If it still passes
   unchanged after your work, you have not finished.
3. **The gate between phases D and E is deliberate.** Do not migrate the audit
   schema until both port gates are proven to fire.
4. **Do not touch `src/application/use-cases/`.** If you think you must, log it
   here first — that boundary is what `answer-decision.command.ts:16-20` protects.
5. **`npm run test:db` needs `grid_commander_test`, never `grid_commander`.** The
   working database holds 144,732 signal readings BattleGrid cannot re-serve.
