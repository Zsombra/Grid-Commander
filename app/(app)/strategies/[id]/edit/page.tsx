import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';
import { compiledPlan, requiredText, updateCompileIntent } from '@/presentation/form.js';
import { PlanReviewPanel } from '@/presentation/components/plan-review.js';
import { NotConnected } from '@/presentation/require-connection.js';
import { BUTTON_SECONDARY, CHECKBOX, CONTROL, LABEL } from '@/presentation/components/control.js';
/**
 * Compose a change, compile it, and review what applying would do.
 *
 * Compiling on this page produces the review panel. There is no control here
 * that applies — applying is an action on a review, reached only by compiling
 * first, because the platform made compiling effect-free so a human could look
 * before committing. See S-G.
 */
export default async function EditStrategyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    compile?: string;
    tagline?: string;
    sections?: string | string[];
    unknownSections?: string | string[];
  }>;
}) {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') return <NotConnected result={user} />;

  const { id } = await params;
  const sp = await searchParams;
  const compile = sp.compile;
  const tagline = sp.tagline ?? '';
  const selectedKeys = toArray(sp.sections);
  const unknownSectionParams = toArray(sp.unknownSections);

  const result = await app.readSectionOptions.execute({ ...user.authority, strategyId: id });

  if (result.kind === 'strategy-missing') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">No such strategy</h1>
        <p className="text-sm">
          <a href="/strategies" className={BUTTON_SECONDARY}>Back to your strategies</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'strategy-unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">Strategy could not be read</h1>
        <p className="text-sm">
          <a href="/strategies" className={BUTTON_SECONDARY}>Back to your strategies</a>
        </p>
      </main>
    );
  }

  if (result.kind === 'vocabulary-unreadable') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">
          Cannot edit this strategy right now
        </h1>
        <p role="alert" className="rounded-gc-2 border border-notice-border bg-notice-subtle p-4 text-sm text-text-primary">
          The vocabulary a strategy is composed from comes from BattleGrid, and it
          could not be read. Composing a change without it would mean guessing at
          values the platform will reject.
        </p>
        <p className="text-sm">
          <a href={`/strategies/${id}`} className={BUTTON_SECONDARY}>Back to strategy</a>
        </p>
      </main>
    );
  }

  // TypeScript now knows result.kind === 'ready'.
  const detail = result.detail;
  const strategy = detail.summary;

  /**
   * The way back, on every state this page can render.
   *
   * Held once because there are five of them and this page had it on none. It
   * rendered exactly four links, all of them the global navigation — so someone
   * composing a change to a strategy could reach Agents, Strategies and Activity,
   * and not the strategy in front of them.
   */
  const back = (
    <a href={`/strategies/${strategy.id}`} className="underline">
      Back to {strategy.name}
    </a>
  );

  if (compile !== '1') {
    // Sections in the current strategy that have no matching template are kept as
    // hidden inputs so a compile round-trips them unchanged.
    const platformKeys = new Set(
      result.templates.flatMap((t) => (t.kind === 'platform' ? [t.sectionKey] : [])),
    );
    const unknownSections = detail.sections.filter(
      (s) => !platformKeys.has(s.sectionKey),
    );

    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-medium text-text-primary">Edit {strategy.name}</h1>
          {/* The blast radius met a page earlier — the same fact wears the same
              clothes it wears on the review (DT-0015): consequence when agents
              are reached, plain when none are. */}
          {strategy.boundAgentCount === 0 ? (
            <p className="mt-1 text-sm font-medium">No agents are bound to this strategy.</p>
          ) : (
            <p className="mt-2 rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm font-medium text-text-primary">
              {`${strategy.boundAgentCount} agent${strategy.boundAgentCount === 1 ? '' : 's'} would be reconfigured by an applied change.`}
            </p>
          )}
        </div>
        <form method="get" className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="tagline" className={LABEL}>Tagline</label>
            <input
              id="tagline"
              name="tagline"
              type="text"
              defaultValue={strategy.tagline ?? ''}
              className={CONTROL}
            />
          </div>

          <fieldset className="space-y-4">
            <legend className="text-sm font-medium">Sections</legend>
            {/* This checklist says which sections, and nothing about what any
                of them reads. The library behind this link is where a section's
                own columns are — the question an author actually has while
                ticking these boxes. */}
            <p className="text-xs text-text-secondary">
              What each section reads — its columns, their metrics and
              transforms — is in{' '}
              <a href="/strategies/sections" className="underline">the section library</a>.
            </p>
            {/* The ceilings a preview of this composition runs under, published
                by the platform's own discovery since v9.0.0. Shown here rather
                than on the preview page because this is where a section is
                added — by the time a preview is refused for being too large,
                the refusal already says so in the platform's words.

                Absent when the platform does not publish them, and never
                defaulted: an invented ceiling would be read as the platform's,
                and an author would compose against a number nobody enforces. */}
            {result.limits ? (
              <p className="text-xs text-text-secondary">
                A preview of this composition may render up to{' '}
                {result.limits.maxResultBytes.toLocaleString('en-US')} bytes and run for{' '}
                {Math.round(result.limits.deadlineMs / 1000)} seconds. Past either, BattleGrid
                refuses the preview rather than truncating it.
              </p>
            ) : null}
            {result.categories.map((cat) => {
              const catTemplates = result.templates.filter((t) => t.category === cat.category);
              if (catTemplates.length === 0) return null;
              return (
                <fieldset key={cat.category} className="space-y-1">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    {cat.label}
                  </legend>
                  <div className="space-y-1 pl-2">
                    {catTemplates.map((template) => {
                      const key =
                        template.kind === 'platform' ? template.sectionKey : template.templateKey;
                      const checked =
                        template.kind === 'platform' &&
                        detail.sections.some(
                          (s) => s.sectionKey === template.sectionKey,
                        );
                      return (
                        <label key={key} className="flex min-h-control items-center gap-2 text-sm tablet:min-h-0">
                          <input
                            type="checkbox"
                            name="sections"
                            value={key}
                            defaultChecked={checked}
                            className={CHECKBOX}
                          />
                          {template.label}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            {/* Templates the platform returned without a category. */}
            {(() => {
              const ungrouped = result.templates.filter((t) => !t.category);
              if (ungrouped.length === 0) return null;
              return (
                <div className="space-y-1">
                  {ungrouped.map((template) => {
                    const key =
                      template.kind === 'platform' ? template.sectionKey : template.templateKey;
                    const checked =
                      template.kind === 'platform' &&
                      detail.sections.some(
                        (s) => s.sectionKey === template.sectionKey,
                      );
                    return (
                      <label key={key} className="flex min-h-control items-center gap-2 text-sm tablet:min-h-0">
                        <input
                          type="checkbox"
                          name="sections"
                          value={key}
                          defaultChecked={checked}
                          className={CHECKBOX}
                        />
                        {template.label}
                      </label>
                    );
                  })}
                </div>
              );
            })()}
          </fieldset>

          {/* Sections the strategy contains that the vocabulary does not recognise.
              Round-tripped as hidden inputs so they survive a compile without
              being silently dropped. */}
          {unknownSections.map((s) => (
            <input
              key={s.sectionKey}
              type="hidden"
              name="unknownSections"
              value={`${s.kind}:${s.sectionKey}`}
            />
          ))}

          {/* Present on every submit so the handler knows this is a compile, not
              a page load. */}
          <input type="hidden" name="compile" value="1" />

          {/* Secondary on purpose. Compiling is effect-free and the review it
              produces carries the only primary in this flow — DT-0002's Apply.
              Two accent buttons in one journey would put the same weight on
              looking and on doing. */}
          <button type="submit" className={BUTTON_SECONDARY}>
            Compile — see what this would do, without doing it
          </button>
        </form>
        <p className="text-sm">{back}</p>
      </main>
    );
  }

  // compile === '1': reconstruct sections from form params and compile.
  const knownSections: Array<{ kind: string; sectionKey: string }> = [];
  for (const key of selectedKeys) {
    const template = result.templates.find(
      (t) =>
        (t.kind === 'platform' && t.sectionKey === key) ||
        (t.kind === 'custom' && t.templateKey === key),
    );
    if (!template) continue;
    knownSections.push(
      template.kind === 'platform'
        ? { kind: 'platform', sectionKey: template.sectionKey }
        : { kind: 'custom', sectionKey: template.templateKey },
    );
  }

  const parsedUnknownSections: Array<{ kind: string; sectionKey: string }> = [];
  for (const param of unknownSectionParams) {
    const colon = param.indexOf(':');
    if (colon < 1) continue;
    parsedUnknownSections.push({ kind: param.slice(0, colon), sectionKey: param.slice(colon + 1) });
  }

  const sections: Array<{ kind: string; sectionKey: string }> = [
    ...knownSections,
    ...parsedUnknownSections,
  ];

  const taglineChanged = tagline !== (strategy.tagline ?? '');
  const currentSectionKeys = new Set(detail.sections.map((s) => s.sectionKey));
  const newSectionKeys = new Set(sections.map((s) => s.sectionKey));
  const sectionsChanged =
    currentSectionKeys.size !== newSectionKeys.size ||
    [...newSectionKeys].some((k) => !currentSectionKeys.has(k)) ||
    [...currentSectionKeys].some((k) => !newSectionKeys.has(k));

  const intentSummary =
    taglineChanged && sectionsChanged
      ? `Edit ${strategy.name}`
      : taglineChanged
        ? `Change the tagline of ${strategy.name}`
        : `Change the sections of ${strategy.name}`;

  const assumptions =
    taglineChanged && sectionsChanged
      ? ['Tagline and sections change']
      : taglineChanged
        ? ['Only the tagline changes']
        : ['Only the sections change'];

  // Held in one place — the domain builder the conformance guard also calls,
  // so what is checked is what is sent. It is both what is compiled and what
  // `describeApply` digests to check the screen still matches the plan.
  const intent = updateCompileIntent({
    strategyId: id,
    expectedRevision: strategy.revision,
    intentSummary,
    assumptions,
    tagline,
    sections,
  });

  const compiled = await app.compilePlan.execute({ ...user.authority, request: intent });

  if (compiled.kind === 'rejected') {
    return (
      <main className="mx-auto max-w-2xl space-y-4 p-6">
        <h1 className="text-2xl font-medium text-text-primary">
          BattleGrid could not compile this change to {strategy.name}
        </h1>
        <p role="alert" className="rounded-gc-2 border border-danger-default bg-danger-subtle p-4 text-sm text-text-primary">{compiled.reason}</p>
        {/* The absence of effect, visually committed — quiet, never danger's
            palette (DT-0015, system principle on absence). */}
        <p className="rounded-gc-2 border border-quiet-border bg-quiet-subtle p-4 text-sm text-text-primary">Nothing was changed.</p>
        <p className="flex flex-wrap gap-3 text-sm">
          {/* Both, and in this order. The reason usually names what to change,
              so the first thing offered is another attempt. */}
          <a href={`/strategies/${strategy.id}/edit`} className="underline">
            Compose a different change
          </a>
          {back}
        </p>
      </main>
    );
  }

  const proposal = await app.describeApply.execute({
    ...user.authority,
    strategyId: id,
    plan: compiled.review.plan,
    currentIntent: intent,
    currentRevision: strategy.revision,
  });

  if (proposal.kind === 'refused') {
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <h1 className="text-2xl font-medium text-text-primary">Review: {strategy.name}</h1>
        {/* The review still renders — the user should see what was compiled even
            when it cannot be applied, because the reason usually names what to
            change. */}
        <PlanReviewPanel
          review={compiled.review}
          action={apply}
          changeIt={`/strategies/${strategy.id}/edit`}
          applyBlockedBecause={proposal.reason}
        />
        <p className="text-sm">{back}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-medium text-text-primary">Review: {strategy.name}</h1>
      <PlanReviewPanel
        review={compiled.review}
        action={apply}
        // The compose form, which is what "change it" means. Without compile in
        // the query it renders the section checklist at the strategy's current state.
        changeIt={`/strategies/${strategy.id}/edit`}
        confirmation={{
          strategyId: id,
          confirmationToken: proposal.proposal.confirmationToken,
          consequence: proposal.proposal.consequence,
        }}
      />
      {/* Declining a review is not an operation and needs no button of its own —
          but it does need somewhere to go. */}
      <p className="text-sm">{back}</p>
    </main>
  );
}

/**
 * Apply the plan that was reviewed — not a freshly compiled one.
 *
 * The compiled plan travels through the form rather than being recompiled here.
 * Recompiling would produce a plan with the same intent digest and possibly
 * different contents, and "what is applied is what was reviewed" is a
 * requirement rather than an aspiration.
 *
 * Carrying it through the browser is safe because it is not trusted: the
 * confirmation is bound to `strategy:<id>#<intentDigest>`, so a plan altered in
 * transit produces a different digest, the confirmation fails to consume, and
 * the write is refused before it reaches BattleGrid.
 */
export async function apply(formData: FormData) {
  'use server';
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const strategyId = requiredText(formData, 'strategyId');
  await app.applyPlan.execute({
    ...user.authority,
    strategyId,
    plan: compiledPlan(formData, 'plan'),
    confirmationToken: requiredText(formData, 'confirmationToken'),
  });
  redirect('/strategies');
}

function toArray(val: string | string[] | undefined): string[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
