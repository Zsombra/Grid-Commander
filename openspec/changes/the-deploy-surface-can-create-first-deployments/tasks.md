# Tasks

- [ ] **T1: Widen `expectedRevision` through the type chain**
  - `RadarPort.upsertDeployment`: `expectedRevision: number` → `number | null`
  - `McpRadarAdapter.upsertDeployment`: pass `null` through to the MCP args
    (the platform accepts it as the first-deploy signal)
  - The domain type `RadarDeployment.revision` stays `number` — an existing
    deployment always has a numeric revision; `null` only appears in the write
    path for coins with no deployment
  - Traces to: Requirement B (first-deploy path)

- [ ] **T2: Remove the first-deploy refusal from `DescribeDeployQuery`**
  - Remove the `if (!existing)` branch that refuses with "BattleGrid's API
    refuses to create a first one"
  - Add the first-deploy describe path: when no existing deployment is found,
    propose with `expectedRevision: null` and a consequence sentence that says
    the agent starts scanning the market, naming no replacement
  - The confirmation target binding (`confirmationTarget.agentDeploy`) is
    unchanged — it binds agent+coin, which is correct for both first deploys
    and replacements
  - Traces to: Requirement B (first-deploy scenario)

- [ ] **T3: Handle null `expectedRevision` in the deploy page**
  - The hidden form field currently uses `requiredInteger(formData,
    'expectedRevision')` in the server action, which rejects null
  - Change to accept either an integer or a sentinel for null (e.g. empty
    string → null, or a dedicated parser)
  - The describe result's `expectedRevision` must travel through the form; the
    page template must render it as a hidden field that round-trips correctly
  - The informational text ("Name a market that already carries a deployment")
    must be removed or updated — it is no longer a constraint
  - Traces to: Requirement B (first-deploy scenario)

- [ ] **T4: Update unit tests**
  - `deploy.test.ts:183` — the "refuses an unoccupied coin" test: change to
    assert a proposal with `expectedRevision: null` and a consequence that
    names the agent and market without a replacement
  - Add a test for the full first-deploy ceremony: describe returns a proposal
    with null revision, perform sends it through, the adapter receives null
  - Payload conformance test (`payload-conformance.test.ts`): add a case for
    the first-deploy payload shape with `expectedRevision: null`
  - Traces to: Requirement B (all scenarios)

- [ ] **T5: Update the live probe sentinel**
  - `radar-probe.test.ts` test 1 ("the platform refuses every expectedRevision
    for a coin with no policy"): this sends `expectedRevision: 1` and expects
    a conflict — it still passes because the platform rejects `1` for a coin
    with no policy, even though `null` now succeeds. The sentinel never
    detected the platform change
  - Replace or supplement with a test that confirms `expectedRevision: null`
    succeeds for a first deploy (gated on `BATTLEGRID_LIVE_WRITES=1`), then
    cleans up by deleting the deployment it created
  - The radar is at 20/20 — the probe must undeploy a test coin first, then
    first-deploy it back. Use the slot-shuffle pattern
  - Traces to: Requirement B (first-deploy scenario)

- [ ] **T6: Update the spec (this change's delta)**
  - Already written as the delta spec in this change folder
  - The archiver will merge it on `/archive`
  - Traces to: Requirement B
