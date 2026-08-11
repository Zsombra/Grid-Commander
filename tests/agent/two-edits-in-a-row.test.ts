import { describe, expect, it } from 'vitest';
import { DescribeEditQuery } from '@/application/use-cases/describe-edit.query.js';
import { UpdateAgentCommand } from '@/application/use-cases/update-agent.command.js';
import {
  anAgent,
  FakeAgentsPort,
  liveTradingConfig,
  SequentialRandom,
} from '../support/agent-fakes.js';
import { FakeClock, FakeConfirmationStore } from '../support/fakes.js';

/**
 * Two describe→update cycles in a row, against one agent.
 *
 * `live-write-probe-confirmation-flake`: two consecutive runs of the live
 * write-probe failed at **different** confirmation consumptions. Run A renamed
 * successfully; run B failed at the rename's own consume with "invalid,
 * expired, already used, or issued for something else". Same code, same key,
 * same fakes. Filed 2026-07-31 with two named suspects and a reproduction plan:
 * drive two cycles offline and let the failing combination fall out.
 *
 * This is that reproduction. It confirms one suspect and clears the other.
 *
 * **`FakeAgentsPort` does not enforce a confirmation** — it records what the
 * write bound and returns. `enforce()` is the guard, and it lives in the MCP
 * adapter. So a test that only calls `update.execute` and sees `updated` has
 * proven nothing about binding; the store's own `consume` is what has to be
 * driven, against the target the write actually composed. Same arrangement
 * `edit-binding.test.ts` uses, and for the same reason.
 */

const who = { userId: 'u1', accessToken: 'at' };

function harness() {
  const clock = new FakeClock();
  const confirmations = new FakeConfirmationStore(clock);
  const port = new FakeAgentsPort([anAgent({ tradingConfig: liveTradingConfig() })]);
  return { clock, confirmations, port, update: new UpdateAgentCommand(port) };
}

/** What the write bound its confirmation to, and whether that token spends. */
async function spend(
  h: ReturnType<typeof harness>,
  token: string,
  callIndex: number,
): Promise<boolean> {
  const write = h.port.calls.filter((c) => c.op === 'update')[callIndex];
  const consumed = await h.confirmations.consume(
    token,
    who.userId,
    'update_intelligence_agent',
    write?.target ?? '(the write bound nothing)',
  );
  return consumed !== null;
}

describe('a second edit does not disturb the first', () => {
  it('mints distinct tokens across two DescribeEditQuery instances', async () => {
    /**
     * **The suspect, confirmed — this failed with `expected 'r1' not to be
     * 'r1'` before the fix, which is the whole flake in one line.**
     *
     * `SequentialRandom` counted from zero *per instance*, so two of them both
     * minted `r1`. The live probe constructs a fresh one per describe — `new
     * DescribeEditQuery(agents, confirmations, new SequentialRandom(), clock)`,
     * twice — while sharing one confirmation store, and
     * `FakeConfirmationStore.issue` was a plain `Map.set`.
     *
     * So the second describe **overwrote the first's unconsumed entry**, and
     * the first token then named the second edit's target. Which consume failed
     * depended only on the order the probe happened to spend them in — exactly
     * the "different consumptions on consecutive runs" that was reported.
     *
     * A fixture defect, not a product one, and the useful kind: a fake that
     * models an impossible platform. Real tokens are 32 random bytes and cannot
     * collide; that one could not avoid it. The counter is now per module, and
     * this stands as the regression guard.
     */
    const h = harness();
    const agent = anAgent();

    const first = await new DescribeEditQuery(
      h.port,
      h.confirmations,
      new SequentialRandom(),
      h.clock,
    ).execute({ ...who, agentId: agent.id, changes: { displayName: 'First' } });
    const second = await new DescribeEditQuery(
      h.port,
      h.confirmations,
      new SequentialRandom(),
      h.clock,
    ).execute({ ...who, agentId: agent.id, changes: { displayName: 'Second' } });

    if (first.kind !== 'proposal' || second.kind !== 'proposal') throw new Error('unreachable');

    expect(
      first.proposal.confirmationToken,
      'two fresh SequentialRandoms both count from zero, so the second describe ' +
        'overwrites the first entry in the store and the first agreement is silently retargeted',
    ).not.toBe(second.proposal.confirmationToken);
  });

  it('spends each agreement against the change it described, in either order', async () => {
    /**
     * **The other suspect, cleared.** The item wondered whether the
     * digest-bound `agentEdit` target was recomputed over a `changes` object
     * that differed between describe and update.
     *
     * It is not. `UpdateAgentCommand` rebuilds the intent in the same canonical
     * shape `DescribeEditQuery` digested, and `digestOf` sorts keys — so with
     * one random source both agreements spend, and spending them out of order
     * changes nothing. Nothing about a confirmation is positional.
     */
    const h = harness();
    const agent = anAgent();
    // One source, as `composition.ts` wires it: a single random, shared.
    const describe = new DescribeEditQuery(
      h.port,
      h.confirmations,
      new SequentialRandom(),
      h.clock,
    );

    const rename = await describe.execute({
      ...who,
      agentId: agent.id,
      changes: { displayName: 'Renamed' },
    });
    const retag = await describe.execute({
      ...who,
      agentId: agent.id,
      changes: { displayName: 'Retagged' },
    });
    if (rename.kind !== 'proposal' || retag.kind !== 'proposal') throw new Error('unreachable');
    expect(rename.proposal.confirmationToken).not.toBe(retag.proposal.confirmationToken);

    // Second first, deliberately.
    expect(
      (
        await h.update.execute({
          ...who,
          agentId: agent.id,
          changes: { displayName: 'Retagged' },
          confirmationToken: retag.proposal.confirmationToken,
        })
      ).kind,
    ).toBe('updated');
    expect(
      (
        await h.update.execute({
          ...who,
          agentId: agent.id,
          changes: { displayName: 'Renamed' },
          confirmationToken: rename.proposal.confirmationToken,
        })
      ).kind,
    ).toBe('updated');

    // What the guard would do: each token against the target its own write
    // composed. Both must spend, or an honest second edit is refused — the
    // failure mode DL-5 warns presents as "the edit form stopped working".
    expect(await spend(h, retag.proposal.confirmationToken, 0), 'the later agreement').toBe(true);
    expect(await spend(h, rename.proposal.confirmationToken, 1), 'the earlier one').toBe(true);
  });

  it('still refuses an agreement carried onto a different change', async () => {
    // The property the two above must not have weakened. A token minted for one
    // edit cannot be spent on another — and the fake port will *return* updated
    // either way, which is precisely why the store is what gets asked.
    const h = harness();
    const agent = anAgent();
    const describe = new DescribeEditQuery(
      h.port,
      h.confirmations,
      new SequentialRandom(),
      h.clock,
    );

    const rename = await describe.execute({
      ...who,
      agentId: agent.id,
      changes: { displayName: 'Renamed' },
    });
    if (rename.kind !== 'proposal') throw new Error('unreachable');

    await h.update.execute({
      ...who,
      agentId: agent.id,
      changes: { displayName: 'Something else entirely' },
      confirmationToken: rename.proposal.confirmationToken,
    });

    expect(
      await spend(h, rename.proposal.confirmationToken, 0),
      'an agreement about one name must not authorise another',
    ).toBe(false);
  });

  it('refuses to reissue a confirmation someone could still spend', async () => {
    /**
     * The other half of the fix, and the one that matters more.
     *
     * The counter collision was the trigger; the fake **silently accepting the
     * duplicate** is why it took five days and looked like a product defect.
     * A store that discards an outstanding agreement without a word is not a
     * behaviour any real store has, and imitating it hides exactly this.
     *
     * Refused only while it is *spendable* — unconsumed and unexpired, the same
     * pair `consume` checks. Anything stricter would refuse the honest re-use in
     * `call-path.test.ts`, which walks each refusal cause by reissuing one id.
     */
    const h = harness();
    const outstanding = {
      token: 'dup',
      userId: who.userId,
      tool: 'update_intelligence_agent',
      target: 'agent:a1#digest',
      consequence: 'Renames it.',
      expiresAt: new Date(h.clock.now().getTime() + 300_000),
      consumedAt: null,
    };
    await h.confirmations.issue(outstanding);

    await expect(
      h.confirmations.issue({ ...outstanding, target: 'agent:a1#a-different-digest' }),
      'reissuing a live token would retarget an agreement someone holds',
    ).rejects.toThrow(/already outstanding/);

    // Spent, so there is nothing left to lose.
    await h.confirmations.consume(
      'dup',
      who.userId,
      'update_intelligence_agent',
      'agent:a1#digest',
    );
    await expect(h.confirmations.issue(outstanding)).resolves.toBeUndefined();
  });
});
