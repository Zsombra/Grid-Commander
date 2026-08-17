import { describe, expect, it } from 'vitest';
import { McpStrategyAdapter } from '@/infrastructure/battlegrid/strategy-adapter.js';
import { ToolRefusedError } from '@/infrastructure/battlegrid/mcp-adapter.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';

/**
 * The structure the compiler's refusal carries, kept instead of flattened.
 *
 * `ToolRefusedError` has always carried the refusal body verbatim as its
 * message. The compile path caught it, called `messageOf`, and returned the
 * whole JSON as a reason string — so a refusal BattleGrid had explained
 * precisely arrived as an opaque wall.
 *
 * The body below is the real one, recorded live 2026-08-06 on the first removal
 * the condition-write probe attempted (#111). It is the only observation of
 * this shape, so it is the fixture: three of the dead paths in HANDOFF.md began
 * as a declaration read as an observation.
 */

const REAL_BODY = JSON.stringify({
  code: 'VALIDATION_ERROR',
  message:
    "[market-read] strategy f34788df: marker '{ALL_AGREE_UP}' names neither a column this " +
    "strategy's report renders nor one of its conditions — markers may only reference the " +
    "strategy's own report headers and condition keys. Nearest canonical key: 'ALL_AGREE_DOWN'.",
  details: {
    authoringCode: 'MARKET_READ_MARKER_UNKNOWN',
    path: ['marketReadText', 184],
    context: { token: 'ALL_AGREE_UP', lookupKind: 'reportHeader', nearestKey: 'ALL_AGREE_DOWN' },
  },
});

/** A port whose one job is to refuse the compile with a given body. */
function refusing(detail: string): BattleGridPort {
  return {
    callTool: () => Promise.reject(new ToolRefusedError('compile_strategy_plan', detail)),
  } as unknown as BattleGridPort;
}

const compile = (detail: string) =>
  new McpStrategyAdapter(refusing(detail)).compilePlan({
    userId: 'u',
    accessToken: 't',
    request: {},
  });

describe('a compile refusal keeps what the platform said about it', () => {
  it('carries the authoring code', async () => {
    const r = await compile(REAL_BODY);
    expect(r.kind).toBe('rejected');
    expect(r.kind === 'rejected' && r.refusal?.authoringCode).toBe('MARKET_READ_MARKER_UNKNOWN');
  });

  it('carries the context whole, unread', async () => {
    const r = await compile(REAL_BODY);
    const ctx = r.kind === 'rejected' ? r.refusal?.context : undefined;
    expect(ctx?.['token']).toBe('ALL_AGREE_UP');
    expect(ctx?.['nearestKey']).toBe('ALL_AGREE_DOWN');
    // Kept even though nothing reads it — which of its keys matter is the
    // platform's to say, and it says different things for different codes.
    expect(ctx?.['lookupKind']).toBe('reportHeader');
  });

  it('carries the path the platform pointed at', async () => {
    const r = await compile(REAL_BODY);
    expect(r.kind === 'rejected' && r.refusal?.path).toEqual(['marketReadText', 184]);
  });

  it('still returns the whole body as the reason', async () => {
    // The reading is added beside the platform's words, never instead of them.
    const r = await compile(REAL_BODY);
    expect(r.kind === 'rejected' && r.reason).toContain('ALL_AGREE_UP');
  });

  it('claims no structure from prose', async () => {
    const r = await compile('BattleGrid is not answering right now');
    expect(r.kind).toBe('rejected');
    expect(r.kind === 'rejected' && r.refusal).toBeNull();
    expect(r.kind === 'rejected' && r.reason).toContain('not answering');
  });

  it('claims no structure from a body carrying no details', async () => {
    const r = await compile(JSON.stringify({ code: 'VALIDATION_ERROR', message: 'nope' }));
    expect(r.kind === 'rejected' && r.refusal).toBeNull();
  });

  it('survives details whose shape is not what we know', async () => {
    const r = await compile(
      JSON.stringify({ message: 'odd', details: { authoringCode: 7, path: 'nope' } }),
    );
    const refusal = r.kind === 'rejected' ? r.refusal : null;
    // Present but claiming nothing it could not read.
    expect(refusal?.authoringCode).toBeNull();
    expect(refusal?.path).toEqual([]);
    expect(refusal?.context).toEqual({});
  });
});
