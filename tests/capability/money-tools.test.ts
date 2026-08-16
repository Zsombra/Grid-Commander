import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { buildClassificationMap } from '@/domain/capability/classify.js';
import { UNKNOWN_TOOL } from '@/domain/capability/tool-class.js';
import type { DiscoveredTool } from '@/domain/capability/tool-class.js';
import {
  REACHABLE_MONEY_TOOLS,
  commitsFunds,
  declaredScopeFor,
} from '@/infrastructure/battlegrid/money-tools.js';
import { beginGuardedCall } from '@/infrastructure/battlegrid/call-path.js';
import { ScopeUnavailableError, ConfirmationRequiredError } from '@/domain/errors.js';
import { CONFIRMATION_TTL_SECONDS } from '@/domain/capability/confirmation.js';
import { FakeAuditStore, FakeClock, FakeConfirmationStore } from '../support/fakes.js';
import { FORBIDDEN_MONEY_TOOL_NAMES } from '../support/money-tools.js';

/**
 * #340 — the port knows what costs money.
 *
 * Two gates protect a write: the connection must hold the authority, and a
 * person must have agreed to the consequence. Measured on 2026-08-17, **neither
 * fired** on `accept_entry_decision`, the only operation this product has that
 * opens a real position:
 *
 * ```
 * accept_entry_decision -> {"destructive":false,"requiredScope":"mcp:read"}
 * accept admitted on mcp:read alone, no token. audit row destructive: false
 * ```
 *
 * The confirmation gate keyed to BattleGrid's `destructiveHint`, which is
 * `false` there and `true` on cancel. The scope gate had no producer at all:
 * nothing set `declaredScope`, so every known tool classified as `mcp:read`.
 *
 * **These tests drive the composed path**, never a hand-built `ToolClass`. The
 * reason is the reason the defect survived: `answer-authority.test.ts` asserted
 * correctly against a classification production never produced, and passed
 * throughout.
 */

const RECORD = 'docs/battlegrid-mcp-capabilities.json';

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Tools as the surface record reports them. */
function surfaceTools(): Array<Record<string, unknown>> {
  const parsed = JSON.parse(readFileSync(RECORD, 'utf8')) as Record<string, unknown>;
  const tools = (parsed['tools'] ?? parsed) as Array<Record<string, unknown>>;
  return tools;
}

/**
 * Discovery, mapped the way `rawDiscoverTools` maps it.
 *
 * Mirrors the adapter rather than importing it, because the adapter needs a
 * network. The mirror is only honest while the adapter really calls
 * `declaredScopeFor`, which the last test in this file asserts.
 */
function discovered(): readonly DiscoveredTool[] {
  return surfaceTools().map((t) => ({
    name: t['name'] as string,
    description: t['description'] as string | undefined,
    annotations: t['annotations'] as DiscoveredTool['annotations'],
    declaredScope: declaredScopeFor(t['name'] as string),
  }));
}

describe('the two lists partition the money-committing tools', () => {
  it('shares no name between reachable and forbidden', () => {
    const both = Object.keys(REACHABLE_MONEY_TOOLS).filter((n) =>
      FORBIDDEN_MONEY_TOOL_NAMES.includes(n),
    );
    expect(both, 'a tool is either reachable or forbidden, never both').toEqual([]);
  });

  it('gives every name a reason', () => {
    for (const [name, why] of Object.entries(REACHABLE_MONEY_TOOLS)) {
      expect(why.length, `${name} needs a reason, not a placeholder`).toBeGreaterThan(20);
    }
  });

  it('names only tools the platform actually publishes', () => {
    const published = new Set(surfaceTools().map((t) => t['name'] as string));
    const missing = [...Object.keys(REACHABLE_MONEY_TOOLS), ...FORBIDDEN_MONEY_TOOL_NAMES].filter(
      (n) => !published.has(n),
    );
    // A name that no longer resolves is the failure mode CLAUDE.md warns about
    // when it says never hard-code a tool list: the list stops matching and
    // nothing says so.
    expect(missing, 'every listed tool must exist on the surface record').toEqual([]);
  });

  it('is reading a real surface record', () => {
    // An empty scan passes every assertion above it. #194 and #338 both shipped
    // that failure, so the scan proves it read something first.
    const published = surfaceTools();
    expect(published.length).toBeGreaterThan(100);
    expect(FORBIDDEN_MONEY_TOOL_NAMES.length).toBeGreaterThan(5);
    expect(Object.keys(REACHABLE_MONEY_TOOLS).length).toBeGreaterThan(0);
  });
});

describe('classification, from the real record through the real mapping', () => {
  const map = buildClassificationMap(discovered());

  it('requires fund-committing authority for the write that opens a position', () => {
    const accept = map.get('accept_entry_decision');
    expect(accept?.requiredScope).toBe('mcp:wager');
    expect(accept?.destructive, 'a person must agree before money moves').toBe(true);
  });

  it('keeps the platform’s contrary claim as evidence rather than discarding it', () => {
    // The disagreement is the point: BattleGrid says this one is harmless.
    expect(map.get('accept_entry_decision')?.platformDestructiveHint).toBe(false);
    expect(map.get('cancel_entry_decision')?.platformDestructiveHint).toBe(true);
  });

  it('leaves cancel gated, as it always was', () => {
    const cancel = map.get('cancel_entry_decision');
    expect(cancel?.requiredScope).toBe('mcp:wager');
    expect(cancel?.destructive).toBe(true);
  });

  it('does not promote an ordinary write', () => {
    // update_intelligence_agent mutates and is destructive by the platform's own
    // account, but commits no funds — it must not acquire wager authority.
    expect(map.get('update_intelligence_agent')?.requiredScope).toBe('mcp:read');
  });

  it('leaves a plain read alone', () => {
    const read = map.get('get_account_state');
    expect(read?.mutating).toBe(false);
    expect(read?.requiredScope).toBe('mcp:read');
  });

  it('still fails closed on a tool nobody has classified', () => {
    expect(map.get('a_tool_that_does_not_exist')).toBeUndefined();
    expect(UNKNOWN_TOOL.destructive).toBe(true);
    expect(UNKNOWN_TOOL.requiredScope).toBe('mcp:wager');
  });
});

describe('both gates fire at the port', () => {
  const map = buildClassificationMap(discovered());
  let clock: FakeClock;
  let audit: FakeAuditStore;
  let confirmations: FakeConfirmationStore;

  beforeEach(() => {
    clock = new FakeClock();
    audit = new FakeAuditStore(clock);
    confirmations = new FakeConfirmationStore(clock);
  });

  const call = (tool: string) => ({
    userId: 'u1',
    tool,
    classification: map.get(tool)!,
  });

  it('refuses accept on a read-only connection, before it is attempted', async () => {
    const err: unknown = await beginGuardedCall(
      { audit, confirmations, heldScopes: ['mcp:read'] },
      call('accept_entry_decision'),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ScopeUnavailableError);
    expect((err as Error).message).toContain('mcp:wager');
    // A refusal is not an attempt.
    expect(audit.entries).toEqual([]);
  });

  it('refuses accept with the authority but no confirmation', async () => {
    const err: unknown = await beginGuardedCall(
      { audit, confirmations, heldScopes: ['mcp:read', 'mcp:wager'] },
      call('accept_entry_decision'),
    ).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConfirmationRequiredError);
    expect(audit.entries).toEqual([]);
  });

  it('records the consequence when the write is admitted', async () => {
    await confirmations.issue({
      token: 'tok-1',
      userId: 'u1',
      tool: 'accept_entry_decision',
      target: 'decision:accept:abc',
      consequence: 'Opens a position at real size with your money.',
      expiresAt: new Date(clock.now().getTime() + CONFIRMATION_TTL_SECONDS * 1000),
      consumedAt: null,
    });
    const id = await beginGuardedCall(
      { audit, confirmations, heldScopes: ['mcp:read', 'mcp:wager'] },
      {
        ...call('accept_entry_decision'),
        confirmationToken: 'tok-1',
        target: 'decision:accept:abc',
      },
    );
    expect(id).toBeTruthy();
    expect(audit.entries[0]?.destructive, 'the row states what we did').toBe(true);
  });
});

describe('the mirror of the adapter is honest', () => {
  it('the adapter really calls declaredScopeFor', () => {
    // `discovered()` above mirrors `rawDiscoverTools`. The mirror is only valid
    // while the adapter does the same thing, and nothing else in this file
    // would notice if it stopped.
    const adapter = readFileSync('src/infrastructure/battlegrid/mcp-adapter.ts', 'utf8');
    expect(adapter).toContain('declaredScopeFor(');
  });

  it('the domain names no tool, anywhere under src/domain', () => {
    // Scoped to one file at first, which is how a comment in `tool-class.ts`
    // naming a released tool got past it and was caught by A10 instead. A guard
    // narrower than the rule it enforces is a guard with a hole in it.
    const domain = filesUnder('src/domain');
    expect(domain.length, 'the scan must be reading real files').toBeGreaterThan(20);
    const offenders: string[] = [];
    for (const file of domain) {
      const text = readFileSync(file, 'utf8');
      for (const name of [...Object.keys(REACHABLE_MONEY_TOOLS), ...FORBIDDEN_MONEY_TOOL_NAMES]) {
        if (text.includes(name)) offenders.push(`${file}: ${name}`);
      }
    }
    expect(offenders, 'the domain must name no BattleGrid tool').toEqual([]);
    expect(commitsFunds('accept_entry_decision')).toBe(true);
    expect(commitsFunds('get_account_state')).toBe(false);
  });
});
