import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { describeEdit } from '@/application/use-cases/describe-edit.query.js';
import { anAgent } from '../support/agent-fakes.js';

/**
 * Renaming an agent was broken three ways, and the third hid the other two.
 *
 * It could not reach the platform: `update_intelligence_agent` is
 * `destructiveHint: true` and `AgentsPort.updateAgent` had no
 * `confirmationToken`, so the guard refused before a request was built. It could
 * not report failure: the action awaited the result, discarded it, and
 * redirected. And where it could not work it simply vanished, saying nothing.
 */

describe('what the operator is agreeing to', () => {
  it('names the rename in the operator’s terms', () => {
    expect(describeEdit('Volatilis', { displayName: 'Vol II' })).toBe(
      'Renames "Volatilis" to "Vol II".',
    );
  });

  it('is silent when nothing would change', () => {
    // A confirmation for a no-op teaches people to click past confirmations.
    expect(describeEdit('Volatilis', { displayName: 'Volatilis' })).toBeNull();
    expect(describeEdit('Volatilis', {})).toBeNull();
  });

  it('says the heaviest thing about money', () => {
    const said = describeEdit('Volatilis', { tradingConfig: { maxLeverage: 5 } });
    expect(said).toMatch(/every trading limit/i);
  });
});

describe('the token is not minted by the thing that spends it', () => {
  const command = readFileSync('src/application/use-cases/update-agent.command.ts', 'utf8');

  it('UpdateAgentCommand never issues a confirmation', () => {
    // The whole point. A token the command grants itself records that the
    // product intended to proceed, which was never in doubt; the guard exists so
    // a person saw the consequence and agreed to it.
    expect(command).not.toMatch(/confirmations\s*\.\s*issue/);
    expect(command).not.toMatch(/random\s*\.\s*token/);
  });

  it('requires one rather than accepting its absence', () => {
    // Optional would move the failure from the type checker to a live call,
    // which is exactly where it lived until now.
    expect(command).toMatch(/readonly confirmationToken: string;/);
    expect(command).not.toMatch(/confirmationToken\?:/);
  });
});

/**
 * Renaming moved, and one of these guards had been enforcing the defect.
 *
 * It asserted `confirmationToken: proposed.proposal.confirmationToken` on the
 * agent page — which is precisely the shape `update-cannot-carry-a-confirmation`
 * calls *the fix that would be wrong*: propose and spend in one request, so the
 * consequence is computed, stored for the audit, and read by nobody. The guard
 * had frozen the anti-pattern in place and would have failed the correct fix.
 *
 * The behaviour worth protecting was never "the page calls these two in this
 * order". It is that a refusal reaches the operator instead of looking like the
 * product ignored them — which is what `renaming-an-agent-is-offered-and-cannot-
 * work` was actually about. That now lives on the edit page, so these point
 * there.
 */
describe('the surface says what happened', () => {
  const page = readFileSync('app/(app)/agents/[id]/edit/page.tsx', 'utf8');

  it('reads the result of the write instead of discarding it', () => {
    // The original defect, stated directly: `await …execute({…}); redirect(…)`.
    //
    // The execute moved inside `spending()` when this action came under the
    // confirmation-refusal wrapper, so it no longer sits adjacent to its
    // binding. The property asserted is unchanged — the action *reads* its
    // result — and only its spelling moved, so the matcher follows it rather
    // than the assertion being dropped. Same shape, and same reasoning, as
    // `reads()` in `tests/agent/refusals-reach-the-operator.test.ts`.
    //
    // The gap is bounded deliberately: an unbounded one would let
    // `const result` bind something else entirely and still match an execute
    // further down the file, which is how a scanner stops being one.
    expect(page).toMatch(
      /const result = await (?:spending\([\s\S]{0,80})?app\.updateAgent\.execute/,
    );
    expect(page).toMatch(/result\.kind === 'updated'/);
  });

  it('surfaces the reason the operation gave', () => {
    expect(page).toMatch(/problem=/);
  });

  it('renders a refusal where the operator will see it', () => {
    const form = readFileSync('src/presentation/components/agent-edit.tsx', 'utf8');
    expect(form).toMatch(/role="alert"/);
  });

  it('stays out of the domain', () => {
    expect(page, 'app/ may not import the domain').not.toMatch(/@\/domain\//);
  });

  /**
   * The replacement for the assertion that froze the defect. The token is read
   * off the submitted form — meaning it was rendered by an earlier request that
   * showed someone the consequence — and is not minted in the same function that
   * spends it.
   */
  it('spends a token it did not mint', () => {
    expect(page).toMatch(/requiredText\(formData, 'confirmationToken'\)/);
    const action = page.slice(page.indexOf('export async function applyEdit'));
    expect(action, 'the action that applies must not also propose').not.toMatch(
      /describeEdit\.execute/,
    );
  });

  it('no longer renames from the agent page', () => {
    // Two rename surfaces, one of them self-confirming. The read-only page kept
    // the wrong one.
    const detail = readFileSync('app/(app)/agents/[id]/page.tsx', 'utf8');
    expect(detail).not.toMatch(/updateAgent\.execute/);
    expect(detail).not.toMatch(/describeEdit\.execute/);
  });
});

describe('a control that cannot work explains its absence', () => {
  const form = readFileSync('src/presentation/components/agent-edit.tsx', 'utf8');

  it('does not simply vanish', () => {
    // It returned `null`, so an archived agent showed a blank space where the
    // name box had been — silent in a way that reads as forgetting.
    expect(form).not.toMatch(/if \(!isEditable\(agent\)\) return null;/);
  });

  it('names reactivation as what makes changes possible again', () => {
    expect(form).toMatch(/ARCHIVED/);
    expect(form).toMatch(/[Rr]eactivat/);
  });

  it('keeps the two reasons apart', () => {
    // Platform-locked is permanent and not the operator's doing. Archived is
    // theirs and is one button away from being undone.
    expect(form).toMatch(/does not permit/);
  });

  it('still renders nothing actionable for an agent it cannot change', () => {
    const archived = anAgent({ status: 'ARCHIVED' });
    expect(archived.status).toBe('ARCHIVED');
  });
});
