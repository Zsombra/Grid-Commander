import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { beginGuardedCall } from '@/infrastructure/battlegrid/call-path.js';
import { ScopeUnavailableError } from '@/domain/errors.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * A10 — agent operations that commit funds are not reachable.
 *
 * Two halves. The guard refuses one that arrives; the structural half asserts
 * none can arrive, because no wager tool name appears anywhere in the product.
 */
describe('refused_and_recorded_as_refusal', () => {
  const guard = () => {
    const clock = new FakeClock();
    const audit = new FakeAuditStore(clock);
    return {
      audit,
      deps: { audit, confirmations: new FakeConfirmationStore(clock), heldScopes: ['mcp:read' as const] },
    };
  };

  const wagerCall = {
    userId: 'u1',
    tool: 'submit_agent_grid',
    classification: {
      mutating: true,
      destructive: true,
      requiredScope: 'mcp:wager' as const,
      basis: 'annotations' as const,
    },
  };

  it('refuses an operation that would spend', async () => {
    const { deps } = guard();
    await expect(beginGuardedCall(deps, wagerCall)).rejects.toBeInstanceOf(ScopeUnavailableError);
  });

  it('refuses it before it is attempted', async () => {
    const { deps } = guard();
    const err: unknown = await beginGuardedCall(deps, wagerCall).catch((e: unknown) => e);
    expect((err as Error).message).toContain('mcp:wager');
  });

  /**
   * A refusal is not an attempt. Recording it as `attempted` would put an
   * operation in the user's audit log that never left this process, and would
   * make the log's most important claim — "this is what we did" — false.
   */
  it('records no attempt for a refused call', async () => {
    const { audit, deps } = guard();
    await beginGuardedCall(deps, wagerCall).catch(() => undefined);
    expect(audit.entries).toEqual([]);
  });
});

describe('no wager tool is reachable from any path', () => {
  /**
   * Every `mcp:wager` tool that touches an agent, minus the two this product
   * now deliberately performs.
   *
   * **This list was every one of them until 2026-08-15**, and the assertion
   * below was this product's standing claim that it could not spend anyone's
   * money. `the-approval-can-be-answered` is the change that makes the claim
   * narrower rather than false: answering a proposed trade is the whole point
   * of the human-in-the-loop surface, and it cannot be done without these two.
   *
   * Two tools were released, not the category. Everything else here — closing
   * a position, overriding protection, halting an agent, submitting a grid —
   * remains unreachable, and adding to this list is the cheap direction. If a
   * later change needs one of them, it removes it here **on purpose**, the way
   * this one did, and says why in its decision log (DL-7).
   *
   * The behavioural half above is untouched and does the real work: a call
   * requiring authority the connection does not hold is refused before it is
   * attempted, and a refusal is never recorded as an attempt.
   */
  const WAGER_TOOLS = [
    'submit_agent_grid',
    'submit_market_grid',
    'close_agent_position',
    'override_agent_protection',
    'set_agent_per_trade_push',
    'reset_agent_drawdown_baseline',
    'halt_intelligence_agent',
    'resume_intelligence_agent',
  ];

  /**
   * The two released to `the-approval-can-be-answered`, named here so the
   * release is legible in the guard itself rather than only in a git blame.
   */
  const ANSWER_TOOLS = ['accept_entry_decision', 'cancel_entry_decision'];

  it('names none of the still-forbidden ones in src/ or app/', () => {
    const offenders: string[] = [];
    for (const file of [...filesUnder('src'), ...filesUnder('app')]) {
      const text = readFileSync(file, 'utf8');
      for (const tool of WAGER_TOOLS) {
        if (text.includes(tool)) offenders.push(`${file}: ${tool}`);
      }
    }
    expect(offenders, 'no MVP code may name a still-forbidden wager tool').toEqual([]);
  });

  /**
   * The released pair is confined to the adapter.
   *
   * A tool name in the domain or the application layer would mean the port had
   * been bypassed (architecture policy P6, "one way in"), and every guarantee
   * built on top of the port — the binding, the audit, the scope refusal —
   * would become advisory. The guard that used to say "nowhere" now says
   * "one place", which is a weaker claim but still a checkable one.
   */
  it('confines the two released tools to the BattleGrid adapter', () => {
    const offenders: string[] = [];
    for (const file of [...filesUnder('src'), ...filesUnder('app')]) {
      if (file.replace(/\\/g, '/').includes('src/infrastructure/battlegrid/')) continue;
      const text = readFileSync(file, 'utf8');
      for (const tool of ANSWER_TOOLS) {
        if (text.includes(tool)) offenders.push(`${file}: ${tool}`);
      }
    }
    expect(offenders, 'answering tools belong only to the adapter').toEqual([]);
  });

  it('still requests only read scope', () => {
    const scope = readFileSync('src/domain/connection/scope.ts', 'utf8');
    const requested = /REQUESTED_SCOPES[^=]*=\s*\[([^\]]*)\]/.exec(scope)?.[1] ?? '';
    expect(requested).not.toContain('wager');
  });
});

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}
