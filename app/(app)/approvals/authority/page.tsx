import { PerformButton } from '@/presentation/components/perform-button.js';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { NothingToConnect } from '@/presentation/components/nothing-to-connect.js';
import { grantAnswerAuthority } from './actions.js';

/**
 * The one place this product asks for authority to commit funds.
 *
 * **Offered from the point of use, and only when the operator asks.** Nothing
 * begins a step-up on its own initiative, on a schedule, in response to a model,
 * or as a side effect of reading anything — this page is a destination somebody
 * navigates to from a decision they are looking at, and the grant itself starts
 * only when they submit the form below.
 *
 * Keeping this out of the connect flow is the product's central safety claim:
 * every user who never answers a decision connects with reading and
 * configuration authority and is never asked for more. `REQUESTED_SCOPES` still
 * holds `mcp:read` alone, and `tests/agent/wager.test.ts` fails if that changes.
 *
 * An operator who begins this and abandons it has changed nothing. A connection
 * exists only once BattleGrid confirms a grant, so there is no half-state to
 * clean up and no authority recorded that is not held.
 */
export default async function AnswerAuthorityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { personal } = app;
  // A configured credential cannot be stepped up by anyone here: its scopes are
  // a declaration the operator made in the environment, not a grant this product
  // can widen. Offering a button that cannot work is the failure
  // "A Remedy Named Must Exist In That Deployment" is about.
  if (personal) return <NothingToConnect />;

  const q = await searchParams;
  const rawNext = q['next'];
  const nextValue = Array.isArray(rawNext) ? rawNext[0] : rawNext;
  // Only a path within this product, never an absolute URL. A `next` taken
  // whole would let a crafted link bounce somebody to another origin carrying
  // the appearance of this product's authority behind them.
  const next = nextValue !== undefined && nextValue.startsWith('/') && !nextValue.startsWith('//')
    ? nextValue
    : '/approvals';

  const authority = await app.readAnswerAuthority.execute({ userId: user.authority.userId });

  if (authority.kind === 'held') {
    return (
      <Shell title="You already have this authority">
        <p className="text-base text-text-primary">
          This connection can already answer proposed trades. Nothing needs granting.
        </p>
        <p className="text-sm">
          <a href={next} className="underline">
            Back to the decision
          </a>
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Grant authority to answer proposed trades">
      <p className="text-base text-text-primary">
        Grid-Commander connects without authority to commit your funds, and it does not ask
        for it when you connect. Answering a proposed trade needs it — BattleGrid requires
        that authority for cancelling as well as accepting.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-medium text-text-primary">What this would permit</h2>
        <ul className="space-y-2">
          {authority.permits.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-text-primary">
              <span aria-hidden="true">•</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* The sentence being agreed to, in the consequence role every other
          confirmation in this product uses for the same job. */}
      <p className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-base text-text-primary">
        This permits Grid-Commander to commit your money at BattleGrid. It will only ever
        do so for a trade you accept yourself, on a decision one of your agents proposed,
        after showing you what it costs — but the authority itself is real, and it is
        yours to withdraw at battlegrid.trade whenever you choose.
      </p>

      <Caps />
      <GrantForm />
      <WayOut next={next} />
    </Shell>
  );
}

/**
 * The platform's own limits are unchanged by this grant.
 *
 * Spec-bearing copy, not reassurance — the requirement obliges the step-up to
 * say that the caps continue to apply. It must not be read as making the
 * authority safe: the caps bound how much can be spent, not whether it is.
 */
function Caps() {
  return (
    <p className="text-sm text-text-secondary">
      Your BattleGrid limits do not change. Every cap you set on an agent — what it may
      lose in a day, in total, and hold at once — continues to apply exactly as it does
      now, and the platform enforces them whoever asks.
    </p>
  );
}

/**
 * The only control in the product that asks for authority over someone's money.
 *
 * No hidden `next`. The grant leaves for BattleGrid and returns through the
 * OAuth callback, which knows nothing about this page — carrying a destination
 * here would render a control whose value no operation ever reads, and
 * `reachability.test.ts` catches exactly that.
 */
function GrantForm() {
  return (
    <form action={grantAnswerAuthority}>
      <PerformButton pendingLabel="Sending you to BattleGrid…">
        Continue to BattleGrid to grant this
      </PerformButton>
    </form>
  );
}

/**
 * Leaving without granting, as a visible peer of the grant.
 *
 * A page asking for authority over somebody's money with no stated way out is a
 * page that pressures. `next` is honoured here because this is a plain
 * navigation the page performs itself, and it has already been checked to be an
 * in-product path.
 */
function WayOut({ next }: { next: string }) {
  return (
    <p className="text-sm">
      <a href={next} className="underline">
        Not now — go back without granting anything
      </a>
    </p>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">{title}</h1>
      {children}
    </main>
  );
}
