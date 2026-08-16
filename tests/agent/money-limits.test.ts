import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CreateAgentCommand } from '@/application/use-cases/create-agent.command.js';
import {
  removesTheLimit,
  TRADING_CONFIG_FIELDS,
  unboundedCaps,
  UNBOUNDED_AT_ZERO,
  undefaultableFields,
} from '@/domain/agent/catalog.js';
import type { Catalog } from '@/domain/agent/catalog.js';
import { buildTradingConfig } from '@/domain/agent/trading-config.js';
import { anAgent, defaultCatalog, FakeAgentsPort } from '../support/agent-fakes.js';
import { readText } from '../support/source-tree.js';

/**
 * What an agent is allowed to do with money.
 *
 * The page that creates agents passed `tradingConfig: null`. BattleGrid
 * declares a default for leverage, stop loss, trade count and a dozen other
 * knobs — and **none** for `tradingMode`, `maxDailyLossUsd`,
 * `maxCumulativeDrawdownUsd`, `maxConcurrentExposureUsd`, `balanceThresholdUsd`
 * or `minAllocationUsd`. Omitting them did not inherit something sensible; it
 * left the money questions unanswered.
 *
 * Both live agents on the account this was built against run `FULL_EXECUTION`
 * at 5× leverage, and one of them carries `maxDailyLossUsd: 0`. That is the
 * neighbourhood this button was creating things in.
 */

const MONEY = {
  tradingMode: 'OFF',
  minAllocationUsd: 10,
  balanceThresholdUsd: 10,
  maxConcurrentExposureUsd: 250,
  maxCumulativeDrawdownUsd: 300,
  maxDailyLossUsd: 300,
};

const who = { userId: 'u1', accessToken: 'at' };
const validCreate = (money: Readonly<Record<string, unknown>> = MONEY) => ({
  ...who,
  displayName: 'Probe',
  brain: { kind: 'preset', preset: 'ROMMEL' } as const,
  strategyId: 's1',
  money,
});

describe('the platform decides which questions it will not answer', () => {
  it('names every field the catalog does not default', () => {
    // Derived, not listed. If BattleGrid starts defaulting one it stops being
    // asked, and if it stops defaulting one it starts — with nobody editing a
    // list here.
    //
    // Eight, not six: `positionManagement` and `positionSizePresets` are
    // composite objects the catalog cannot express as a flat default. The
    // command supplies those from `positionManagementFrom` /
    // `positionSizePresetsFrom`; only the other six reach the operator.
    expect(undefaultableFields(defaultCatalog())).toEqual([
      'tradingMode',
      'minAllocationUsd',
      'balanceThresholdUsd',
      'maxConcurrentExposureUsd',
      'maxCumulativeDrawdownUsd',
      'maxDailyLossUsd',
      'positionSizePresets',
      'positionManagement',
    ]);
  });

  it('leaves exactly the money questions for the operator', () => {
    // The form guards each control on `undefaultableFields`, so this is the set
    // that actually renders — and every one of them is a question about money.
    const composite = ['positionSizePresets', 'positionManagement'];
    const asked = undefaultableFields(defaultCatalog()).filter((f) => !composite.includes(f));
    expect(asked).toHaveLength(6);
    expect(asked).toContain('maxDailyLossUsd');
    expect(asked).toContain('tradingMode');
  });

  it('stops asking for a field the moment the platform defaults it', () => {
    const catalog: Catalog = {
      ...defaultCatalog(),
      defaults: { ...defaultCatalog().defaults, maxDailyLossUsd: 100 },
    };
    expect(undefaultableFields(catalog)).not.toContain('maxDailyLossUsd');
  });

  it('covers every field the write schema requires', () => {
    // All fifteen — twenty at v13, eighteen at v14, and v15 moved the three
    // trade-level policy fields onto the strategy.
    // `tradingConfig` is all-or-nothing: BattleGrid rejects a partial one and
    // resets what a partial send omits, so a field missing from this list is a
    // field silently wiped on every create.
    expect(TRADING_CONFIG_FIELDS).toHaveLength(15);
    expect(TRADING_CONFIG_FIELDS).toContain('positionManagement');
    expect(TRADING_CONFIG_FIELDS).toContain('positionSizePresets');
  });
});

describe('a config is complete or it is refused', () => {
  const catalog = defaultCatalog();
  const structural = {
    positionManagement: { positionManagementPreset: 'CUSTOM' },
    positionSizePresets: { sizingStrategy: 'FIXED' },
  };

  it('fills what the platform defaults', () => {
    const built = buildTradingConfig(catalog, { ...MONEY, ...structural });
    expect(built.kind).toBe('config');
    if (built.kind !== 'config') return;
    expect(built.config.fields['maxLeverage']).toBe(1);
    // v15 removed maxStopLossPct from the write set; maxDailyTrades is the
    // surviving field the catalog still defaults.
    expect(built.config.fields['maxDailyTrades']).toBe(10);
  });

  it('carries every required field, so nothing is silently reset', () => {
    const built = buildTradingConfig(catalog, { ...MONEY, ...structural });
    if (built.kind !== 'config') throw new Error('expected a config');
    for (const field of TRADING_CONFIG_FIELDS) {
      expect(built.config.fields, `${field} would be reset by a partial send`).toHaveProperty(field);
    }
  });

  it('prefers what the operator answered over what the platform defaults', () => {
    const built = buildTradingConfig(catalog, { ...MONEY, ...structural, maxLeverage: 3 });
    expect(built.kind === 'config' && built.config.fields['maxLeverage']).toBe(3);
  });

  it('refuses when a money question has no answer, and says which', () => {
    const incomplete: Record<string, unknown> = { ...MONEY, ...structural };
    delete incomplete['maxDailyLossUsd'];
    const built = buildTradingConfig(catalog, incomplete);
    expect(built.kind).toBe('incomplete');
    expect(built.kind === 'incomplete' && built.missing).toEqual(['maxDailyLossUsd']);
  });

  it('treats an empty string as unanswered, not as zero', () => {
    // `Number('')` is 0, and a `maxDailyLossUsd` of 0 is the most expensive
    // possible misreading of an empty box.
    const built = buildTradingConfig(catalog, { ...MONEY, ...structural, maxDailyLossUsd: '' });
    expect(built.kind).toBe('incomplete');
  });

  it('treats null as unanswered', () => {
    const built = buildTradingConfig(catalog, { ...MONEY, ...structural, maxDailyLossUsd: null });
    expect(built.kind).toBe('incomplete');
  });

  it('keeps a genuine zero the operator typed', () => {
    // Zero is a real answer and it reaches the platform unchanged. What it
    // *means* is corrected below: BattleGrid reads it as "no daily limit", not
    // as "lose nothing". The comment that used to sit here said the opposite,
    // and it was the reason nothing questioned a zero anywhere else.
    const built = buildTradingConfig(catalog, { ...MONEY, ...structural, maxDailyLossUsd: 0 });
    expect(built.kind === 'config' && built.config.fields['maxDailyLossUsd']).toBe(0);
  });
});

describe('creating an agent', () => {
  it('refuses when the money questions are unanswered', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    const result = await new CreateAgentCommand(port).execute(validCreate({}));

    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.issues.map((i) => i.field)).toContain('maxDailyLossUsd');
    expect(result.issues.find((i) => i.field === 'maxDailyLossUsd')?.reason).toMatch(
      /no default/i,
    );
  });

  it('does not reach the platform when they are unanswered', async () => {
    // The one case where creating anyway is worse than not creating: the agent
    // would exist and trade under limits nobody chose.
    const port = new FakeAgentsPort([anAgent()]);
    await new CreateAgentCommand(port).execute(validCreate({}));
    expect(port.created).toHaveLength(0);
  });

  it('sends a complete config when they are answered', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    const result = await new CreateAgentCommand(port).execute(validCreate());

    expect(result.kind).toBe('created');
    expect(port.created).toHaveLength(1);
    const sent = port.created[0]?.tradingConfig;
    expect(sent, 'tradingConfig was null for the whole life of this product').not.toBeNull();
    for (const field of TRADING_CONFIG_FIELDS) {
      expect(sent?.fields).toHaveProperty(field);
    }
  });

  it('sends the money limits the operator actually chose', async () => {
    const port = new FakeAgentsPort([anAgent()]);
    await new CreateAgentCommand(port).execute(validCreate({ ...MONEY, maxDailyLossUsd: 42 }));
    expect(port.created[0]?.tradingConfig?.fields['maxDailyLossUsd']).toBe(42);
  });
});

describe('the safe answer is the default answer', () => {
  const form = () => readText('src/presentation/components/money-limits.tsx');

  it('offers OFF, and offers it first', () => {
    // The only answer that makes the other five harmless: an agent that does
    // not trade cannot exceed a loss cap.
    //
    // This asserted the literal `defaultValue="OFF"` and broke when the same
    // component learned to prefill for editing. The property was never the
    // literal — it is that OFF is what you get when there is nothing to
    // prefill.
    const source = form();
    expect(source).toMatch(/defaultValue=\{value\('tradingMode'\) \?\? 'OFF'\}/);
    expect(source.indexOf('value="OFF"')).toBeLessThan(source.indexOf('value="FULL_EXECUTION"'));
  });

  /**
   * The mode says where its proposals go, and what can be done with them.
   *
   * **This guard has now asserted three different things, and the sequence is
   * the lesson.** It first asserted the selector disclosed accept and cancel
   * were unbuilt, under "An Unanswerable Trading Mode Says So". When cancel
   * shipped it was rewritten to assert that *accepting* was still unbuilt and
   * still happened on battlegrid.trade. Then accept shipped — sections 5 and
   * 7.4 — and that assertion went on passing, holding a false sentence in place
   * on the money surface for as long as anyone cared to read it.
   *
   * A test that pins copy pins it whether or not it is still true. This one was
   * even made whitespace-tolerant "because the sentence wraps across lines",
   * which is also why a line-based grep for the claim found nothing. Both halves
   * exist now and the assertion says so; `answering-is-not-disclaimed.test.ts`
   * is the guard that fails if the disclaimer ever comes back, in this file or
   * any other.
   */
  it('sends approval-required to the queue and names both answers', () => {
    const source = form();
    // Where the proposals go, as a link rather than a description of one.
    expect(source).toContain('/approvals');
    // The window, because an operator who does not know it is short will miss it.
    expect(source).toContain('fifteen minutes');
    // Both halves, named. Whitespace-tolerant: the sentence wraps in the JSX.
    expect(source).toMatch(/cancel one or accept it/);
    // The consequence of the half that costs money, on the surface about money.
    expect(source).toMatch(/opens a position with real money/);

    // The negatives read the **rendered copy**, not the file. The comment above
    // the paragraph quotes the retired sentence in order to record why it is
    // gone, and a check that could not tell naming a forbidden thing from doing
    // it would force that explanation out of the file the rule governs — which
    // is how a later reader deletes a rule as mysterious. Same reasoning as the
    // PE-2 scan and `answering-is-not-disclaimed.test.ts`.
    const copy = source.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(copy).toMatch(/cancel one or accept it/); // the strip kept the copy
    expect(copy).not.toMatch(/not yet\s+available/);
    expect(copy).not.toContain('battlegrid.trade');
  });

  /**
   * Composing and editing want opposite things, and one component now serves
   * both.
   *
   * A pre-filled loss cap at **create** would be this product choosing a number
   * on the operator's behalf — the exact thing the absence of a platform default
   * says nobody should do. At **edit** the number already exists and they chose
   * it, and a blank box would be worse than presumptuous: `tradingConfig` is
   * all-or-nothing, so a field submitted empty is a limit removed.
   *
   * So the check is not "never prefills". It is that the prefill can only come
   * from a value that was passed in, which at create time is absent.
   */
  it('pre-fills a money limit only from a value it was given', () => {
    const source = form();
    // Every number input takes its default from `current`, never from a literal.
    const defaults = source.match(/type="number"[\s\S]{0,220}?defaultValue=\{([^}]*)\}/g) ?? [];
    expect(defaults.length, 'no number field found to check').toBeGreaterThan(0);
    for (const d of defaults) expect(d).toMatch(/defaultValue=\{current\}/);
    expect(source).not.toMatch(/type="number"[\s\S]{0,220}?defaultValue="/);
  });

  it('passes only what the operator themselves typed when composing', () => {
    // This pinned "no `current` at create" until the refused-create bounce
    // (#245): the create form now passes `current={composed}` — what a refusal
    // carried back, which is the operator's own typing and nothing else. A
    // first visit carries nothing, so every box is still empty; either way the
    // prefill can only come from a value the operator chose, which is the
    // property this test has always held. A literal here would be the product
    // choosing a loss cap on their behalf, and still fails.
    const create = readFileSync('src/presentation/components/agent-form.tsx', 'utf8');
    expect(create).toMatch(/<MoneyLimits\s+catalog=\{catalog\}\s+current=\{composed\}\s*\/>/);
    expect(create).not.toMatch(/<MoneyLimits[^>]*current=\{\{/);
  });

  it('requires every money field it renders', () => {
    const matches = form().match(/type="number"/g) ?? [];
    const required = form().match(/\n\s*required\n/g) ?? [];
    expect(required.length).toBe(matches.length);
  });

  it('derives which fields to ask rather than listing them', () => {
    expect(form()).toMatch(/undefaultableFields\(catalog\)/);
  });
});

describe('the route stays out of the domain', () => {
  it('passes answers and lets the use case assemble the config', () => {
    // Architecture policy: no file under app/ imports the domain. Assembling a
    // config needs the catalog, and the command already has it. The action
    // lives beside the page since `the-build-checks-what-next-generates`.
    const page = readFileSync('app/(app)/agents/new/page.tsx', 'utf8');
    const action = readFileSync('app/(app)/agents/new/actions.ts', 'utf8');
    expect(page).not.toMatch(/@\/domain\//);
    expect(action).not.toMatch(/@\/domain\//);
    expect(action).toMatch(/money: moneyAnswers\(formData\)/);
    expect(action, 'the defect, stated directly').not.toMatch(/tradingConfig: null/);
  });
});

/**
 * Zero removes the limit. It does not set one to nothing.
 *
 * BattleGrid's own field descriptions:
 *
 * ```
 * maxConcurrentExposureUsd   0 = unset
 * maxCumulativeDrawdownUsd   0 = no stop
 * maxDailyLossUsd            0 = no daily limit
 * ```
 *
 * The form asks "most it may lose in a day" and promises "trading stops for the
 * day once this is reached". Under that wording `0` is the most cautious answer
 * available and it produces an agent nothing will stop. A comment in this very
 * file used to assert the opposite — that zero "means the same as OFF for that
 * limit" — and it was load-bearing: nothing questioned a zero anywhere else
 * because of it.
 */
describe('zero does not mean nothing', () => {
  it('names the caps the platform reads as unbounded at zero', () => {
    expect([...UNBOUNDED_AT_ZERO].sort()).toEqual([
      'maxConcurrentExposureUsd',
      'maxCumulativeDrawdownUsd',
      'maxDailyLossUsd',
    ]);
  });

  it('leaves out the floors, where nothing is established about zero', () => {
    // The schema carries no `0 = …` note for either, so nothing is guessed.
    expect(UNBOUNDED_AT_ZERO).not.toContain('balanceThresholdUsd');
    expect(UNBOUNDED_AT_ZERO).not.toContain('minAllocationUsd');
  });

  it('knows a zero removes the limit', () => {
    expect(removesTheLimit('maxDailyLossUsd', 0)).toBe(true);
    expect(removesTheLimit('maxDailyLossUsd', 10)).toBe(false);
    // Not every zero is unbounded — only the three the platform says so about.
    expect(removesTheLimit('balanceThresholdUsd', 0)).toBe(false);
  });

  it('names which caps a configuration leaves unbounded', () => {
    // The live agent's shape: a complete config, two caps at zero.
    const live = { ...MONEY, maxDailyLossUsd: 0, maxCumulativeDrawdownUsd: 0 };
    expect([...unboundedCaps(live)].sort()).toEqual([
      'maxCumulativeDrawdownUsd',
      'maxDailyLossUsd',
    ]);
  });

  it('reports a fully bounded configuration as bounded', () => {
    expect(unboundedCaps(MONEY)).toEqual([]);
  });
});

describe('the form says what zero does, where it is typed', () => {
  const form = () => readText('src/presentation/components/money-limits.tsx');

  it('warns that zero removes the limit', () => {
    expect(form()).toMatch(/Entering 0 removes this limit/);
  });

  it('warns beside the field rather than only in a paragraph above it', () => {
    // The hint is `aria-describedby` on the input. A caution about zero that
    // sits above the fieldset is not read by someone tabbing into the box.
    const source = form();
    const hint = source.indexOf('id={`${name}-hint`}');
    const warning = source.indexOf('Entering 0 removes this limit');
    expect(hint).toBeGreaterThan(-1);
    expect(warning).toBeGreaterThan(hint);
  });

  it('derives which fields warn rather than listing them', () => {
    expect(form()).toMatch(/UNBOUNDED_AT_ZERO as readonly string\[\]\)\.includes\(name\)/);
  });
});

describe('a limit is described by what the platform meters', () => {
  const form = () => readText('src/presentation/components/money-limits.tsx');

  /** The exposure field's `hint=` value, whatever it currently says. */
  const exposureHint = () => {
    const source = form();
    const field = source.indexOf('name="maxConcurrentExposureUsd"');
    expect(field, 'the exposure field is gone').toBeGreaterThan(-1);
    const hint = /hint="([^"]+)"/.exec(source.slice(field));
    expect(hint, 'the exposure field has no hint').not.toBeNull();
    return hint![1]!;
  };

  /**
   * Measured live at BattleGrid v19.2.0 on 2026-08-16, and the reason this
   * block exists: `maxConcurrentExposureUsd` is metered on **margin**, not
   * notional. Undertow's `gauges.exposure.fill` read `8.55` while its
   * `currentNotionalUsd` was `29.48` under a cap of `45`; Breakwater reproduced
   * it at `4.5` against `12.91`. The hint said "the total of everything open at
   * the same time", which describes the number the gauge does *not* count.
   *
   * These assert the **claim**, not the sentence. Pinning the exact wording is
   * how a restyle's acceptance criteria rotted in #320 — a later rewrite that
   * is still true should not fail here.
   */
  it('names the quantity the cap actually counts', () => {
    expect(exposureHint()).toMatch(/margin/i);
  });

  it('does not describe the cap as a total of what is open', () => {
    // The original defect, kept as its own assertion so a regression to it is
    // named rather than merely uncovered.
    expect(exposureHint()).not.toMatch(/total of everything open/i);
  });

  it('says the cap sizes the next trade rather than stopping it', () => {
    // A ceiling that trips and a base that sizes are different mechanisms.
    // BattleGrid shrinks each successive order against remaining headroom.
    expect(exposureHint()).toMatch(/sizes each new trade|sized from|what is left/i);
  });

  it('names the refusal the operator would otherwise have to infer', () => {
    // Zero of the account's 5,521 lifetime gate blocks names exposure, so an
    // agent that has gone quiet gives the operator nothing to search for.
    const hint = exposureHint();
    expect(hint).toMatch(/refused|refuses/i);
    expect(hint).toMatch(/10/);
  });

  it('still composes with the zero warning as one paragraph', () => {
    // The field is in UNBOUNDED_AT_ZERO, so the bold "Entering 0 removes this
    // limit" is appended to whatever the hint says. Scenario "A value that
    // removes the limit" must not regress because this copy changed.
    expect(UNBOUNDED_AT_ZERO as readonly string[]).toContain('maxConcurrentExposureUsd');
    expect(exposureHint().trimEnd()).toMatch(/\.$/);
  });

  it('leaves the label alone, because the label was already right', () => {
    expect(form()).toMatch(/label="Most it may have at risk at once"/);
  });
});

describe('a present configuration is not a set limit', () => {
  const page = () => readFileSync('src/presentation/components/money-summary.tsx', 'utf8');

  it('does not decide by the object being present', () => {
    // The defect, stated directly: `agent.tradingConfig ? 'configured' : …`
    expect(readFileSync('app/(app)/agents/[id]/page.tsx', 'utf8')).not.toMatch(
      /tradingConfig \? 'configured'/,
    );
  });

  it('names the caps that have no ceiling', () => {
    expect(page()).toMatch(/unboundedCaps/);
    expect(page()).toMatch(/no ceiling at all/);
  });
});
