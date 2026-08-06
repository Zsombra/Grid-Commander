import { acting } from '@/presentation/session.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { WhyNotLoaded } from '@/presentation/components/why-not-loaded.js';
import { BUTTON_SECONDARY, CONTROL, LABEL } from '@/presentation/components/control.js';
import { columnFromQuery, columnQuery, timeframeParam } from '@/presentation/column-form.js';
import type { ColumnControls } from '@/ports/strategies.js';

/**
 * One section, opened: the columns it renders, and a workbench for one of them.
 *
 * The section editor chose *whether* a section is included. This is what is
 * inside it — the metrics, transforms, timeframes and per-column parameters the
 * platform actually reads — and the only place a column can be checked before a
 * compile is spent on it.
 *
 * **Nothing here is saved, and the reason is structural rather than temporary.**
 * The compile request's `sections[]` closes a platform section to `{kind,
 * sectionKey}` and carries no columns for it at all: its contents are the
 * platform's, and membership is the whole of what an author chooses. A column of
 * your own travels only inside a custom table, which needs a title, the
 * timeframe-inertia law, and the create-by-definition / modify-by-key loop —
 * a change, not a step. `/strategies/[id]/conditions` made the same call for the
 * same kind of reason and says so on the page; so does this.
 *
 * A GET form on purpose: a contract check reads the grammar and no market
 * values, and writes nothing, so the composed column lives in the URL where it
 * can be shared, retried, and rendered without ceremony.
 */

/** A select over declared values, or a stated absence. Never a guess, never blank. */
function Declared({
  name,
  label,
  values,
  chosen,
  optional = true,
}: {
  name: string;
  label: string;
  values: readonly string[];
  chosen: string | undefined;
  optional?: boolean;
}) {
  // A control the declaration could not answer for is withheld and said to be
  // withheld. Rendering an empty select would tell an author the platform
  // accepts nothing here, which is a different and false claim.
  if (values.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        {`${label}: BattleGrid's declaration did not name the values it accepts, so this control is not offered.`}
      </p>
    );
  }
  return (
    <label className={LABEL}>
      {label}
      <select name={name} className={CONTROL} defaultValue={chosen ?? ''}>
        {optional ? <option value="">— not set —</option> : null}
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Every timeframe the declaration pins, tagged so the two halves stay apart. */
function timeframeOptions(controls: ColumnControls): readonly string[] {
  return [
    ...controls.relativeTimeframes.map((rel) => timeframeParam({ rel })),
    ...controls.absoluteTimeframes.map((abs) => timeframeParam({ abs })),
  ];
}

export default async function SectionColumnsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sectionKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sectionKey } = await params;
  const q = await searchParams;
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const draft = columnFromQuery(q);
  const result = await app.composeColumn.execute({
    ...user.authority,
    sectionKey,
    metric: draft.metric,
    // A malformed draft still reads the section, so the workbench comes back
    // filled in with what was typed rather than blank. Sending nothing is the
    // point: values that do not describe a column are not a question BattleGrid
    // can be asked.
    column: draft.column,
  });

  if (result.kind === 'no-such-section') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">No such section</h1>
        <p className="text-sm">
          {`BattleGrid's vocabulary does not advertise a section called "${sectionKey}".`}
        </p>
        <p className="text-sm">
          <a href="/strategies/sections" className="underline">Back to the section library</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'unreadable') {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <h1 className="text-xl font-medium">The section could not be read</h1>
        <p role="alert" className="text-sm">{result.reason}</p>
        <WhyNotLoaded cause={result.cause} subject="this section is" />
        <p className="text-sm">
          <a href="/strategies/sections" className="underline">Back to the section library</a>
        </p>
      </main>
    );
  }

  const { template, columns, controls } = result;
  const hints = result.hints;
  const check = result.check;
  const key = template.kind === 'platform' ? template.sectionKey : template.templateKey;
  const name = template.label.length > 0 ? template.label : key;
  const chosen = draft.column;
  const transforms = hints?.kind === 'metric' ? hints.hints.transforms : [];
  const chosenTransform = transforms.find((t) => t.id === chosen?.transformId);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-medium">{name}</h1>
      <p className="text-sm">
        {key} · {template.kind}
      </p>
      <p className="text-sm">
        {`This is what the section reads. Compose a column below and BattleGrid compiles its contract — no market values are read and nothing is written. Nothing composed on this page is saved.`}
      </p>

      <section className="space-y-3">
        <h2 className="text-base font-medium">The columns this section renders</h2>
        {template.columns === undefined ? (
          // Not published and none are different claims. The vocabulary's own
          // template entries carry the columns; an entry without them has told
          // us nothing about what the section reads.
          <p className="text-sm">
            {`BattleGrid's vocabulary did not publish this section's columns.`}
          </p>
        ) : columns.length === 0 ? (
          <p className="text-sm">
            {`BattleGrid published this section with an empty column list.`}
          </p>
        ) : (
          <ul className="space-y-2">
            {columns.map((column, index) => (
              <li key={index} className="rounded border p-3 text-sm space-y-1">
                {column.proposal === null ? (
                  <p role="alert">
                    {`Grid-Commander cannot express this column — the platform's entry carries no ${column.missing.join(', ')}.`}
                  </p>
                ) : (
                  <>
                    <p className="font-medium">
                      {column.proposal.metric} · {column.proposal.transformId} ·{' '}
                      {timeframeParam(column.proposal.timeframe)}
                    </p>
                    {column.proposal.window !== undefined ||
                    column.proposal.offset !== undefined ||
                    column.proposal.bars !== undefined ||
                    column.proposal.ordering !== undefined ||
                    column.proposal.side !== undefined ||
                    column.proposal.chainedTransformId !== undefined ||
                    column.proposal.inputs !== undefined ? (
                      <p>
                        {[
                          column.proposal.window !== undefined
                            ? `window ${column.proposal.window}`
                            : null,
                          column.proposal.offset !== undefined
                            ? `offset ${column.proposal.offset}`
                            : null,
                          column.proposal.bars !== undefined
                            ? `bars ${column.proposal.bars}`
                            : null,
                          column.proposal.ordering !== undefined
                            ? `ordering ${column.proposal.ordering}`
                            : null,
                          column.proposal.side !== undefined
                            ? `side ${column.proposal.side}`
                            : null,
                          column.proposal.chainedTransformId !== undefined
                            ? `chained into ${column.proposal.chainedTransformId}`
                            : null,
                          column.proposal.inputs !== undefined
                            ? `operands ${column.proposal.inputs.join(', ')}`
                            : null,
                        ]
                          .filter((part): part is string => part !== null)
                          .join(' · ')}
                      </p>
                    ) : null}
                    <p>
                      <a
                        href={`/strategies/sections/${encodeURIComponent(key)}?${columnQuery(column.proposal)}`}
                        className="underline"
                      >
                        Open this column in the editor
                      </a>
                    </p>
                  </>
                )}
                {/* A key the platform sent that this product does not carry is
                    named. The grammar gained two controls in one deployment and
                    a surface that quietly kept the parts it recognised would
                    describe a narrower column than the platform declared. */}
                {column.unrecognised.length > 0 ? (
                  <p className="text-text-secondary">
                    {`Grid-Commander does not carry: ${column.unrecognised.join(', ')}`}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {template.kind === 'platform' ? (
          <p className="text-sm text-text-secondary">
            {`These belong to BattleGrid. A compile request names a platform section by key and carries no columns for it, so what a strategy chooses about this section is whether to include it — not what is in it.`}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Compose a column</h2>
        <p className="text-sm">
          {`Name a metric to read its transforms, then tune the column and check it. Every enumerated control below is offered from BattleGrid's own declaration, read at the moment this page loaded.`}
        </p>
        <form method="get" className="space-y-3 text-sm">
          <label className={LABEL}>
            Metric
            <input
              type="text"
              name="metric"
              className={CONTROL}
              defaultValue={draft.metric ?? ''}
            />
          </label>
          <p className="text-text-secondary">
            {`Any metric key BattleGrid lists — the metric index has all of them.`}{' '}
            <a href="/strategies/metrics" className="underline">Open the metric index</a>
          </p>

          {hints?.kind === 'metric' ? (
            <>
              <label className={LABEL}>
                Transform
                <select
                  name="transformId"
                  className={CONTROL}
                  defaultValue={chosen?.transformId ?? ''}
                >
                  <option value="">— choose —</option>
                  {transforms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.id})
                    </option>
                  ))}
                </select>
              </label>
              <Declared
                name="tf"
                label="Timeframe"
                values={timeframeOptions(controls)}
                chosen={chosen ? timeframeParam(chosen.timeframe) : undefined}
                optional={false}
              />
              <label className={LABEL}>
                Window
                <input
                  type="text"
                  name="window"
                  className={CONTROL}
                  defaultValue={chosen?.window?.toString() ?? ''}
                />
              </label>
              <label className={LABEL}>
                Offset
                <input
                  type="text"
                  name="offset"
                  className={CONTROL}
                  defaultValue={chosen?.offset?.toString() ?? ''}
                />
              </label>
              <Declared name="bars" label="Bars" values={controls.bars} chosen={chosen?.bars} />
              <Declared
                name="ordering"
                label="Ordering"
                values={controls.ordering}
                chosen={chosen?.ordering}
              />
              <Declared name="side" label="Side" values={controls.sides} chosen={chosen?.side} />
              <label className={LABEL}>
                Chained transform
                <input
                  type="text"
                  name="chained"
                  className={CONTROL}
                  defaultValue={chosen?.chainedTransformId ?? ''}
                />
              </label>
              <label className={LABEL}>
                Operand metrics (comma-separated, for transforms that need one)
                <input
                  type="text"
                  name="inputs"
                  className={CONTROL}
                  defaultValue={chosen?.inputs?.join(', ') ?? ''}
                />
              </label>
            </>
          ) : null}

          <button type="submit" className={BUTTON_SECONDARY}>
            {hints?.kind === 'metric' ? 'Check against the contract' : 'Read this metric'}
          </button>
        </form>

        {draft.problems.length > 0 ? (
          <div className="space-y-1">
            {/* Ours to say, and said as ours. Nothing was sent, so BattleGrid
                has no opinion to report and none is implied. */}
            <h3 className="font-medium">This column is not finished</h3>
            <ul role="alert" className="space-y-1 rounded border p-3 text-sm">
              {draft.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
            <p className="text-text-secondary">{`Nothing was sent to BattleGrid.`}</p>
          </div>
        ) : null}

        {hints?.kind === 'no-such-metric' ? (
          <p role="alert" className="rounded border p-3 text-sm">
            {`BattleGrid does not list a metric by that key, so nothing was sent to be checked.`}
          </p>
        ) : null}

        {hints?.kind === 'unreadable' ? (
          <div className="rounded border p-3 text-sm">
            <p role="alert">{hints.reason}</p>
            <WhyNotLoaded cause={hints.cause} subject="this metric is" />
          </div>
        ) : null}
      </section>

      {hints?.kind === 'metric' ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">What {hints.hints.summary.id} is</h2>
          <p className="text-sm">
            {hints.hints.summary.label} · {hints.hints.summary.family}
            {hints.hints.summary.unit ? ` · ${hints.hints.summary.unit}` : ''}
            {hints.hints.summary.precision !== null
              ? ` · precision ${hints.hints.summary.precision}`
              : ''}
            {hints.hints.summary.range
              ? ` · range ${hints.hints.summary.range[0]}–${hints.hints.summary.range[1]}`
              : ''}
            {hints.hints.summary.timeframeMode
              ? ` · ${hints.hints.summary.timeframeMode}`
              : ''}
          </p>
          {/* The chosen transform in full, the rest by name. The metric card
              renders all of them; here the one being configured is the one
              worth a paragraph. */}
          {chosenTransform ? (
            <div className="rounded border p-3 text-sm space-y-1">
              <p className="font-medium">
                {chosenTransform.label} · {chosenTransform.id}
                {chosenTransform.operandRequired ? ' · needs an operand' : ''}
              </p>
              {chosenTransform.calculationSummary ? (
                <p>{chosenTransform.calculationSummary}</p>
              ) : null}
              {chosenTransform.formula ? (
                <p className="font-mono text-xs">{chosenTransform.formula}</p>
              ) : null}
              {chosenTransform.parameters.length > 0 ? (
                <ul className="space-y-1">
                  {chosenTransform.parameters.map((p) => (
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
              {chosenTransform.nullBehavior ? (
                <p className="text-text-secondary">{chosenTransform.nullBehavior}</p>
              ) : null}
              {chosenTransform.chainSuccessors.length > 0 ? (
                <p>Chains into: {chosenTransform.chainSuccessors.join(', ')}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm">
              Transforms it takes: {transforms.map((t) => t.id).join(', ')}
            </p>
          )}
          <p className="text-sm">
            <a
              href={`/strategies/metrics/${encodeURIComponent(hints.hints.summary.id)}`}
              className="underline"
            >
              {`The full card for this metric`}
            </a>
          </p>
        </section>
      ) : null}

      {check?.kind === 'contract' ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">The column compiles</h2>
          <div className="rounded border p-3 text-sm space-y-1">
            {check.contract.formula ? (
              <p className="font-mono text-xs">{check.contract.formula}</p>
            ) : null}
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
                  .map(
                    ([k, v]) =>
                      `${k}=${v === null ? '—' : String(Array.isArray(v) ? JSON.stringify(v) : v)}`,
                  )
                  .join(' · ')}
              </p>
            ) : null}
            {check.contract.nullBehavior ? (
              <p className="text-text-secondary">{check.contract.nullBehavior}</p>
            ) : null}
            {check.contract.nullSentinel ? (
              <p>{`Nulls present as "${check.contract.nullSentinel}".`}</p>
            ) : null}
            {check.contract.requiresSectionTimeframe ? (
              <p>{`This column takes its timeframe from the section it sits in.`}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {check?.kind === 'refused' ? (
        <section className="space-y-2">
          <h2 className="text-base font-medium">
            {`BattleGrid refused this column — here is why`}
          </h2>
          {/* The validator's own teaching, structure and all: the offending
              path, the value it received, and what is legal in its place.
              Flattening it to "invalid" would discard the most instructive
              dataset this surface has. */}
          <div className="rounded border p-3 text-sm space-y-1">
            <p role="alert">{check.refusal.message}</p>
            {check.refusal.authoringCode ? <p>Code: {check.refusal.authoringCode}</p> : null}
            {check.refusal.path.length > 0 ? <p>At: {check.refusal.path.join('.')}</p> : null}
            {check.refusal.received !== null ? <p>Received: {check.refusal.received}</p> : null}
            {check.refusal.allowedValues.length > 0 ? (
              <p>Legal here: {check.refusal.allowedValues.join(', ')}</p>
            ) : null}
            {check.refusal.allowedRule ? (
              <p className="text-text-secondary">{check.refusal.allowedRule}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {check?.kind === 'unreadable' ? (
        <p role="alert" className="text-sm">{check.reason}</p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-medium">Where a column composed here can go</h2>
        <p className="text-sm">
          {`Nowhere yet, and deliberately. A column reaches a strategy only inside a custom table, which needs a title, a timeframe that obeys the platform's inertia law, and BattleGrid's create-by-definition then modify-by-key loop. None of that is built, so this page composes and checks a column and stops there — which is still the only way to know a column is well-formed without spending a compile on a real strategy.`}
        </p>
        <p className="text-sm">
          <a href="/strategies/sections" className="underline">Back to the section library</a>
        </p>
      </section>
    </main>
  );
}
