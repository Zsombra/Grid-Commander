import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import { SetLifecycleCommand } from '@/application/use-cases/lifecycle.command.js';
import { RebindAgentCommand } from '@/application/use-cases/rebind-agent.command.js';
import { anAgent, FakeAgentsPort } from '../support/agent-fakes.js';

const who = { userId: 'u1', accessToken: 'at' };

/** A8 — every mutation carries the revision the intent was formed against. */
describe('conflict_names_the_agent', () => {
  it('sends the revision the agent was read at', async () => {
    const port = new FakeAgentsPort([anAgent({ revision: 7 })]);
    await new UpdateAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      changes: { displayName: 'Renamed' },
    });
    expect(port.calls[0]).toMatchObject({ op: 'update', revision: 7 });
  });

  it('fails when the agent moved underneath the intent', async () => {
    // The caller formed its intent at revision 1; the agent is now at 4.
    const port = new FakeAgentsPort([anAgent({ revision: 4 })]);
    await expect(
      port.updateAgent({ ...who, agentId: 'a1', expectedRevision: 1, changes: {} }),
    ).rejects.toThrow(/revision/i);
  });

  it('does not reapply the intent against the new state', async () => {
    const port = new FakeAgentsPort([anAgent({ revision: 4 })]);
    await port
      .updateAgent({ ...who, agentId: 'a1', expectedRevision: 1, changes: { displayName: 'x' } })
      .catch(() => undefined);
    // One attempt, no silent second one at the fresher revision.
    expect(port.calls.filter((c) => c.op === 'update')).toHaveLength(1);
    expect(port.agents.get('a1')?.displayName).toBe('Volatilis');
  });

  it('carries the revision through a lifecycle change too', async () => {
    const port = new FakeAgentsPort([anAgent({ revision: 2 })]);
    await new SetLifecycleCommand(port).execute({
      ...who,
      agentId: 'a1',
      to: 'ARCHIVED',
      expectedRevision: 2,
    });
    expect(port.calls[0]).toMatchObject({ op: 'lifecycle:ARCHIVED', revision: 2 });
  });

  it('carries the revision through a rebind too', async () => {
    const port = new FakeAgentsPort([anAgent({ revision: 5 })]);
    await new RebindAgentCommand(port).execute({
      ...who,
      agentId: 'a1',
      toStrategyId: 's-new',
      expectedRevision: 5,
      confirmationToken: 'tok',
    });
    expect(port.calls[0]).toMatchObject({ op: 'rebind', revision: 5 });
  });
});

/**
 * A8, second scenario — a mutation composed without a revision must not be
 * attempted.
 *
 * Asserted structurally rather than behaviourally: the port's mutating methods
 * take `expectedRevision` as a required field, so omitting it does not compile.
 * A runtime check would be a second, weaker copy of a guarantee the type system
 * already gives — this test's job is to notice if someone weakens the type.
 */
describe('structurally_impossible', () => {
  const port = readFileSync('src/ports/agents.ts', 'utf8');

  it('requires a revision on every mutating port method', () => {
    for (const method of ['updateAgent', 'rebindAgent', 'setLifecycle']) {
      const start = port.indexOf(`${method}(params: {`);
      expect(start, `${method} not found`).toBeGreaterThan(-1);
      const block = port.slice(start, port.indexOf('}): Promise', start));
      expect(block, `${method} must require expectedRevision`).toContain('expectedRevision: number;');
      expect(block, `${method} must not make it optional`).not.toContain('expectedRevision?');
    }
  });

  it('substitutes no value for a revision it was not given', () => {
    /**
     * `expectedRevision ?? -1` is the exact defect the production gate found in
     * change 1 (PG-003): a fabricated number standing in for one the caller
     * never supplied, and then shown to the user as though the system had held
     * it.
     *
     * `?? null` is the permitted form — it is how absence is represented, not
     * how it is papered over. Anything else is a substitution.
     */
    for (const file of filesUnder('src')) {
      const text = readFileSync(file, 'utf8');
      for (const [, fallback] of text.matchAll(/expectedRevision\s*\?\?\s*([^,;)\n]+)/g)) {
        expect(fallback?.trim(), `${file} substitutes a value for an absent revision`).toBe('null');
      }
    }
  });
});

function filesUnder(dir: string): string[] {
  let out: string[] = [];
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full));
    else if (full.endsWith('.ts')) out.push(full);
  }
  return out;
}
