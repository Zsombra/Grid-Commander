import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { AgentPageHeading } from '@/presentation/components/agent-page-heading.js';
import { CoinVerdict, ScreenedCoins } from '@/presentation/components/coin-qualification.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';

/**
 * Would it take these coins, and if not, what stops it.
 *
 * The one prospective surface in the product. Everything else under `/agents`
 * explains what already happened; this asks the platform to screen the agent's
 * gates now, without spending an LLM call and without the agent acting.
 *
 * Reading, choosing the coins and naming their source are all
 * `ReadQualificationQuery`'s. This page renders and imports no domain (W-D).
 *
 * `?coins=BTC,ETH` overrides the choice. Kept as a query parameter rather than
 * a form because it is a read with no consequence — a link someone can paste,
 * which is the whole point of a screening surface.
 */
export default async function QualificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ coins?: string | string[] | undefined }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const { coins } = await searchParams;
  const asked = (Array.isArray(coins) ? coins.join(',') : (coins ?? ''))
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const [screening, roster] = await Promise.all([
    app.readQualification.execute({
      ...user.authority,
      agentId: id,
      ...(asked.length > 0 ? { coinTickers: asked } : {}),
    }),
    app.listAgents.execute(user.authority),
  ]);
  const agent =
    roster.roster.kind === 'agents' ? roster.roster.agents.find((a) => a.id === id) : undefined;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <AgentPageHeading
        subject="whether it would take a coin"
        agentId={id}
        agentName={agent?.displayName ?? null}
        sibling={{ href: `/agents/${id}/pipeline`, label: "Why it did or didn't trade" }}
      />

      <p className="text-sm">
        BattleGrid screens each coin against this agent&apos;s own gates, as they
        are set right now. Nothing is traded and no decision is recorded.
      </p>

      {/*
        Three outcomes, and only one of them is a list of verdicts. The other
        two are said in words rather than rendered as an empty list, because an
        empty list here reads as "your agent would take nothing" — a claim
        about the agent's settings made on the strength of a read that failed.
      */}
      {screening.kind === 'no-coins' ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">Nothing to screen</h2>
          <p className="text-sm">{screening.reason}</p>
          <p className="text-sm">
            <a href={`/agents/${id}/deploy`} className="underline">
              Deploy it somewhere
            </a>{' '}
            or name coins yourself with <code>?coins=BTC,ETH</code>.
          </p>
        </section>
      ) : (
        <>
          <ScreenedCoins source={screening.source} />

          {screening.result.kind === 'unreadable' ? (
            <section role="alert" className="space-y-1 text-sm">
              <p>The screening could not be read: {screening.result.reason}</p>
              <WhyNotLoaded cause={screening.result.cause} subject="your agent is" />
            </section>
          ) : screening.result.kind === 'none' ? (
            <p className="text-sm">
              BattleGrid returned no verdict for any of these coins. That is the
              platform declining to screen them, not this agent refusing them.
            </p>
          ) : (
            <ul className="space-y-3">
              {screening.result.verdicts.map((v) => (
                <CoinVerdict key={v.coinTicker} v={v} />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
