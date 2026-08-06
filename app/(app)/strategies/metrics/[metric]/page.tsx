import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { CONTROL } from '@/presentation/components/control.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import type { ColumnProposal } from '@/ports/strategies.js';

/**
 * One metric's card, and the column workbench beneath it.
 *
 * The card is the platform's authoring detail per transform. The form is a
 * GET form on purpose — a contract check reads nothing but the grammar and
 * writes nothing at all, so the composed column lives in the URL where it
 * can be shared, retried, and rendered without ceremony.
 *
 * A refused check is not an error state: the platform's validator answers
 * with the offending path, the value received, and what is legal in its
 * place. That structure is the most instructive dataset this surface has,
 * and it renders as guidance, never flattened into "invalid".
 */

const REL_TIMEFRAMES = ['anchor', 'lower', 'higher', 'regime'] as const;

function proposalFrom(
  metric: string,
  q: Record<string, string | string[] | undefined>,
): ColumnProposal | null {
  const one = (key: string): string | undefined => {
    const v = q[key];
    const s = Array.isArray(v) ? v[0] : v;
    return s && s.length > 0 ? s : undefined;
  };
  const transformId = one('transformId');
  if (!transformId) return null;

  const tf = one('tf') ?? 'anchor';
  const timeframe = (REL_TIMEFRAMES as readonly string[]).includes(tf) ? { rel: tf } : { abs: tf };

  const int = (key: string): number | undefined => {
    const s = one(key);
    if (s === undefined) return undefined;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const inputsRaw = one('inputs');

  return {
    metric,
    transformId,
    timeframe,
    chainedTransformId: one('chained'),
    window: int('window'),
    offset: int('offset'),
    side: one('side'),
    inputs: inputsRaw
      ? inputsRaw
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : undefined,
    bars: one('bars'),
    ordering: one('ordering'),
  };
}

export default async function MetricPage({
  params,
  searchParams,
}: {
  params: Promise<{ metric: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { metric } = await params;
  const q = await searchParams;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const result = await app.readMetric.execute({ ...user.authority, metric });

  if (result.kind === 'no-such-metric') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such metric</h1>
        <p className="text-sm">BattleGrid does not list a metric named &quot;{metric}&quot;.</p>
        <p className="text-sm">
          <a href="/strategies/metrics" className="underline">Back to the metric index</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The metric could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        <WhyNotLoaded cause={result.cause} subject="this metric is" />
        <p className="text-sm">
          <a href="/strategies/metrics" className="underline">Back to the metric index</a>
        </p>
      </main>
    );
  }

  const { summary, transforms } = result.hints;
  const proposal = proposalFrom(metric, q);
  const check = proposal ? await app.checkColumn.execute({ ...user.authority, column: proposal }) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">{summary.label}</h1>
      <p className="text-sm">
        {summary.id} · {summary.family}
        {summary.unit ? ` · ${summary.unit}` : ''}
        {summary.precision !== null ? ` · precision ${summary.precision}` : ''}
        {summary.range ? ` · range ${summary.range[0]}–${summary.range[1]}` : ''}
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Transforms</h2>
        {transforms.map((t) => (
          <div key={t.id} className="rounded border p-3 text-sm space-y-1">
            <p className="font-medium">
              {t.label} · {t.id}
              {t.operandRequired ? ' · needs an operand' : ''}
            </p>
            {t.calculationSummary ? <p>{t.calculationSummary}</p> : null}
            {t.formula ? <p className="font-mono text-xs">{t.formula}</p> : null}
            {t.parameters.length > 0 ? (
              <ul className="space-y-1">
                {t.parameters.map((p) => (
                  <li key={p.key}>
                    <span className="font-medium">{p.key}</span>
                    {p.required ? ' (required)' : ''}
                    {p.defaultValue !== null ? ` · default ${p.defaultValue}` : ''}
                    {p.description ? ` — ${p.description}` : ''}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No parameters.</p>
            )}
            {t.nullBehavior ? <p className="text-text-secondary">{t.nullBehavior}</p> : null}
            {t.chainSuccessors.length > 0 ? (
              <p>Chains into: {t.chainSuccessors.join(', ')}</p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Check a column</h2>
        <p className="text-sm">
          Compose a candidate column and BattleGrid compiles its contract —
          no market data is read and nothing is written. A refusal explains
          the grammar in the platform&apos;s own words.
        </p>
        <form method="get" className="space-y-3 text-sm">
          <label className="block">
            Transform
            <select name="transformId" className={CONTROL} defaultValue={proposal?.transformId ?? ''}>
              <option value="">— choose —</option>
              {transforms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.id})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            Timeframe
            <input
              type="text"
              name="tf"
              className={CONTROL}
              defaultValue={
                proposal ? ('rel' in proposal.timeframe ? proposal.timeframe.rel : proposal.timeframe.abs) : 'anchor'
              }
            />
          </label>
          <label className="block">
            Operand metrics (comma-separated, for transforms that need one)
            <input type="text" name="inputs" className={CONTROL} defaultValue={proposal?.inputs?.join(', ') ?? ''} />
          </label>
          <label className="block">
            Window
            <input type="text" name="window" className={CONTROL} defaultValue={proposal?.window?.toString() ?? ''} />
          </label>
          <label className="block">
            Offset
            <input type="text" name="offset" className={CONTROL} defaultValue={proposal?.offset?.toString() ?? ''} />
          </label>
          <button type="submit" className="rounded border px-4 py-2 text-sm">
            Check against the contract
          </button>
        </form>

        {check?.kind === 'contract' ? (
          <div className="rounded border p-3 text-sm space-y-1">
            <h3 className="font-medium">The column compiles</h3>
            {check.contract.formula ? <p className="font-mono text-xs">{check.contract.formula}</p> : null}
            {check.contract.calculationSummary ? <p>{check.contract.calculationSummary}</p> : null}
            <ul className="space-y-1">
              {check.contract.outputs.map((o) => (
                <li key={o.header}>
                  <span className="font-medium">{o.header}</span>
                  {o.unit ? ` (${o.unit})` : ''}
                  {o.meaning ? ` — ${o.meaning}` : ''}
                  {o.nullable ? ' · may be null' : ''}
                </li>
              ))}
            </ul>
            {Object.keys(check.contract.effectiveParameters).length > 0 ? (
              <p>
                Effective parameters:{' '}
                {Object.entries(check.contract.effectiveParameters)
                  .map(([k, v]) => `${k}=${v === null ? '—' : String(Array.isArray(v) ? JSON.stringify(v) : v)}`)
                  .join(' · ')}
              </p>
            ) : null}
            {check.contract.nullBehavior ? (
              <p className="text-text-secondary">{check.contract.nullBehavior}</p>
            ) : null}
            {check.contract.nullSentinel ? (
              <p>Nulls present as &quot;{check.contract.nullSentinel}&quot;.</p>
            ) : null}
            {check.contract.requiresSectionTimeframe ? (
              <p>This column takes its timeframe from the section it sits in.</p>
            ) : null}
          </div>
        ) : null}

        {check?.kind === 'refused' ? (
          <div className="rounded border p-3 text-sm space-y-1">
            <h3 className="font-medium">The platform refused this column — here is why</h3>
            <p>{check.refusal.message}</p>
            {check.refusal.path.length > 0 ? <p>At: {check.refusal.path.join('.')}</p> : null}
            {check.refusal.received !== null ? <p>Received: {check.refusal.received}</p> : null}
            {check.refusal.allowedValues.length > 0 ? (
              <p>Legal here: {check.refusal.allowedValues.join(', ')}</p>
            ) : null}
            {check.refusal.allowedRule ? (
              <p className="text-text-secondary">{check.refusal.allowedRule}</p>
            ) : null}
          </div>
        ) : null}

        {check?.kind === 'no-such-metric' ? (
          <p role="alert" className="text-sm">
            BattleGrid does not list this metric anymore — re-open the index.
          </p>
        ) : null}

        {check?.kind === 'unreadable' ? (
          <p role="alert" className="text-sm">{check.reason}</p>
        ) : null}
      </section>

      <p className="text-sm">
        <a href="/strategies/metrics" className="underline">Back to the metric index</a>
      </p>
    </main>
  );
}
