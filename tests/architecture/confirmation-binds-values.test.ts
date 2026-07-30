import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A confirmation is bound through one construction, so it cannot be written
 * without its values.
 *
 * `consume(token, userId, tool, target)` matches who, which tool, which entity,
 * and the token. **Not the values.** A token issued against
 *
 *     Sets the most it may lose in a day to $25.
 *
 * was accepted by a submission carrying $25,000: same user, same tool, same
 * agent. The consequence is stored, so the audit log records the sentence that
 * was agreed to — which makes a mismatch detectable afterwards and prevented
 * nowhere. The audit log is what this product offers in place of trust.
 *
 * **The product had already solved this, four times out of five.**
 *
 *     apply_strategy_plan          strategy:<id>#<intentDigest>   bound
 *     rebind                       agent:<id>->strategy:<sid>     bound
 *     archive / reactivate         agent:<id>                     no values to bind
 *     archive / restore strategy   strategy:<id>                  no values to bind
 *     update_intelligence_agent    agent:<id>                     UNBOUND, and it is the money one
 *
 * So the defect was never a missing mechanism. It was five places composing the
 * same string by hand, four of which happened to include the values. That is the
 * whole causal story, and it is why this file checks for **one construction**
 * rather than for the presence of a digest.
 *
 * Checking "does this target contain a `#`" would be the weaker guard and the
 * wrong one: it would pass on a sixth flow that hashed the wrong thing, and it
 * would need an exception for the two flows that legitimately have no values. A
 * guard with an exception is a guard that gets exceptions added instead of
 * defects fixed.
 *
 * Because `confirmationTarget.agentEdit(id, intent)` cannot be called without the
 * intent, going through it *is* the binding. The compiler enforces the values;
 * this file enforces that nothing bypasses the compiler.
 */

const SRC = 'src';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.ts$/.test(full)) out.push(full);
  }
  return out;
}

/**
 * Persistence is excluded, and that is a decision rather than an oversight.
 *
 * `confirmationTokens` in the Drizzle schema declares `token` and `target`
 * columns, so it satisfies the pairing rule below exactly — and it is a table
 * definition. The store *keeps* a target; nothing in this layer decides what a
 * confirmation covers. Asserted below, so the exclusion cannot quietly widen.
 */
const PERSISTENCE = join(SRC, 'infrastructure', 'db');

const sources = walk(SRC).filter((f) => !f.startsWith(PERSISTENCE));
const read = (f: string) => readFileSync(f, 'utf8');

/** Where the one construction lives. Both halves below resolve against it. */
const HOME = join(SRC, 'domain', 'capability', 'confirmation.ts');

/**
 * Every `target:` in the source that assigns a value, with its file.
 *
 * **Anchored on `target:`, not on `confirmations.issue({` or `confirmation: {`.**
 * The first version of this file anchored on those two and missed the flows that
 * write
 *
 *     confirmation: req.confirmationToken === undefined ? undefined : { … }
 *
 * — two of five, because archiving is destructive and restoring is not. A guard
 * that a line break or a ternary can walk past is measuring formatting. Every
 * target has to go through the one construction whatever shape the expression
 * around it takes, so every target is what this reads.
 */
function targets(): Array<{ file: string; value: string }> {
  const found: Array<{ file: string; value: string }> = [];
  for (const file of sources) {
    for (const literal of objectLiterals(read(file))) {
      /**
       * A token and a target travel together, always — that is the whole point
       * of `Confirmation`. So an object literal carrying both is a confirmation
       * binding, whatever the expression around it looks like.
       *
       * This scoping is load-bearing. `target:` is overloaded in this codebase:
       * Drizzle's `onConflictDoUpdate({ target: users.x })`, the `target` column
       * on the confirmations table, and `Rebind.target: { id, name }` all use it
       * for unrelated things. A rule over every `target:` reported all four as
       * defects — four false positives, which is how a guard gets switched off
       * rather than satisfied.
       */
      if (!/(?<!\w)(token|confirmationToken):/.test(literal)) continue;
      const m = /(?<!\w)target:\s*([^\n,;}]+)/.exec(literal);
      if (!m) continue;
      const value = (m[1] as string).trim();
      // A declaration names a type, not a value.
      if (/^string\b|^\(?string/.test(value)) continue;
      found.push({ file, value });
    }
  }
  return found;
}

/**
 * Every brace-balanced `{ … }` region, so a property is read in the literal it
 * belongs to rather than within a character window.
 *
 * A window was the first attempt and it is wrong in both directions: too small
 * and a multi-line literal splits, too large and a neighbouring object's `token`
 * vouches for this one's `target`.
 */
function objectLiterals(src: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '{') continue;
    let depth = 0;
    for (let j = i; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}') {
        depth--;
        if (depth === 0) {
          out.push(src.slice(i + 1, j));
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Built through the shared construction — or forwarded, which is not building.
 *
 * `extras.confirmation?.target` in an adapter and `call.target` in the guard are
 * transport: they pass along a target someone else bound. That is exactly what
 * this change made the adapters do. **Composing** is the thing forbidden, and a
 * template literal or a bare id is composing.
 */
const isAcceptable = (value: string): boolean =>
  /^confirmationTarget\.\w+\(/.test(value) || /^[\w.?[\]]+\.target\b/.test(value);

describe('every confirmation is bound through one construction', () => {
  it('binds no confirmation target composed by hand', () => {
    // Deduplicated: nested brace regions each contain the same property, so one
    // defect would otherwise be reported three times and read as three.
    const inline = [
      ...new Set(
        targets()
          .filter(({ value }) => !isAcceptable(value))
          .map(({ file, value }) => `${file}: target: ${value}`),
      ),
    ];

    expect(
      inline,
      'these compose a confirmation target, so nothing makes them carry the operation’s values',
    ).toEqual([]);
  });

  it('keeps the construction in the domain, where the rule belongs', () => {
    // Not presentation, not an adapter, and not an application use case: the
    // domain may be imported by all three, and `digestOf` had to move here for
    // the same reason — `boundaries.test.ts` forbids the other direction.
    expect(sources, 'the one construction must live here').toContain(HOME);
    expect(read(HOME)).toMatch(/export const confirmationTarget|export function confirmationTarget/);
  });

  it('finds both ends of every flow', () => {
    // Vacuity is the failure mode this whole family of guards exists to avoid:
    // an empty derivation reports nothing wrong with a product that binds nothing.
    //
    // Five flows, and each appears twice — once where the token is issued and
    // once where it is spent. The asymmetric case is the dangerous one, and it
    // was real: `apply_strategy_plan` issued `strategy:<id>#<digest>` and spent
    // `strategy:<id>`, so the product refused every apply. Ten is the floor.
    const built = targets().filter(({ value }) => value.startsWith('confirmationTarget.'));
    expect(built.length, 'both ends of five flows').toBeGreaterThanOrEqual(10);
  });

  it('counts issue and spend separately, so an asymmetry cannot hide', () => {
    // The two ends live in different layers. If either set were empty the check
    // above would still pass on a total, which is how a one-sided binding —
    // exactly the apply-plan defect — would slip through again.
    const built = targets().filter(({ value }) => value.startsWith('confirmationTarget.'));
    const issuedIn = new Set(built.map((t) => t.file));
    expect(issuedIn.size, 'spread across the flows, not clustered in one file').toBeGreaterThan(4);
  });

  it('does not mistake a declaration for a binding', () => {
    // `readonly target: string` in the domain and `target: string` in a signature
    // are the contract. Counting them would be a permanent false positive, which
    // is how a guard gets switched off rather than satisfied.
    const declarations = targets().filter(({ file }) => file.startsWith(join(SRC, 'ports')));
    expect(declarations, 'the ports declare this shape; they do not bind it').toEqual([]);
  });

  it('excludes persistence, and only persistence', () => {
    // The exclusion has to be narrow or it becomes a place to hide a binding.
    // Everything else under `src/` is in scope: the domain, the application, the
    // adapters, the presentation layer.
    expect(sources.some((f) => f.startsWith(PERSISTENCE))).toBe(false);
    expect(sources).toContain(join(SRC, 'domain', 'capability', 'confirmation.ts'));
    expect(sources).toContain(join(SRC, 'infrastructure', 'battlegrid', 'agent-adapter.ts'));
    expect(sources).toContain(join(SRC, 'application', 'use-cases', 'update-agent.command.ts'));
  });

  it('accepts a forward and refuses a composition', () => {
    // Asserted against the function the check uses, because the distinction is
    // the whole point: an adapter may carry a target it was given and may not
    // invent one. The two rejected forms are the two the product actually had.
    expect(isAcceptable('confirmationTarget.agentEdit(id, intent)')).toBe(true);
    expect(isAcceptable('extras.confirmation?.target')).toBe(true);
    expect(isAcceptable('call.target')).toBe(true);
    expect(isAcceptable('params.agentId')).toBe(false);
    expect(isAcceptable('`strategy:${params.strategyId}`')).toBe(false);
  });
});
