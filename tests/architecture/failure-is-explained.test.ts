import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A failed read explains itself, on every surface that renders one.
 *
 * `WhyNotLoaded` turns a bare reason into something an operator can act on: it
 * names a cause that is external and obviously not deletion, and it reads the
 * `cause` rather than the message, so a refusal and an outage are told apart by
 * the fact the adapter carried out rather than by matching on words.
 *
 * Its own header says it is "shared by the roster and the strategy list so the
 * two cannot drift". When this was written, thirty-six branches across
 * thirty-two files rendered an unreadable outcome and six of them reached the
 * component; everything built after those six had hand-rolled the branch.
 *
 * Thirty hand-rolled branches is the symptom. The cause is that nothing stopped
 * the thirty-first, and a sweep without a guard buys one clean afternoon.
 *
 * So this derives the branches from the source. **A list of files would be the
 * same mistake one level up**: it would pass while a thirty-seventh was
 * written, which is exactly how the thirty accumulated. It is also why the
 * check asks what a branch *renders* rather than whether its file mentions the
 * component somewhere — this repository's recurring defect is a check that
 * matches how something is spelled rather than what it reaches, five times over.
 */

const APP = 'app';
const PRESENTATION = join('src', 'presentation');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const uiFiles = [...walk(APP), ...walk(PRESENTATION)];
const read = (f: string) => readFileSync(f, 'utf8');
const slashed = (f: string): string => f.split(/[/\\]/).join('/');

const COMPONENT = slashed(join(PRESENTATION, 'components', 'why-not-loaded.tsx'));

/**
 * Local modules a file imports, as paths on disk. `@/x.js` is `src/x.tsx`.
 *
 * Resolved rather than compared as text, because the same module is written
 * `@/presentation/components/why-not-loaded.js` from a page and
 * `./why-not-loaded.js` from a sibling component. A check that matched either
 * spelling would be measuring how the import was typed, which is the defect
 * shape this repository keeps producing.
 */
function importsOf(file: string): string[] {
  const out: string[] = [];
  for (const m of read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1] as string;
    if (!spec.startsWith('@/') && !spec.startsWith('.')) continue;
    const base = spec.startsWith('@/') ? join('src', spec.slice(2)) : join(file, '..', spec);
    for (const candidate of [base.replace(/\.jsx?$/, '.tsx'), base.replace(/\.jsx?$/, '.ts')]) {
      if (uiFiles.includes(candidate)) {
        out.push(slashed(candidate));
        break;
      }
    }
  }
  return out;
}

/** The balanced region opened by the delimiter sitting at `at`. */
function balanced(src: string, at: number, open: string, close: string): string {
  let depth = 0;
  for (let i = at; i < src.length; i++) {
    const c = src[i] as string;
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return src.slice(at, i + 1);
    }
  }
  return src.slice(at);
}

/**
 * From `from`, up to whichever comes first at nesting depth zero: one of
 * `stops`, or the closer of whatever encloses this expression.
 *
 * The second condition is what keeps a ternary's consequent and a `&&`'s right
 * side from running on into the rest of the page — the `}` that ends the JSX
 * expression container, or the `)` that ends the element it sits in.
 */
function untilDepthZero(src: string, from: number, stops: readonly string[]): string {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i] as string;
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return src.slice(from, i);
      depth--;
    } else if (depth === 0 && stops.includes(c)) return src.slice(from, i);
  }
  return src.slice(from);
}

/**
 * What a branch renders, given where its `kind === 'unreadable'` test ends.
 *
 * Three shapes, because the product writes all three: an `if` that returns a
 * whole page, a ternary inside a section, and a `&&` beside the sentence it
 * qualifies. An unrecognised fourth returns nothing and is reported by
 * `reads every branch it found` below — an unparsed branch must fail loudly
 * rather than pass as one carrying no sentence and no obligation.
 */
function branchAfter(src: string, afterTest: number): string {
  let i = afterTest;
  while (i < src.length && /\s/.test(src[i] as string)) i++;

  // `if (x.kind === 'unreadable') { … }` — the condition's own paren, then the
  // consequent, whether a block or a bare statement.
  if (src[i] === ')') {
    i++;
    while (i < src.length && /\s/.test(src[i] as string)) i++;
    if (src[i] === '{') return balanced(src, i, '{', '}');
    return untilDepthZero(src, i, [';']);
  }

  // `{x.kind === 'unreadable' ? ( … ) : …}` — the consequent, up to the `:`.
  if (src[i] === '?') return untilDepthZero(src, i + 1, [':']);

  // `{x.kind === 'unreadable' && ( … )}` — up to the container's own closer.
  if (src.startsWith('&&', i)) return untilDepthZero(src, i + 2, []);

  return '';
}

/** One rendered unreadable branch: where it is, what it tests, what it draws. */
interface Branch {
  readonly file: string;
  /** The expression whose `kind` was tested — `roster`, `check?`, `screening.result`. */
  readonly reads: string;
  readonly renders: string;
}

/**
 * Every unreadable branch the interface renders, from the source.
 *
 * Per branch rather than per file, deliberately. `agent-roster.tsx` has two —
 * the roster itself and whether its agents are deployed — and a file-level
 * check would let one carry the sentence for both.
 */
function unreadableBranches(): Branch[] {
  const found: Branch[] = [];
  for (const file of uiFiles) {
    const src = read(file);
    //                  the tested expression      `.kind === 'unreadable'`
    for (const m of src.matchAll(/([\w$.?[\]]+)\.kind\s*===\s*'unreadable'/g)) {
      found.push({
        file: slashed(file),
        reads: m[1] as string,
        renders: branchAfter(src, (m.index ?? 0) + m[0].length),
      });
    }
  }
  return found;
}

/**
 * The shared sentence, rendered — not merely imported, and not re-typed.
 *
 * The delimiter after the name is load-bearing: `<WhyNotLoadedInline` would
 * otherwise satisfy this check, and a second component saying the same thing
 * slightly differently is the drift the shared one exists to prevent.
 */
const explains = (branch: Branch): boolean => /<WhyNotLoaded[\s/>]/.test(branch.renders);

/**
 * A branch that renders nothing, and so has nothing to explain *in*.
 *
 * Server actions live in the same file as the page they serve and read the
 * same results, but an action has no JSX to put a sentence in: it redirects,
 * and the page it lands on is what renders. This guard asks what a branch
 * *renders* — that is its whole design — so a branch that renders nothing is
 * outside its subject rather than exempt from it. The explanation is still
 * owed and still reached: the redirect carries `?problem=`, and the page's own
 * unreadable branch carries `WhyNotLoaded` beside it.
 *
 * Deliberately narrow. A branch that redirects *and* renders JSX is still a
 * render branch and stays in scope, and `the redirect rule blinds nothing
 * that renders` below feeds it the sentence it must not swallow.
 */
const rendersNothing = (branch: Branch): boolean =>
  /\bredirect\(/.test(branch.renders) && !/<[A-Za-z]/.test(branch.renders);

/**
 * Where the sentence does not belong, said out loud.
 *
 * An exemption is a claim, so it is written down with its reason and checked
 * both ways below: a stale entry fails, and so does one whose branch has since
 * started carrying the sentence. Silence is not an exemption — a branch nobody
 * listed and nobody explained fails.
 *
 * Keyed by the expression the branch tests rather than by a line number, so
 * moving code does not silently move an exemption onto a different branch.
 */
const EXEMPT: ReadonlyArray<{ file: string; reads: string; because: string }> = [
  {
    file: 'src/presentation/components/proposal-queue.tsx',
    reads: 'result',
    because:
      'The queue is read from Grid-Commander’s own database, not from BattleGrid. ' +
      'The shared sentence names BattleGrid as the cause, and here that would be ' +
      'false — the platform was never asked. `ProposalsResult` carries no ' +
      '`FailureCause` for the same reason, so the component could not be called ' +
      'even if the words fitted. The branch says the queue is not empty in its own ' +
      'terms instead.',
  },
  {
    file: 'app/(app)/pending/[id]/page.tsx',
    reads: 'result',
    because:
      'The only failure that reaches this branch is the proposal store not ' +
      'answering: `OpenProposalQuery` returns `not-possible`, with the platform’s ' +
      'own words, whenever it is BattleGrid that could not be read. Naming ' +
      'BattleGrid here would send someone to wait out an outage that is not ' +
      'happening — the exact mistake `why-not-loaded.tsx` was written to stop.',
  },
  {
    file: 'app/(app)/recorder/[ticker]/page.tsx',
    reads: 'history',
    because:
      'The signal record is read from Grid-Commander’s own database, not from ' +
      'BattleGrid — the same ground as the proposal queue’s exemption. The shared ' +
      'sentence names BattleGrid as the cause, which here would be false, and ' +
      '`ReadSignalHistoryResult` carries no `FailureCause` for the same reason. ' +
      'The branch carries its own survival sentence instead: the store not ' +
      'answering says nothing about what it holds.',
  },
  {
    file: 'src/presentation/components/signal-record.tsx',
    reads: 'result',
    because:
      'The coverage surface reads the product’s own store, exactly as the history ' +
      'page above. Its unreadable branch states in its own terms that an ' +
      'unanswered store is not an empty record — the reassurance the shared ' +
      'sentence exists to give, with the cause named truthfully.',
  },
  {
    file: 'src/presentation/components/forward-returns.tsx',
    reads: 'result',
    because:
      'The analysis reads the same store as the coverage surface above and ' +
      'nothing else — no BattleGrid call exists in its path, so the shared ' +
      'sentence would name a cause that cannot be the cause, and ' +
      '`ReadForwardReturnsResult` carries no `FailureCause` for the same ' +
      'reason. Its unreadable branch carries the survival sentence in its own ' +
      'terms: the read failing says nothing about what is recorded.',
  },
  {
    file: 'app/(app)/strategies/metrics/[metric]/page.tsx',
    reads: 'check?',
    because:
      'This is the contract check of a column the user is composing in the query ' +
      'string right now. There is no prior thing for "does not mean it is gone" to ' +
      'refer to: nothing was saved, nothing can have been deleted, and the reader ' +
      'is mid-sentence rather than looking at an empty panel where their work ' +
      'should be. The page’s own unreadable branch, one section up, does carry it.',
  },
  {
    file: 'app/(app)/strategies/sections/[sectionKey]/page.tsx',
    reads: 'check?',
    because:
      'The same branch as the metric page’s, for the same reason and no other: a ' +
      'contract check of a column composed in the query string a moment ago. ' +
      'Nothing was saved, so nothing can be gone, and the reassurance would be ' +
      'about a thing that never existed. The two failures this page can have about ' +
      'something that does exist — the section itself and the metric’s ' +
      'construction hints — both carry the sentence.',
  },
];

const key = (b: { file: string; reads: string }): string => `${b.file}  (${b.reads})`;
const exempt = new Set(EXEMPT.map(key));

describe('every unreadable branch explains itself', () => {
  it('renders the shared explanation, or is exempt with a stated reason', () => {
    const silent = unreadableBranches()
      .filter((b) => !explains(b))
      .filter((b) => !rendersNothing(b))
      .filter((b) => !exempt.has(key(b)))
      .map(key);

    expect(
      [...new Set(silent)],
      'these print a reason and stop — a bare reason says what failed, not that the work survived it',
    ).toEqual([]);
  });

  it('the redirect rule blinds nothing that renders', () => {
    // The rule's whole risk: that "it redirects" becomes a way to opt a
    // rendering branch out. A branch that does both is still a render branch.
    expect(
      rendersNothing({
        file: 'x',
        reads: 'r',
        renders: "{ redirect('/somewhere'); return <p>{result.reason}</p>; }",
      }),
    ).toBe(false);
    expect(
      rendersNothing({ file: 'x', reads: 'r', renders: "{ redirect('/somewhere'); }" }),
    ).toBe(true);
  });

  it('names the branches the redirect rule removes', () => {
    // Not a cap — a record. These are the pre-perform re-reads in the three
    // strategy lifecycle actions; a fourth appearing should be seen and
    // argued about, not absorbed silently.
    const removed = unreadableBranches().filter(rendersNothing).map(key);
    expect([...new Set(removed)].sort()).toEqual([
      // In `actions.ts` since `the-build-checks-what-next-generates` moved
      // every page-exported action beside its page.
      'app/(app)/strategies/[id]/archive/actions.ts  (reread)',
      'app/(app)/strategies/[id]/fork/actions.ts  (reread)',
      'app/(app)/strategies/[id]/restore/actions.ts  (reread)',
    ]);
  });

  it('reads every branch it found', () => {
    // An unparsed branch would be reported as rendering nothing, which reads as
    // "does not explain itself" and is really "this check cannot see it". The
    // difference matters: the first is a defect in the product, the second in
    // the guard, and only one of them is fixed by editing a page.
    const unparsed = unreadableBranches().filter((b) => b.renders.trim() === '');
    expect(unparsed.map(key), 'a branch shape this check does not understand').toEqual([]);
  });

  it('is comparing against branches it actually found', () => {
    // Passing vacuously is the failure mode every guard in this directory
    // carries a comment about, and this one would pass on a product whose
    // unreadable branches had all been deleted.
    const branches = unreadableBranches();
    expect(branches.length).toBeGreaterThan(25);
    expect(branches.filter(explains).length).toBeGreaterThan(20);
  });
});

/**
 * The subject rules, named once so they can be fed a violation.
 *
 * Audited 2026-08-10 by mutation (GitHub #87): killing both extractors left
 * `wrong` empty in both tests and every count still satisfied — because the
 * wrapper floor (`toBe(3)`) is built on a *different* regex from the two doing
 * the reading. Two rules blind, one floor green, no signal anywhere.
 *
 * `subject={...}` is read where the words are inline; `subject="..."` is read at
 * the call sites of the three wrappers that take one as a prop.
 */
const subjectsIn = (source: string): string[] =>
  [...source.matchAll(/subject=\{?["'`]([^"'`]*)/g)].map((m) => (m[1] as string).trim());

const quotedSubjectsIn = (source: string): string[] =>
  [...source.matchAll(/\bsubject="([^"]*)"/g)].map((m) => m[1] as string);

/** The component renders `This does not mean {subject} gone`, so it carries its own verb. */
const completesTheSentence = (subject: string): boolean =>
  /\b(is|are|was|were|has|have)$/.test(subject.trim());

describe('the explanation is the shared one', () => {
  it('is defined in exactly one place', () => {
    // Two copies is how the roster and the strategy list would come to say
    // different things about the same failure — the drift the component's own
    // header says it exists to prevent.
    const defines = uiFiles.filter((f) => /export function WhyNotLoaded\b/.test(read(f)));
    expect(defines.map(slashed)).toEqual([COMPONENT]);
  });

  it('is reached from that module, wherever it is rendered', () => {
    const wrong = uiFiles
      .filter((f) => read(f).includes('<WhyNotLoaded'))
      .filter((f) => !importsOf(f).includes(COMPONENT))
      .map(slashed);

    expect(wrong, 'renders the sentence and imports it from somewhere else').toEqual([]);
  });

  it('names a subject, and one the sentence can be completed with', () => {
    /**
     * The component renders `This does not mean {subject} gone`, so the subject
     * carries its own verb. Two shipped without one — `/limits` and
     * `/thinking` read "this does not mean this agent's limits gone" — which is
     * exactly the failure a shared component is supposed to make impossible and
     * did not, because nothing read the sentence back.
     *
     * A prop passed through by a wrapper (`subject={subject}`) is checked at
     * its call sites instead; the literals are where the words are.
     */
    const wrong = unreadableBranches()
      .filter(explains)
      .flatMap((b) => subjectsIn(b.renders).map((subject) => ({ at: key(b), subject })))
      .filter(({ subject }) => !completesTheSentence(subject))
      .map(({ at, subject }) => `${at}: "This does not mean ${subject} gone"`);

    expect(wrong, 'the subject does not complete the sentence').toEqual([]);
  });

  it('checks the subjects on the wrappers that take one as a prop', () => {
    // `StageNote`, `SectionNote` and the risk panel's `Section` each render the
    // sentence once for the several sections they wrap. The check above sees
    // `subject={subject}` there and nothing to read; the words live at the call
    // sites, so they are read here. Matched on the component's own attribute,
    // not on a bare `subject={subject}` anywhere in the file — several
    // components take an unrelated `subject` prop, and reading their copy
    // against this rule would be a false positive.
    const wrappers = uiFiles.filter((f) => /<WhyNotLoaded[^>]*subject=\{subject\}/.test(read(f)));
    expect(wrappers.length, 'no wrapper takes a subject — this check is measuring nothing').toBe(3);

    const wrong = wrappers
      .flatMap((f) => quotedSubjectsIn(read(f)).map((subject) => ({ file: slashed(f), subject })))
      .filter(({ subject }) => !completesTheSentence(subject))
      .map(({ file, subject }) => `${file}: "This does not mean ${subject} gone"`);

    expect(wrong, 'the subject does not complete the sentence').toEqual([]);
  });
});

describe('an exemption is a claim, and is checked', () => {
  it('names a branch that exists', () => {
    const found = new Set(unreadableBranches().map(key));
    const stale = EXEMPT.map(key).filter((k) => !found.has(k));

    expect(stale, 'exempted, and no such branch renders — delete the entry').toEqual([]);
  });

  it('exempts nothing that already explains itself', () => {
    const fixed = unreadableBranches()
      .filter(explains)
      .map(key)
      .filter((k) => exempt.has(k));

    expect(fixed, 'carries the sentence and is still listed as exempt — delete the entry').toEqual(
      [],
    );
  });

  it('gives a reason rather than a label', () => {
    // A one-word `because` is silence with extra steps. The point of routing
    // exemptions through this list is that the next reader finds an argument
    // they can disagree with.
    const thin = EXEMPT.filter((e) => e.because.trim().length < 80).map(key);
    expect(thin, 'exempted without saying why').toEqual([]);
  });

  it('stays small enough to read', () => {
    // Not a limit for its own sake: an exemption list long enough to skim is
    // one nobody reads, and this guard's whole value is that every entry in it
    // has been argued for.
    expect(EXEMPT.length).toBeLessThan(8);
  });
});

/**
 * The subject rules, fed the sentences they exist to catch.
 *
 * The defect was real and shipped: `/limits` and `/thinking` read "this does not
 * mean this agent's limits gone", because a shared component is only as good as
 * what is passed to it and nothing read the sentence back. This is what reads it
 * back — and until now nothing read *this*.
 */
describe('the subject rules catch what they were written for', () => {
  it('reads a subject written inline', () => {
    expect(subjectsIn('<WhyNotLoaded subject="this agent’s limits are" />')).toEqual([
      "this agent’s limits are",
    ]);
    // A template subject is read whole, interpolation and all, and then judged
    // on its ending like any other — which is right: the verb is what the
    // sentence needs, and it is outside the `${}`.
    expect(subjectsIn('<WhyNotLoaded subject={`the ${name} is`} />')).toEqual(['the ${name} is']);
    expect(subjectsIn('<Foo bar="x" />'), 'nothing to read').toEqual([]);
  });

  it('reads a subject passed as a quoted prop at a call site', () => {
    expect(quotedSubjectsIn('<StageNote subject="the pipeline is" />')).toEqual(['the pipeline is']);
    expect(quotedSubjectsIn('<StageNote subject={subject} />'), 'the prop, not the words').toEqual([]);
  });

  it('accepts a subject that completes the sentence', () => {
    // "This does not mean the trade record is gone" — reads.
    for (const s of ['the trade record is', 'these figures are', 'the balance was', 'the agent has']) {
      expect(completesTheSentence(s), s).toBe(true);
    }
  });

  it('rejects the subject that actually shipped', () => {
    // "This does not mean this agent's limits gone" — the sentence that reached
    // two live pages. Without this case the rule is satisfied by a predicate
    // that accepts everything, and the defect walks back in.
    expect(completesTheSentence("this agent’s limits")).toBe(false);
    expect(completesTheSentence('the thinking')).toBe(false);
    expect(completesTheSentence('')).toBe(false);
  });

  it('does not accept a verb that merely appears somewhere in the subject', () => {
    // Anchored at the end, because the sentence continues with "gone" — a
    // subject with `is` in the middle does not complete it.
    expect(completesTheSentence('what is missing here')).toBe(false);
  });
});
