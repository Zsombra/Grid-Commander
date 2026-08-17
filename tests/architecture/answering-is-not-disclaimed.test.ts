import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Two rules about answering a decision, both found by the verifier pass on
 * `the-approval-can-be-answered` and neither previously enforced.
 *
 * ## 1. The binding has one door, and nothing was holding it shut
 *
 * `AnswerDecisionCommand` re-reads the decision and checks all five binding
 * conditions *before* calling the port, and its own docstring says the check
 * "cannot be skipped by a caller, because the port method is not reachable from
 * anywhere else in the application layer". That was true when written and
 * nothing enforced it.
 *
 * It matters more than an ordinary convention because the second layer that was
 * supposed to catch a bypass **does not fire on accept**. `call-path.ts:71`
 * gates the confirmation consume on `cls.destructive`, and BattleGrid annotates
 * `accept_entry_decision` with `destructiveHint: false` — so the token is passed
 * down and never spent (#340). Cancel is annotated `true` and is gated. The
 * money-committing verb is the ungated one.
 *
 * So on the accept path this convention is the only thing standing between a new
 * caller and an unbound write. A rule nothing enforces is a rule that gets
 * skipped, and this one costs a position.
 *
 * ## 2. Copy may not say an answer is unavailable, because it is available
 *
 * The requirement "An Unanswerable Trading Mode Says So" was **retired** by this
 * change, on the stated grounds that the disclosure would become false once
 * answering was built. Its replacement copy then carried the same falsehood in
 * narrower words for the window between cancel shipping and accept shipping —
 * and kept carrying it afterwards, telling operators that accepting "still
 * happens on battlegrid.trade" the day after a real decision was accepted
 * through this product.
 *
 * Nothing noticed, because nothing was looking. A grep would not have found it
 * either: the sentence wrapped across a line break.
 *
 * **This is a transcription check and it is weak, deliberately labelled so.** It
 * catches the phrasings a human actually writes when a capability is not ready
 * yet. It cannot detect a novel sentence that means the same thing, and it does
 * not pretend to. It is scoped to "the product does not do this / go elsewhere"
 * claims, and says nothing about *"you do not have permission to do this right
 * now"* — which is true, is different, and must stay sayable.
 */

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * Drop comments, so a file may explain the rule it is obeying.
 *
 * Not a loophole: `money-limits.tsx` quotes the retired sentence in order to
 * record why it is gone, and a scan that could not tell naming a forbidden
 * thing from doing it would force the explanation out of the file the rule
 * governs — which is how a later reader deletes a rule as mysterious. The same
 * reasoning is written up for the PE-2 scan in the 2026-08-16 journal entry.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const PRODUCT = [...filesUnder('src'), ...filesUnder('app')];

/** The only places the port method may be named. */
const MAY_NAME_THE_PORT_METHOD = [
  'src/application/use-cases/answer-decision.command.ts', // the one caller, which binds first
  'src/infrastructure/battlegrid/agent-adapter.ts', // the implementation
  'src/ports/agents.ts', // the interface
];

const naming = (needle: string): string[] =>
  PRODUCT.filter((f) => stripComments(readFileSync(f, 'utf8')).includes(needle)).map((f) =>
    f.split('\\').join('/'),
  );

/**
 * How a capability gets described while it is still being built.
 *
 * Each of these is a claim that *the product* does not do the thing. None of
 * them is a claim about the operator's authority.
 */
const DISCLAIMERS: readonly (readonly [string, RegExp])[] = [
  ['sends the operator to the platform', /still happens on battlegrid/i],
  ['says it is not available yet', /not yet available/i],
  ['says it is unbuilt', /is (?:still )?unbuilt/i],
  ['says it is not built yet', /not yet built/i],
];

describe('the binding check cannot be walked around', () => {
  it('is reached through exactly one caller, which re-reads and binds first', () => {
    expect(naming('answerEntryDecision').sort()).toEqual(MAY_NAME_THE_PORT_METHOD.sort());
  });

  it('is comparing against files it actually found', () => {
    // An empty scan passes every assertion above it. This repository has shipped
    // that failure twice — #194's key collision and #338's \x08 bytes — so the
    // scan asserts it is reading a real tree before its result means anything.
    expect(PRODUCT.length).toBeGreaterThan(100);
    expect(naming('answerEntryDecision').length).toBeGreaterThan(0);
  });
});

describe('no surface says an answer is unavailable', () => {
  for (const [what, pattern] of DISCLAIMERS) {
    it(`never ${what}`, () => {
      const offenders = PRODUCT.filter((f) => pattern.test(stripComments(readFileSync(f, 'utf8'))));
      expect(offenders).toEqual([]);
    });
  }

  it('leaves the authority refusal sayable, because it is true', () => {
    // The opposite failure would be a guard so broad that the product could not
    // tell an operator they lack fund-committing authority. That sentence is
    // correct and must survive: this asserts the refusal path still says it.
    const refusal = readFileSync('src/presentation/answer-refusal.ts', 'utf8');
    expect(refusal.length).toBeGreaterThan(0);
    expect(DISCLAIMERS.some(([, p]) => p.test(stripComments(refusal)))).toBe(false);
  });
});
