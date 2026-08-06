import type { StrategyCondition } from '@/domain/strategy/condition.js';
import type { DraftStanding } from '@/domain/strategy/condition-draft.js';
import { columnsRead } from '@/domain/strategy/condition-draft.js';
import type { QueryFields } from '../condition-form.js';
import { CLAUSE_OPS, MEMBER_SLOTS } from '../condition-form.js';
import { BUTTON_SECONDARY, CONTROL, LABEL } from './control.js';
import { ConditionStructure } from './strategy-conditions.js';

/**
 * Composing a condition that does not exist, to ask what it would do.
 *
 * `strategy-conditions.tsx` renders the conditions a strategy has;
 * `condition-outcomes.tsx` renders how they resolved. This is the third face of
 * the same layer: a definition an operator writes, sent to BattleGrid to be
 * resolved against live market state, and kept nowhere.
 *
 * **This form cannot save, and says so rather than implying it.** There is no
 * platform tool that writes one condition — the only path is a compiled plan
 * that resubmits the strategy's whole condition list and reconfigures every
 * bound agent atomically — and two facts that path depends on are still
 * unobserved. A composer that looked like an editor would be read as one.
 *
 * `method="get"`, so a tried draft is a URL. That is the right affordance for a
 * surface that changes nothing: it can be kept, shared and hand-edited, and the
 * back button is a real undo rather than an approximation of one.
 *
 * The structure of the draft is drawn by `ConditionStructure` — the same
 * component that draws a saved condition. A second renderer would be a second
 * reading of the grammar, and the two would disagree about a negation
 * eventually.
 */

/** The first value under a key, for round-tripping the form's own state. */
function was(q: QueryFields, key: string): string {
  const raw = q[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value : '';
}

/**
 * One member row.
 *
 * Every operand for every operator is rendered at once rather than switched
 * between, because switching needs client JavaScript and this surface has none
 * to spend. The parser reads only the operands the chosen operator uses, so a
 * row carrying a stale `label` beside a chosen `gt` sends the number and
 * nothing else.
 */
function MemberRow({ index, q }: { index: number; q: QueryFields }) {
  const p = `m${index}.`;
  return (
    <fieldset className="space-y-2 rounded-gc-2 border border-border-default p-3">
      <legend className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Row {index + 1}
      </legend>

      <label className={LABEL}>
        This row is
        <select name={`${p}kind`} defaultValue={was(q, `${p}kind`)} className={CONTROL}>
          <option value="">— unused —</option>
          <option value="clause">a comparison against a report column</option>
          <option value="ref">a reference to another condition</option>
        </select>
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className={LABEL}>
          Referenced condition key
          <input
            type="text"
            name={`${p}ref`}
            defaultValue={was(q, `${p}ref`)}
            list="gc-condition-keys"
            className={CONTROL}
          />
        </label>
        <label className={LABEL}>
          Section key (blank if the column belongs to none)
          <input
            type="text"
            name={`${p}section`}
            defaultValue={was(q, `${p}section`)}
            className={CONTROL}
          />
        </label>
        <label className={LABEL}>
          Column header
          <input
            type="text"
            name={`${p}header`}
            defaultValue={was(q, `${p}header`)}
            list="gc-condition-columns"
            className={CONTROL}
          />
        </label>
        <label className={LABEL}>
          Comparison
          <select name={`${p}op`} defaultValue={was(q, `${p}op`)} className={CONTROL}>
            {CLAUSE_OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </label>
        <label className={LABEL}>
          Number (lt, lte, gte, gt)
          <input
            type="text"
            name={`${p}value`}
            defaultValue={was(q, `${p}value`)}
            className={CONTROL}
          />
        </label>
        <label className={LABEL}>
          Label (is)
          <input
            type="text"
            name={`${p}label`}
            defaultValue={was(q, `${p}label`)}
            className={CONTROL}
          />
        </label>
        <label className={LABEL}>
          Low bound (between)
          <input type="text" name={`${p}low`} defaultValue={was(q, `${p}low`)} className={CONTROL} />
        </label>
        <label className={LABEL}>
          High bound (between)
          <input
            type="text"
            name={`${p}high`}
            defaultValue={was(q, `${p}high`)}
            className={CONTROL}
          />
        </label>
        <label className={`${LABEL} sm:col-span-2`}>
          Labels, comma separated (in)
          <input
            type="text"
            name={`${p}labels`}
            defaultValue={was(q, `${p}labels`)}
            className={CONTROL}
          />
        </label>
      </div>
    </fieldset>
  );
}

export function ConditionComposer({
  q,
  existing,
}: {
  q: QueryFields;
  /** The strategy's own conditions — what the suggestions are drawn from. */
  existing: readonly StrategyCondition[];
}) {
  // Suggestions, never constraints. These are the columns this strategy's own
  // conditions demonstrably read, so they are columns BattleGrid resolves for
  // it — but a column no existing condition uses may be perfectly good, and the
  // platform's refusal is the answer if it is not. There is no tool that lists
  // a strategy's rendered column headers, so the strategy itself is the only
  // honest source; inventing a list would be worse than offering none.
  const columns = columnsRead(existing);
  const existingKeys = existing.map((c) => c.conditionKey);
  const seededFrom = was(q, 'from');
  return (
    <form method="get" className="space-y-4">
      <datalist id="gc-condition-columns">
        {columns.map((c) => (
          <option key={`${c.sectionKey ?? ''}|${c.header}`} value={c.header} />
        ))}
      </datalist>
      <datalist id="gc-condition-keys">
        {existingKeys.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>

      <p className="text-sm text-text-secondary">
        Composing here changes nothing. BattleGrid resolves the draft against live market
        data and answers; no strategy is written to, and this surface has no way to save
        what you compose.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className={LABEL}>
          Condition key
          <input
            type="text"
            name="key"
            defaultValue={was(q, 'key')}
            list="gc-condition-keys"
            className={CONTROL}
          />
        </label>
        <label className={LABEL}>
          Name
          <input type="text" name="name" defaultValue={was(q, 'name')} className={CONTROL} />
        </label>
        <label className={LABEL}>
          Calls
          <select name="verdict" defaultValue={was(q, 'verdict')} className={CONTROL}>
            {/* The empty option first and named for what it means. A condition
                with no verdict is a named building block other conditions
                refer to, not a condition with no opinion — the distinction the
                reading surfaces already turn on. */}
            <option value="">nothing — a named building block</option>
            <option value="UP">UP</option>
            <option value="DOWN">DOWN</option>
            <option value="NEITHER">NEITHER</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className={LABEL}>
          The definition is
          <select name="shape" defaultValue={was(q, 'shape')} className={CONTROL}>
            <option value="single">a single row</option>
            <option value="group">a group over the rows below</option>
          </select>
        </label>
        <label className={LABEL}>
          Group operator
          <select name="groupOp" defaultValue={was(q, 'groupOp')} className={CONTROL}>
            <option value="ALL">ALL — every member must hold</option>
            <option value="ANY">ANY — one member is enough</option>
            <option value="NOT">NOT — the member must not hold</option>
            <option value="N_OF">N_OF — a threshold</option>
          </select>
        </label>
        <label className={LABEL}>
          Threshold (N_OF only)
          <input type="text" name="n" defaultValue={was(q, 'n')} className={CONTROL} />
        </label>
      </div>

      {seededFrom.length > 0 ? (
        <p className="text-sm text-text-secondary">
          The definition is taken whole from <strong>{seededFrom}</strong>, so the rows below
          are ignored. Clear this to compose one from scratch.{' '}
          <a href="?" className="underline">
            Start from scratch
          </a>
          .
        </p>
      ) : null}
      {/* Carried so editing the key or the verdict and submitting again keeps
          the definition it was seeded from. Without it the second submit would
          silently become a from-scratch draft over six empty rows. */}
      <input type="hidden" name="from" value={seededFrom} />

      <div className="space-y-3">
        {Array.from({ length: MEMBER_SLOTS }, (_, i) => (
          <MemberRow key={i} index={i} q={q} />
        ))}
      </div>

      <label className={LABEL}>
        Resolve against (top ranked coins)
        <input type="text" name="limit" defaultValue={was(q, 'limit') || '3'} className={CONTROL} />
      </label>
      <label className={LABEL}>
        …or explicit tickers, comma separated
        <input type="text" name="tickers" defaultValue={was(q, 'tickers')} className={CONTROL} />
      </label>

      {/* Present on every submit so the page knows this is an attempt rather
          than a first visit — the same marker the edit page's compile uses. */}
      <input type="hidden" name="try" value="1" />

      {/* Secondary, like every other submit that only asks. This one asks
          harder than most: the form cannot save, and the paragraph under it
          says so. An accent button would argue with both. */}
      <button type="submit" className={BUTTON_SECONDARY}>
        Try it — ask BattleGrid how this would resolve
      </button>

      {/* Said again at the point of action. The button is the moment an
          operator would assume something is being saved. */}
      <p className="text-xs text-text-secondary">
        Nothing is saved. There is no control on this page that writes to the strategy.
      </p>
    </form>
  );
}

/**
 * The draft, drawn as structure, with what was actually sent alongside it.
 *
 * The second half is not decoration. A condition may refer to another by key,
 * and BattleGrid resolves only the conditions it is handed — so a draft never
 * travels alone. An operator who is not told what travelled with it cannot tell
 * an outcome their draft caused from one its neighbours caused.
 */
export function DraftedCondition({
  draft,
  existing,
  standing,
  alongside,
}: {
  draft: StrategyCondition;
  existing: readonly StrategyCondition[];
  /** Absent while the draft has not been sent — nothing has been composed yet. */
  standing?: DraftStanding | undefined;
  alongside?: number | undefined;
}) {
  const defined = new Set([...existing.map((c) => c.conditionKey), draft.conditionKey]);
  return (
    <section className="space-y-2">
      <h2 className="text-base font-medium text-text-primary">The draft</h2>
      <div className="space-y-1 rounded-gc-2 border border-border-default p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-text-primary">{draft.name}</span>
          <span className="text-xs uppercase text-text-secondary">
            {draft.conditionKey}
            {draft.verdict === null
              ? ' · a named building block, calling nothing'
              : ` · calls ${draft.verdict}`}
          </span>
        </div>
        <div className="text-sm">
          <ConditionStructure definition={draft.definition} defined={defined} />
        </div>
      </div>

      {standing !== undefined && (
        <p className="text-sm text-text-secondary">
          {standing === 'replaced'
            ? `Sent in place of the strategy's own ${draft.conditionKey}, with its other ${alongside} condition(s) alongside it. What came back for this key is the draft's answer, not the saved condition's.`
            : `Sent alongside the strategy's ${alongside} own condition(s), so a reference in the draft had something to resolve against.`}
        </p>
      )}
    </section>
  );
}
