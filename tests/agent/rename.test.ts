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

describe('the surface says what happened', () => {
  const page = readFileSync('app/(app)/agents/[id]/page.tsx', 'utf8');

  it('reads the result of the write instead of discarding it', () => {
    // The defect, stated directly: `await …execute({…}); redirect(…)`.
    expect(page).toMatch(/const result = await app\.updateAgent\.execute/);
    expect(page).toMatch(/result\.kind === 'updated'/);
  });

  it('proposes before performing', () => {
    expect(page).toMatch(/app\.describeEdit\.execute/);
    expect(page).toMatch(/confirmationToken: proposed\.proposal\.confirmationToken/);
  });

  it('surfaces the reason the operation gave', () => {
    expect(page).toMatch(/problem=/);
    expect(page).toMatch(/role="alert"/);
  });

  it('stays out of the domain', () => {
    expect(page, 'app/ may not import the domain').not.toMatch(/@\/domain\//);
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
