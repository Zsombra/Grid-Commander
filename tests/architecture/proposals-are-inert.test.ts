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
      for (const pattern of [
        /\bsetTimeout\s*\(/,
        /\bsetInterval\s*\(/,
        /\bcron\b/i,
        /\bschedule[dr]?\b/i,
        /\bworker\b/i,
        /\bconsume(r)?\s*\(/,
        /\bpoll\w*\s*\(/,
      ]) {
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
    expect(src).not.toContain('ConfirmationStore');
    expect(src).not.toMatch(/confirmationToken/);
  });

  it('exposes no tool whose use-case can mint one', () => {
    /**
     * Derived from the tool table rather than asserted about the one tool that
     * exists today. A `describe*` use-case mints a confirmation as its whole
     * purpose; if one ever became reachable from a tool, a model would hold an
     * unspent authorization and the seat this change exists to preserve would
     * be gone.
     */
    const offenders = TOOLS.filter((t) => /^describe/i.test(t.useCase)).map(
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
      expect(block, 'a propose tool must not name a confirmation').not.toMatch(
        /confirmationToken|confirmation:/,
      );
    }
  });
});
