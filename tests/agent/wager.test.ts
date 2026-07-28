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
  /** Every `mcp:wager` tool in the surface map that touches an agent. */
  const WAGER_TOOLS = [
    'submit_agent_grid',
    'submit_market_grid',
    'accept_entry_decision',
    'cancel_entry_decision',
    'close_agent_position',
    'override_agent_protection',
    'set_agent_per_trade_push',
    'reset_agent_drawdown_baseline',
    'halt_intelligence_agent',
    'resume_intelligence_agent',
  ];

  it('names none of them in src/ or app/', () => {
    const offenders: string[] = [];
    for (const file of [...filesUnder('src'), ...filesUnder('app')]) {
      const text = readFileSync(file, 'utf8');
      for (const tool of WAGER_TOOLS) {
        if (text.includes(tool)) offenders.push(`${file}: ${tool}`);
      }
    }
    expect(offenders, 'no MVP code may name a wager tool').toEqual([]);
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
