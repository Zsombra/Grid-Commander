import type { Scope } from './scope.js';

/**
 * What the credential this request acts with is understood to carry.
 *
 * A seam, because the answer comes from two different places and they are not
 * the same kind of fact.
 *
 * A **delegated grant** was registered for named scopes, so authority beyond
 * them is unobtainable — the platform enforces it. A **credential the operator
 * supplied** carries whatever the platform gave it, which the product has no way
 * to read; what it has is what it was told.
 *
 * Both produce a `Scope[]`, and the guard sequence treats them the same, which
 * is correct: architecture policy P1 already says scope must never be the thing
 * that decides. What differs is what may be *said* about them, and that
 * distinction lives at the surface rather than here — see
 * `battlegrid-connection`, "A Declared Scope Is Not A Granted One".
 */
export interface HeldScopes {
  forUser(userId: string): Promise<readonly Scope[]>;
}

/**
 * Scopes the operator declared, for a credential the product cannot interrogate.
 *
 * Deliberately does not consult the database: a personal deployment has no
 * connection row, and inventing one to hold a value that came from an
 * environment variable would make configuration look like a grant.
 */
export class DeclaredScopes implements HeldScopes {
  constructor(private readonly declared: readonly Scope[]) {}

  async forUser(_userId: string): Promise<readonly Scope[]> {
    return this.declared;
  }
}
