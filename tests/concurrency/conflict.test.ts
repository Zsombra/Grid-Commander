import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { toDomainError } from '@/infrastructure/battlegrid/call-path.js';
import { RevisionConflictError } from '@/domain/errors.js';

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}

/** R9 — the state moved on. Surfaced, never silently retried. */
describe('surfaces_and_does_not_retry', () => {
  it('surfaces a conflict as a conflict', () => {
    const err = toDomainError(new Error('expectedRevision 3 did not match'), 'strategy', 3);
    expect(err).toBeInstanceOf(RevisionConflictError);
  });

  it('tells the user which resource moved and that nothing was applied', () => {
    const err = toDomainError(new Error('revision mismatch'), 'agent', 2) as RevisionConflictError;
    expect(err.resource).toBe('agent');
    expect(err.message).toContain('not applied');
  });

  it('carries no retry affordance on the error itself', () => {
    const err = toDomainError(new Error('conflict'), 'agent', 1);
    // A retry() method here would be an invitation to apply an intent formed
    // against a state that no longer exists.
    expect((err as unknown as Record<string, unknown>)['retry']).toBeUndefined();
  });

  /**
   * Policy P4 as a structural assertion. A retry loop anywhere near the call
   * path is the failure mode this requirement exists to prevent, and it is the
   * kind of thing added later "just for reliability".
   */
  it('has no retry loop in the call path or the adapter', () => {
    const suspicious = /\bretry\b|\bretries\b|\bbackoff\b/i;
    const offenders: string[] = [];
    for (const file of filesUnder('src')) {
      const text = readFileSync(file, 'utf8');
      // Comments explaining why we do NOT retry are fine; code is not.
      const code = text
        .split('\n')
        .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//'))
        .join('\n');
      if (suspicious.test(code)) offenders.push(file);
    }
    expect(offenders, 'P4: conflicts are surfaced to the user, never retried automatically').toEqual([]);
  });
});
