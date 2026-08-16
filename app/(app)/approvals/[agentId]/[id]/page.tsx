import { PerformButton } from '@/presentation/components/perform-button.js';
import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { CarriedProblem } from '@/presentation/components/carried-problem.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { acceptDecision, cancelDecision } from './actions.js';

/**
 * One proposed trade, and the answer that can be given to it.
 *
 * The describe runs when this page is opened, so the levels shown, the
 * consequence sentence and the confirmation bound to both are formed from one
 * read taken while somebody is actually looking. A consequence computed when the
 * agent proposed the trade would be a claim about a world that has since moved.
 *
 * ## Why accept is drawn only beside cancel
 *
 * The requirement is "Accept SHALL NOT be offered on a surface where cancel is
 * unavailable", and this surface satisfies it twice over: the two verbs are
 * requested together in one list, and when authority is absent **neither** is
 * drawn. There is no state in which accept appears alone.
 *
 * The order is the render order. Cancel is first because it is the harmless
 * answer and the one nearest the reasoning; accept is never the default thing a
 * hurried click lands on.
 *
 * **History, because the sequence is the point.** `tasks.md` section 4 required
 * a cancel performed *through the product* and confirmed in the audit before any
 * accept surface was written — DL-11 records that the accept port method was
 * implemented early, and that the gate held only because no surface reached it.
 * For that window this file said "there is no accept button here" and meant it.
 * The gate was crossed on 2026-08-17 (4.4 and 4.5 passed, a real decision
 * cancelled through the product with its audit row), section 5 was built, and
 * 7.4 accepted a real decision. That sentence stayed here after it stopped being
 * true and was corrected by the verifier pass on the same change.
 *
 * ## Why absent authority removes the control instead of disabling it
 *
 * UI checklist item 5 and `system.json` principle 10: gate by not rendering. A
 * greyed-out cancel button says the product could do this if the operator found
 * the right lever, on the surface where that belief is most expensive.
 */
export default async function DecisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { agentId, id } = await params;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const q = await searchParams;
  const raw = q['problem'];
  const problemValue = Array.isArray(raw) ? raw[0] : raw;
  const problem = problemValue && problemValue.length > 0 ? problemValue : null;

  // Authority first, because it decides whether a confirmation is minted at all.
  // It governs what is drawn, never whether the write is permitted — that
  // refusal lives in the guard and runs on every path (P1).
  const authority = await app.readAnswerAuthority.execute({ userId: user.authority.userId });

  const result = await app.describeDecisionAnswer.execute({
    ...user.authority,
    agentId,
    decisionId: id,
    // Cancel first, and that ordering is the render order (5.3): the harmless
    // answer is the one nearest the reasoning, and accept is never the default
    // thing a hurried click lands on.
    verbs: ['cancel', 'accept'],
    mintConfirmation: authority.kind === 'held',
  });

  if (result.kind === 'unreadable') {
    return (
      <Shell title="This decision could not be read" problem={problem}>
        <p className="text-base text-text-secondary">{result.reason}</p>
        <div className="text-sm text-text-secondary">
          <WhyNotLoaded cause={result.cause} subject="this decision is" />
        </div>
        <p className="text-sm text-text-secondary">
          This is not the same as it having expired. It may still be waiting, and the
          window may still be running.
        </p>
      </Shell>
    );
  }

  if (result.kind === 'gone') {
    return (
      <Shell title="This decision is no longer available" problem={problem}>
        <p className="text-base text-text-primary">
          Nothing with this reference is on the agent&apos;s record now. Nothing was sent
          to BattleGrid.
        </p>
      </Shell>
    );
  }

  if (result.kind === 'no-longer-answerable') {
    return (
      <Shell
        title={result.status === 'EXPIRED' ? 'This expired unanswered' : 'This is no longer waiting'}
        problem={problem}
      >
        <ExpiredNotice status={result.status} />
      </Shell>
    );
  }

  const { description } = result;
  const d = description.decision;
  /*
   * Every offer that carries a spendable agreement.
   *
   * Narrowed here rather than at each render site so the null check happens
   * once and the type carries the result. `answers` and `offered` differing in
   * length is the only signal the page needs: it means at least one verb could
   * not be minted, and 5.3 says the answer surface is then not drawn at all.
   */
  const offered = description.answers.flatMap((a) =>
    a.confirmationToken === null ? [] : [{ ...a, confirmationToken: a.confirmationToken }],
  );
  const what = [d.direction, d.coinTicker].filter((p) => p !== null && p !== '').join(' ');

  return (
    <Shell title={what === '' ? 'A proposed trade' : `Proposed: ${what}`} problem={problem}>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Level label="Entry" value={d.entryPrice} />
        <Level label="Stop" value={d.stopLoss} />
        <Level label="Target" value={d.takeProfit} />
        <Level label="Conviction" value={d.conviction} />
      </dl>

      {/* The proportion, as a proportion. No currency amount appears on this
          page and none may be added — the platform computes no size until the
          decision is accepted (PE-2). */}
      <p className="text-sm text-text-secondary">
        {d.positionSizePct === null
          ? 'The agent recorded no size for this trade.'
          : `Would stake ${d.positionSizePct}% of the agent's available funds${
              d.positionSizePreset === null ? '' : ` (${d.positionSizePreset})`
            }. BattleGrid sets the actual size at the moment a trade is accepted.`}
      </p>

      {d.reasoning !== null && d.reasoning !== '' && (
        <section className="space-y-2">
          <h2 className="text-base font-medium text-text-primary">The agent&apos;s reasoning</h2>
          <p className="whitespace-pre-wrap text-sm text-text-secondary">{d.reasoning}</p>
        </section>
      )}

      {/*
        No token, no control — and the two conditions are checked together
        rather than one standing in for the other. A token is null exactly when
        authority is absent, but writing `?? ''` to satisfy the compiler would
        coerce a missing agreement into an empty one and render a form that
        could only ever be refused. `concurrency.test.ts` catches that shape,
        and it is right to: an identifier defaulted into existence is how a
        confirmation stops meaning anything.

        **Both answers or neither (5.3).** `offered` keeps only the verbs that
        actually minted, and the block renders only when *every* verb did. An
        accept standing alone would be a surface where the sole available
        answer spends money — the exact arrangement the gate exists to prevent.
      */}
      {authority.kind === 'absent' || offered.length !== description.answers.length ? (
        <StepUpBlock back={`/approvals/${agentId}/${id}`} />
      ) : (
        <AnswerForms agentId={agentId} decisionId={d.id} offers={offered} shown={description.shown} />
      )}
    </Shell>
  );
}

/**
 * The window closed and nobody answered — told as that, and never as a cancel.
 *
 * The product did nothing here. Reporting a cancel would credit it with an act
 * that never happened, and with an outcome the agent's own record contradicts.
 */
function ExpiredNotice({ status }: { status: string | null }) {
  const expired = status === 'EXPIRED';
  return (
    <>
      <p className="text-base text-text-primary">
        {expired
          ? 'The fifteen-minute window closed before anyone answered, so the decision expired on its own. Nothing was cancelled and nothing was bought — no answer was ever sent.'
          : `This decision is no longer awaiting an answer${
              status === null ? '' : ` — BattleGrid reports it as ${status}`
            }. It may have been answered somewhere else. Nothing was sent from here.`}
      </p>
      <p className="text-sm text-text-secondary">
        The agent will not re-propose this trade on its own.
      </p>
    </>
  );
}

/**
 * Fully readable, and no control at all — not a disabled one.
 *
 * The step-up is offered here because the operator is standing in front of the
 * thing that needs it. Quiet tokens rather than danger: nothing has failed, and
 * this is the product's normal, intended posture.
 */
function StepUpBlock({ back }: { back: string }) {
  return (
    <section className="space-y-2 rounded-gc-2 border border-quiet-border bg-quiet-subtle p-4">
      <h2 className="text-base font-medium text-text-primary">
        Answering needs authority this connection does not hold
      </h2>
      <p className="text-sm text-text-primary">
        Grid-Commander connects without authority to commit your funds, and answering a
        proposed trade needs it — cancelling as well as accepting, because BattleGrid
        requires it for both.
      </p>
      <p className="text-sm">
        <a href={`/approvals/authority?next=${encodeURIComponent(back)}`} className="underline">
          Grant authority to answer proposed trades
        </a>
      </p>
    </section>
  );
}

/**
 * Both answers, each behind its own agreement.
 *
 * Takes non-null tokens by type, which is what lets the caller decide by
 * rendering rather than by disabling: no agreement, no form.
 *
 * **The two are separate forms, never one form with two buttons.** A shared
 * form would carry one `confirmationToken`, and the token's target names the
 * verb first precisely so a decline can never be spent opening a position —
 * one form would hand that guarantee back. Two forms, two tokens, two targets.
 *
 * **The six hidden fields are written twice on purpose.** They were briefly
 * extracted into a shared child, and
 * `a-form-sends-what-its-action-reads.test.ts` failed: it reads each form's own
 * JSX for the fields its action requires, so extraction moved them where the
 * guard cannot see and turned a checked pair into an unchecked one. That guard
 * exists because a form which renders its fields and submits nothing is
 * indistinguishable from a working one, and satisfying it by hiding from it
 * would be the defect it was written for. Six duplicated lines is the cheaper
 * of the two costs.
 *
 * **No amount appears on the accept, and none may be added (PE-2).** The
 * platform computes no size until the decision is accepted, so any figure would
 * be this product's arithmetic wearing the platform's authority, on a
 * confirmation, about money. Worse than imprecise: the decision row carries no
 * leverage either, so the proportion is not even sufficient to derive an amount
 * from — see #305. The proportion is what the platform sent and it is what is
 * said.
 */
function AnswerForms({
  agentId,
  decisionId,
  offers,
  shown,
}: {
  agentId: string;
  decisionId: string;
  offers: readonly { verb: 'accept' | 'cancel'; consequence: string; confirmationToken: string }[];
  shown: { entryPrice: number | null; stopLoss: number | null; takeProfit: number | null };
}) {
  return (
    <>
      {offers.map((offer) =>
        offer.verb === 'cancel' ? (
          <section key="cancel" className="space-y-2">
            <h2 className="text-base font-medium text-text-primary">Cancel this proposal</h2>
            {/* The product's own consequence sentence, unchanged, in the same
                consequence role every other confirmation uses. DT-0007. */}
            <p className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-base text-text-primary">
              {offer.consequence}
            </p>
            <form action={cancelDecision} className="space-y-2">
              <input type="hidden" name="agentId" value={agentId} />
              <input type="hidden" name="decisionId" value={decisionId} />
              <input type="hidden" name="confirmationToken" value={offer.confirmationToken} />
              {/* The three levels as they were rendered, carried into the perform.
                  The binding compares these against a fresh read — re-deriving them
                  there would compare the platform against itself and always agree.
                  A tampered value fails the recomputed target. */}
              <input type="hidden" name="entryPrice" value={String(shown.entryPrice ?? '')} />
              <input type="hidden" name="stopLoss" value={String(shown.stopLoss ?? '')} />
              <input type="hidden" name="takeProfit" value={String(shown.takeProfit ?? '')} />
              <PerformButton pendingLabel="Cancelling…">
                Cancel this proposal — the agent will not offer it again
              </PerformButton>
            </form>
          </section>
        ) : (
          <section key="accept" className="space-y-2">
            <h2 className="text-base font-medium text-text-primary">Accept this proposal</h2>
            <p className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-base text-text-primary">
              {offer.consequence}
            </p>
            <form action={acceptDecision} className="space-y-2">
              <input type="hidden" name="agentId" value={agentId} />
              <input type="hidden" name="decisionId" value={decisionId} />
              <input type="hidden" name="confirmationToken" value={offer.confirmationToken} />
              {/* The three levels as they were rendered, carried into the perform.
                  The binding compares these against a fresh read — re-deriving them
                  there would compare the platform against itself and always agree.
                  A tampered value fails the recomputed target. */}
              <input type="hidden" name="entryPrice" value={String(shown.entryPrice ?? '')} />
              <input type="hidden" name="stopLoss" value={String(shown.stopLoss ?? '')} />
              <input type="hidden" name="takeProfit" value={String(shown.takeProfit ?? '')} />
              <PerformButton pendingLabel="Opening the position…">
                Accept — open this position with real money
              </PerformButton>
            </form>
          </section>
        ),
      )}
    </>
  );
}

function Level({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="text-sm text-text-primary">{value === null ? 'not set' : value}</dd>
    </div>
  );
}

function Shell({
  title,
  problem = null,
  children,
}: {
  title: string;
  problem?: string | null;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-medium">{title}</h1>
      <a href="/approvals" className="text-sm underline">
        Back to waiting trades
      </a>
      <CarriedProblem problem={problem} />
      {children}
    </main>
  );
}
