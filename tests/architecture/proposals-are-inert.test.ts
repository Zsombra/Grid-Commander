import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOLS } from '@/mcp/tools.js';

/**
 * A proposal never performs itself, and a model never receives a confirmation.
 *
 * These are the two properties the whole change rests on, and both are stated
 * as absences — which is exactly the kind of claim that decays into a comment
 * unless something checks it.
 *
 * The first is the stronger. Every other safeguard here is about what a page
 * shows or what a guard forbids; this one is about there being **no code path
 * at all** by which a recorded proposal becomes a write without a person
 * acting. The design has no worker, no scheduler, no retry and no setting, and
 * this is what keeps it that way — because adding one would look, in review,
 * like a small convenience.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const sources = [...walk('src'), ...walk('app')];
const read = (f: string) => readFileSync(f, 'utf8');
const stripComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Every file that touches the proposal store or the resolve use-case. */
const touchesProposals = sources.filter((f) => {
  const code = stripComments(read(f));
  return /ProposalStore|resolveProposal|openProposal|proposals\./.test(code);
});

/**
 * Anything that could run a proposal on its own.
 *
 * Named at module scope rather than written inline in the loop so that the
 * self-test at the bottom of this file can feed the **same** patterns a known
 * violation. A self-test that retypes the rule guards its own copy — the exact
 * defect the audit in GitHub #87 found in `identifiers.test.ts`, whose
 * `check()` re-declares the regexes the live scan uses.
 */
const SCHEDULES: readonly RegExp[] = [
  /\bsetTimeout\s*\(/,
  /\bsetInterval\s*\(/,
  /\bcron\b/i,
  /\bschedule[dr]?\b/i,
  /\bworker\b/i,
  /\bconsume(r)?\s*\(/,
  /\bpoll\w*\s*\(/,
];

/** True when this fragment could perform a proposal without a person. */
function schedulesSomething(code: string): boolean {
  return SCHEDULES.some((p) => p.test(code));
}

/**
 * The three remaining rules, named so they can be fed a violation.
 *
 * `SCHEDULES` and the perform-call matcher were pinned when this file was first
 * repaired; these were not. Audited 2026-08-10 by mutation (GitHub #87):
 * `/^describe/i` replaced with a pattern matching nothing left the file green at
 * **11/11**, and so did killing the propose-token matcher. Three corpus floors
 * stayed satisfied throughout, because none of them is built on these.
 *
 * The two literals are named rather than written inline for a different reason:
 * a `not.toContain('X')` has no matcher to break — the literal *is* the rule —
 * so the only way to prove it is to show something in the product spells it that
 * way. `is looking for spellings that something in the product actually uses`
 * does exactly that.
 */

/** A `describe*` use case mints a confirmation as its whole purpose. */
const mintsAConfirmation = (useCase: string): boolean => /^describe/i.test(useCase);

/** A propose tool's response block must name no confirmation. */
const NAMES_A_CONFIRMATION = /confirmationToken|confirmation:/;

const MINTS_A_STORE = 'ConfirmationStore';
const NAMES_A_TOKEN = 'confirmationToken';

describe('nothing performs a proposal without a person', () => {
  it('found the files it is checking', () => {
    // Empty would pass every assertion below vacuously.
    expect(touchesProposals.length).toBeGreaterThan(4);
  });

  it('schedules nothing', () => {
    /**
     * A proposal is inert until a human opens it. Anything that could run on
     * its own — a timer, an interval, a cron, a queue consumer — would make
     * "nothing performs itself" untrue by the most ordinary-looking commit.
     */
    const offenders: string[] = [];
    for (const file of touchesProposals) {
      const code = stripComments(read(file));
      for (const pattern of SCHEDULES) {
        if (pattern.test(code)) offenders.push(`${file}: ${String(pattern)}`);
      }
    }
    expect(
      offenders,
      'a proposal must not be performable by the passage of time',
    ).toEqual([]);
  });

  it('reaches a write only from a route a person submits', () => {
    /**
     * `updateAgent` is the perform. The only file allowed to call it while
     * knowing about proposals is the page a person clicks — and there it sits
     * behind a `'use server'` action bound to a form.
     *
     * A use-case calling it would be a proposal performing itself one layer
     * further in, which is the version of this defect that would survive
     * review.
     */
    const offenders: string[] = [];
    for (const file of touchesProposals) {
      const code = stripComments(read(file));
      // `.execute(` and not the bare name: `composition.ts` constructs the
      // command and binds it, which is wiring rather than calling, and a rule
      // that could not tell those apart would have to exempt the composition
      // root by name — an allowlist in the one file most likely to grow.
      if (!/\bupdateAgent\.execute\s*\(/.test(code)) continue;
      if (!file.startsWith('app/')) {
        offenders.push(`${file} reaches the perform outside a route`);
        continue;
      }
      if (!code.includes("'use server'")) {
        offenders.push(`${file} reaches the perform without a server action`);
      }
    }
    expect(offenders, 'the only path from a proposal to a write is a person submitting a form').toEqual(
      [],
    );
  });

  it('closes a proposal only after the write, never before', () => {
    // Closing first would leave one marked agreed against a change that never
    // happened — a record that says a person approved something the account
    // never saw.
    const page = read('app/(app)/pending/[id]/page.tsx');
    const performAt = page.indexOf('app.updateAgent.execute');
    const closeAt = page.indexOf("status: 'agreed'");
    expect(performAt, 'the page performs the write').toBeGreaterThan(-1);
    expect(closeAt, 'the page closes the proposal').toBeGreaterThan(-1);
    expect(closeAt, 'the close follows the write').toBeGreaterThan(performAt);
  });
});

describe('no MCP response can carry a confirmation', () => {
  it('mints none on the recording path', () => {
    // The confirmation is a bearer capability: whatever holds one can complete
    // the write it was formed for. The recording use-case is the only thing an
    // MCP tool reaches, and it holds no confirmation store at all.
    const src = stripComments(read('src/application/use-cases/record-proposal.command.ts'));
    expect(src).not.toContain(MINTS_A_STORE);
    expect(src).not.toContain(NAMES_A_TOKEN);
  });

  it('is looking for spellings that something in the product actually uses', () => {
    /**
     * The positive control the rule above cannot supply itself.
     *
     * `not.toContain('ConfirmationStore')` has no matcher to break — the literal
     * *is* the rule — so it is satisfied by any string the codebase never
     * writes. Misspell it, rename the class, and the assertion goes on passing
     * while asserting the absence of a word nobody was going to use anyway.
     *
     * So both spellings are shown to appear in a use case that genuinely mints
     * one. If minting is ever renamed, this fails and the rule above gets
     * updated rather than quietly becoming decorative.
     */
    const mints = read('src/application/use-cases/apply-plan.command.ts');
    expect(mints, 'the word the rule forbids must be a word minting actually uses').toContain(
      MINTS_A_STORE,
    );
    expect(mints).toContain(NAMES_A_TOKEN);
  });

  it('exposes no tool whose use-case can mint one', () => {
    /**
     * Derived from the tool table rather than asserted about the one tool that
     * exists today. A `describe*` use-case mints a confirmation as its whole
     * purpose; if one ever became reachable from a tool, a model would hold an
     * unspent authorization and the seat this change exists to preserve would
     * be gone.
     */
    const offenders = TOOLS.filter((t) => mintsAConfirmation(t.useCase)).map(
      (t) => `${t.name} → ${t.useCase}`,
    );
    expect(offenders, 'a describe mints a confirmation; a model must not reach one').toEqual([]);
    // Guards the guard: a table that lost its entries would pass vacuously.
    expect(TOOLS.length).toBeGreaterThan(10);
  });

  it('serialises no token from the propose surface', () => {
    // Asserted on what the tool actually hands back, not on intent. A field
    // added later that happened to carry a token would fail here.
    const src = stripComments(read('src/mcp/tools.ts'));
    const proposeBlocks = src.split(/\{\s*\n\s*name: '/).filter((b) => b.startsWith('propose_'));
    expect(proposeBlocks.length).toBeGreaterThan(0);
    for (const block of proposeBlocks) {
      expect(block, 'a propose tool must not name a confirmation').not.toMatch(NAMES_A_CONFIRMATION);
    }
  });
});

/**
 * The rules, fed the violations they exist to catch.
 *
 * Audited 2026-08-10 by mutation (GitHub #87): **all eleven offender matchers
 * in this file were broken at once and it passed 7/7 green.** The three corpus
 * floors stayed satisfied throughout, because the corpus filter is a different
 * regex from the matchers doing the scanning — so counting what was scanned
 * proved nothing about whether anything could be found in it.
 *
 * This is the guard holding `the-model-can-propose-and-only-a-human-agrees` as
 * a property. A guard nobody has seen fail is a guard nobody knows works.
 */
describe('the rules catch what they were written for', () => {
  it('catches a proposal performed by the passage of time', () => {
    expect(
      schedulesSomething("setInterval(() => { void app.updateAgent.execute(proposals.next()); }, 60_000);"),
    ).toBe(true);
  });

  it('catches the other shapes a scheduler takes', () => {
    for (const code of [
      'setTimeout(run, 1000)',
      'const cron = "*/5 * * * *"',
      'export const scheduled = true',
      'new Worker(queue)',
      'await consumer(topic)',
      'await pollProposals()',
    ]) {
      expect(schedulesSomething(code), code).toBe(true);
    }
  });

  it('does not fire on the ordinary code this file scans', () => {
    // Without this, every assertion above is satisfied by a predicate that
    // returns true for everything — the direction that silenced
    // `controls.test.ts` when its exclusions were widened rather than its
    // scan narrowed.
    expect(schedulesSomething("const open = await app.openProposal.execute({ id });")).toBe(false);
    expect(schedulesSomething("await proposals.record(intent);")).toBe(false);
  });

  it('finds the perform call the route rule looks for', () => {
    // The rule at `only a submitted form performs one` keys on this exact
    // shape; a dead pattern there means no file is ever examined.
    expect(/\bupdateAgent\.execute\s*\(/.test('await app.updateAgent.execute({ agentId })')).toBe(true);
    expect(/\bupdateAgent\.execute\s*\(/.test('updateAgent: new UpdateAgentCommand(agents),')).toBe(false);
  });
});

/**
 * The last two rules, fed the violations they exist to catch.
 *
 * The block above them proves `SCHEDULES` and the perform-call matcher. These
 * two were left unproven and were confirmed blind by mutation on 2026-08-10:
 * `/^describe/i` → a pattern matching nothing passed **11/11**, and killing the
 * propose-token matcher passed too. Between them they hold the second half of
 * `the-model-can-propose-and-only-a-human-agrees` — that no MCP response can
 * hand a model an unspent authorisation.
 */
describe('the confirmation rules catch what they were written for', () => {
  it('catches a use case whose whole purpose is minting one', () => {
    expect(mintsAConfirmation('describeArchive')).toBe(true);
    expect(mintsAConfirmation('describeDeploy')).toBe(true);
    // Case-insensitive on purpose: the rule reads a name, and a rename to
    // `DescribeApply` must not slip past it.
    expect(mintsAConfirmation('DescribeApply')).toBe(true);
  });

  it('leaves an ordinary read alone', () => {
    // Without this the rule is satisfied by a predicate matching everything,
    // which would ban every tool in the table rather than none.
    expect(mintsAConfirmation('listAgents')).toBe(false);
    expect(mintsAConfirmation('readTradingRecord')).toBe(false);
    // Anchored at the start: a name that merely contains the word is not one.
    expect(mintsAConfirmation('recordProposalDescribed')).toBe(false);
  });

  it('is reading a field the tool table actually populates', () => {
    // Reachability: `useCase` must be a real key carrying real names, or the
    // rule is filtering on `undefined` and can never fire.
    expect(TOOLS.every((t) => typeof t.useCase === 'string' && t.useCase.length > 0)).toBe(true);
    expect(TOOLS.length).toBeGreaterThan(10);
  });

  it('catches a propose response that names a confirmation', () => {
    expect(NAMES_A_CONFIRMATION.test('output: { confirmationToken: string }')).toBe(true);
    // The other spelling, which is why the rule is an alternation.
    expect(NAMES_A_CONFIRMATION.test('returns: { confirmation: token }')).toBe(true);
  });

  it('leaves a propose response that names none', () => {
    expect(NAMES_A_CONFIRMATION.test("name: 'propose_agent_edit', output: { proposalId: string }")).toBe(
      false,
    );
  });
});
