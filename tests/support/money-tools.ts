/**
 * Fund-committing BattleGrid tools this product must **not** be able to reach.
 *
 * These names live in the test tree deliberately, and moving them into `src/`
 * would defeat them. A10's first half asserts that none of them appears anywhere
 * under `src/` or `app/`, so their protection is structural: **you cannot call
 * what you cannot name.** That is a stronger guarantee than any runtime
 * classification, which is why the runtime list
 * (`src/infrastructure/battlegrid/money-tools.ts`) holds only the released pair.
 *
 * One home, two files, for one reason: the sets have opposite requirements about
 * where their names may appear. `wager.test.ts` and `money-tools.test.ts` both
 * import this rather than declaring their own copies — two lists that can drift
 * is the defect class #340 exists for.
 *
 * **Releasing a tool is one deliberate move**: delete it here, add it to the
 * runtime list with a reason, and the partition test confirms it is in exactly
 * one place. DL-10 of `the-approval-can-be-answered` did that by hand for the
 * answer pair.
 */
export const FORBIDDEN_MONEY_TOOLS: Readonly<Record<string, string>> = {
  submit_agent_grid: 'enters a session on an agent’s behalf — costs the entry fee',
  submit_market_grid: 'enters a Market Grid session — costs the entry fee',
  random_submit_market_grid:
    'enters a Market Grid session with random picks — costs the entry fee. **Added 2026-08-17**: money-affecting, annotated `destructiveHint: false`, and absent from this guard since it was written. Unnamed in src/app at the time, so nothing was wrong — and nothing stopped the next person naming it',
  close_agent_position: 'realises profit or loss on an open position',
  override_agent_protection: 'removes a protection the platform applied to real money',
  set_agent_per_trade_push: 'changes how much is committed per trade',
  reset_agent_drawdown_baseline: 'moves the line a loss cap is measured from',
  halt_intelligence_agent: 'stops an agent that may be holding positions',
  resume_intelligence_agent: 'restarts an agent that will commit funds again',
} as const;

/** Names only, for the structural scans. */
export const FORBIDDEN_MONEY_TOOL_NAMES: readonly string[] =
  Object.keys(FORBIDDEN_MONEY_TOOLS);
