import { describe, expect, it } from 'vitest';
import { outcomeOf } from '@/application/use-cases/failure-outcome.js';
import {
  ConfirmationRequiredError,
  ConnectionRevokedError,
  PlatformUnavailableError,
  RevisionConflictError,
} from '@/domain/errors.js';

/**
 * What a thrown failure is to the person who asked for the operation.
 *
 * Four perform-catches used to answer this identically — everything became
 * `{kind:'refused'}` — which put "your BattleGrid connection is no longer
 * valid" under a heading saying this operation was refused, above a live
 * confirmation form. The adapter had gone out of its way to keep that error
 * intact through the call ("must not be reshaped into something that looks
 * retryable"); the catches reshaped it anyway.
 */

describe('a lost authority is its own outcome', () => {
  it('is not a refusal of the operation', () => {
    const out = outcomeOf(new ConnectionRevokedError('reconnect'));
    expect(out.kind).toBe('authority-lost');
  });

  it('carries the sentence the failure built, remedy included', () => {
    // The remedy is the deployment's, chosen when the error was constructed.
    // Repeating it verbatim is what stops a configured-credential deployment
    // being told to go and press a connect button it does not have.
    const delegated = outcomeOf(new ConnectionRevokedError('reconnect'));
    expect(delegated.reason).toContain('no longer valid');
    expect(delegated.reason.toLowerCase()).toContain('connect');

    const personal = outcomeOf(new ConnectionRevokedError('repair-the-key'));
    expect(personal.reason).toContain('no longer valid');
    // Two deployments, two remedies — the distinction the requirement exists for.
    expect(personal.reason).not.toBe(delegated.reason);
  });
});

describe('everything else is still a refusal', () => {
  it('a moved revision refuses this operation', () => {
    const out = outcomeOf(new RevisionConflictError('agent', 4, 5));
    expect(out.kind).toBe('refused');
  });

  it('an unavailable platform refuses this operation', () => {
    const out = outcomeOf(new PlatformUnavailableError(502));
    expect(out.kind).toBe('refused');
    expect(out.reason).toContain('502');
  });

  it('an error that is not an Error at all still reads as a refusal', () => {
    const out = outcomeOf('something threw a string');
    expect(out.kind).toBe('refused');
    expect(out.reason).toBe('something threw a string');
  });
});

describe('the confirmation guard is not an outcome', () => {
  it('keeps throwing rather than becoming something a page renders', () => {
    // What was submitted is not what was agreed to: a broken or tampered
    // request, not a platform answer. `tests/access/end-to-end.test.ts` pins
    // this as a rejection through the real path.
    expect(() => outcomeOf(new ConfirmationRequiredError('rebind_intelligence_agent', 'x'))).toThrow(
      ConfirmationRequiredError,
    );
  });
});
