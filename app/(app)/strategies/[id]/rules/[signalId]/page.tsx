import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  CONTROL,
  LABEL,
} from '@/presentation/components/control.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { requiredInteger, requiredText } from '@/presentation/form.js';
import type { SignalParameter } from '@/ports/strategies.js';

/**
 * Retuning one signal rule: the scorecard write, behind the ceremony.
 *
 * Two steps on one route, the deploy pattern. Without a proposal in the
 * query the page is the tuning form — allocation, the Required flag, and
 * the signal's declared parameters prefilled from the rule itself. With a
 * proposal, the describe runs: it reads the strategy fresh, refuses a
 * signal the strategy does not weigh and a change that changes nothing,
 * states the blast radius with the platform's own propagation wording, and
 * mints the token the confirm form spends. The consequence on screen is
 * the string stored with the token.
 */

const ALLOCATIONS = [0, 1, 2, 3] as const;

function one(q: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = q[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s !== undefined && s.length > 0 ? s : undefined;
}

/** The declared parameters, read as numbers; null when one does not parse. */
function paramsFrom(
  declared: readonly SignalParameter[],
  q: Record<string, string | string[] | undefined>,
): Readonly<Record<string, number>> | null | undefined {
  if (declared.length === 0) return undefined;
  const out: Record<string, number> = {};
  for (const p of declared) {
    const raw = one(q, `p_${p.key}`);
    if (raw === undefined) return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    out[p.key] = n;
  }
  return out;
}

export default async function RetuneRulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; signalId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id, signalId } = await params;
  const q = await searchParams;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const read = await app.readStrategy.execute({ ...user.authority, strategyId: id });
  if (read.kind === 'missing') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className="underline">Back to strategies</a>
        </p>
      </main>
    );
  }
  if (read.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The strategy could not be read</h1>
        <p role="alert" className="text-sm">{read.reason}</p>
        {/* Distinct from the `missing` branch above, which is the platform
            saying the strategy is not there. This one says nothing at all. */}
        <WhyNotLoaded cause={read.cause} subject="this strategy is" />
        <p className="text-sm">
          <a href={`/strategies/${id}`} className="underline">Back to the strategy</a>
        </p>
      </main>
    );
  }

  const { summary } = read.detail;
  const rule = read.detail.signalRules.find((r) => r.signalId === signalId);
  if (!rule) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Not one of this strategy&apos;s rules</h1>
        <p className="text-sm">
          &quot;{summary.name}&quot; does not weigh {signalId}. Only a rule the
          strategy already carries can be retuned here.
        </p>
        <p className="text-sm">
          <a href={`/strategies/${id}`} className="underline">Back to {summary.name}</a>
        </p>
      </main>
    );
  }

  // The signal's declared parameters give the form its fields, bounds and
  // defaults — the platform's own contract, read fresh.
  const signal = await app.readSignal.execute({ ...user.authority, signalId });
  const declared = signal.kind === 'signal' ? signal.definition.parameters : [];

  const problem = one(q, 'problem');
  const allocationRaw = one(q, 'a');

  if (allocationRaw === undefined) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">
          Retune {signalId} on {summary.name}
        </h1>
        <p className="text-sm">
          Currently allocation {rule.allocation}
          {rule.required ? ', required' : ', not required'}. Changing it reaches
          every agent bound to this strategy immediately.
          {signal.kind === 'signal' ? (
            <>
              {' '}
              <a href={`/strategies/signals/${signalId}`} className="underline">
                What this signal does
              </a>
            </>
          ) : null}
        </p>
        {problem ? <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary"><span className="font-semibold">Refused: </span>{problem}</p> : null}
        <form method="get" className="space-y-3 text-sm">
          <label className={LABEL}>
            Allocation (weight, 0–3)
            <select name="a" className={CONTROL} defaultValue={String(rule.allocation)}>
              {ALLOCATIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <input type="checkbox" name="req" value="1" defaultChecked={rule.required} /> Required —
            the setup is gated on this signal firing
          </label>
          {declared.map((p) => (
            <label key={p.key} className={LABEL}>
              {p.key}
              {p.min !== null || p.max !== null ? ` (${p.min ?? '…'}–${p.max ?? '…'})` : ''}
              <input
                type="text"
                name={`p_${p.key}`}
                className={CONTROL}
                defaultValue={String(
                  (rule.params as Record<string, unknown> | null)?.[p.key] ?? p.defaultValue ?? '',
                )}
              />
              {/* The parameter's own description, not part of its name — so it
                  drops the label's weight rather than inheriting it. */}
              {p.description ? (
                <span className="block font-normal text-text-secondary">{p.description}</span>
              ) : null}
            </label>
          ))}
          {declared.length === 0 && signal.kind !== 'signal' ? (
            <p role="alert">
              The signal&apos;s parameter contract could not be read, so only the
              allocation and Required flag can be retuned right now.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className={BUTTON_SECONDARY}>
              See what this change would do
            </button>
            <a href={`/strategies/${id}`} className={BUTTON_SECONDARY}>
              Back to the strategy
            </a>
          </div>
        </form>
      </main>
    );
  }

  const ruleParams = paramsFrom(declared, q);
  if (ruleParams === null) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Those parameters do not read as numbers</h1>
        <p role="alert" className="text-sm">
          Every declared parameter needs a numeric value before the change can
          be described.
        </p>
        <p className="text-sm">
          <a href={`/strategies/${id}/rules/${signalId}`} className="underline">Compose it again</a>
        </p>
      </main>
    );
  }

  const intent = {
    allocation: Number.parseInt(allocationRaw, 10),
    required: one(q, 'req') === '1',
    ruleParams,
  };
  const described = await app.describeRetune.execute({
    ...user.authority,
    strategyId: id,
    signalId,
    intent,
  });

  if (described.kind !== 'proposal') {
    const reason =
      described.kind === 'strategy-missing'
        ? 'The strategy is no longer visible to this account.'
        : described.kind === 'not-a-rule' || described.kind === 'no-op'
          ? described.reason
          : described.reason;
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-xl font-medium">Cannot retune</h1>
        <p role="alert" className="text-sm">{reason}</p>
        <p className="text-sm">
          <a href={`/strategies/${id}/rules/${signalId}`} className="underline">Choose differently</a>
          {' · '}
          <a href={`/strategies/${id}`} className="underline">Back to the strategy</a>
        </p>
      </main>
    );
  }

  const { proposal } = described;
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-medium">
        Retune {proposal.signalId} on {proposal.strategyName}?
      </h1>
      {problem ? <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary"><span className="font-semibold">Refused: </span>{problem}</p> : null}
      <p role="alert" className="rounded-gc-2 border border-border-default p-4 text-sm">{proposal.consequence}</p>
      {intent.ruleParams !== undefined ? (
        <p className="text-sm">
          Parameters:{' '}
          {Object.entries(intent.ruleParams)
            .map(([k, v]) => `${k}=${v}`)
            .join(' · ')}
        </p>
      ) : null}
      <form action={performRetune} className="flex flex-wrap gap-3">
        <input type="hidden" name="strategyId" value={proposal.strategyId} />
        <input type="hidden" name="signalId" value={proposal.signalId} />
        <input type="hidden" name="expectedRevision" value={proposal.expectedRevision} />
        <input type="hidden" name="allocation" value={proposal.intent.allocation} />
        <input type="hidden" name="required" value={proposal.intent.required ? '1' : '0'} />
        {proposal.intent.ruleParams !== undefined ? (
          <input type="hidden" name="paramsJson" value={JSON.stringify(proposal.intent.ruleParams)} />
        ) : null}
        <input type="hidden" name="confirmationToken" value={proposal.confirmationToken} />
        <button type="submit" className={BUTTON_PRIMARY}>
          Retune {proposal.signalId}
        </button>
        <a href={`/strategies/${proposal.strategyId}`} className={BUTTON_SECONDARY}>
          Leave things as they are
        </a>
      </form>
    </main>
  );
}

export async function performRetune(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  const signalId = requiredText(formData, 'signalId');
  const allocation = requiredInteger(formData, 'allocation');
  const required = requiredText(formData, 'required') === '1';
  const paramsJson = formData.get('paramsJson');
  const ruleParams =
    typeof paramsJson === 'string' && paramsJson.length > 0
      ? (JSON.parse(paramsJson) as Record<string, number>)
      : undefined;

  const result = await app.retuneRule.execute({
    ...user.authority,
    strategyId,
    signalId,
    expectedRevision: requiredInteger(formData, 'expectedRevision'),
    intent: { allocation, required, ruleParams },
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });

  if (result.kind === 'refused') {
    // Back to the surface acted from, with the choice preserved so the
    // describe re-runs against the fresh strategy.
    const query = new URLSearchParams({ a: String(allocation), problem: result.reason });
    if (required) query.set('req', '1');
    if (ruleParams) for (const [k, v] of Object.entries(ruleParams)) query.set(`p_${k}`, String(v));
    redirect(`/strategies/${strategyId}/rules/${signalId}?${query.toString()}`);
  }
  redirect(`/strategies/${strategyId}`);
}
