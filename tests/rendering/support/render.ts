/**
 * Resolve what a server component returned into the text it renders.
 *
 * The pages under test are async functions returning React element trees.
 * Nothing here needs a DOM: the property being asserted — "the heading names
 * the entity" — is carried by the composed tree itself. The resolver expands
 * everything expandable: arrays, fragments, intrinsic elements (children),
 * and nested components, which are *called* with their props (awaited when
 * they return a promise) and expanded in turn.
 *
 * **A node this cannot expand throws, naming itself.** A walker that skips
 * what it does not understand is the vacuity the backlog item warns about —
 * it would green-light a heading hidden inside the exact component it
 * skipped. The one deliberate exception is `null`/`undefined`/booleans,
 * which React itself renders as nothing.
 *
 * ---
 *
 * ## What this can see, and what it cannot
 *
 * Read this before writing an assertion. Twice in one day a test here passed
 * against the broken code it was written to catch, and both times the reason
 * was that the property under test is not carried in `text`.
 *
 * **Collected**, and therefore assertable:
 *
 * - `text` — every text node, joined
 * - `headings` — the text of each h1–h6
 * - `links` — every `href` reached
 * - `values` — every `defaultValue`, `value`, and `checked`
 * - `duplicateKeys` — every key found twice among one array's members
 *
 * `links` and `values` exist because the alternative was a green test that
 * proved nothing: a page that renders a label without linking it reads
 * identically in text, and a form re-rendered from stored values reads
 * identically to one holding what the user typed. If you are asserting about
 * *reachability* or *what a field holds*, assert on those, never on `text`.
 *
 * `duplicateKeys` exists for the sharpest version of the same failure. Two
 * `<li>` sharing a key are two nodes in this tree and one in the DOM, so a
 * test that counts nodes passes whatever the keys are — verified once by
 * reverting the fix and re-running, after which the test was deleted (#194).
 * **The keys themselves were never the problem.** A React element is
 * `{$$typeof, type, key, ref, props}`; the key sits in the tree this walker
 * already visits, and React reconciles siblings within one array, which is
 * where the walk already iterates. Reading it needs no DOM and no reconciler.
 *
 * **Not collected, and not assertable here at all:**
 *
 * - **What reconciliation *does*** — that the two collided `<li>` become one
 *   node, and which one survives. The collision is now visible; its outcome
 *   is not, and asserting on the outcome still needs a real DOM.
 * - **Anything CSS decides** — layout, visibility, `hidden`, overflow. A
 *   class name is a string on a prop; what it does is not here.
 * - **Anything the client does** — effects, handlers, focus, hydration. A
 *   client component is *callable* here once its hooks are mocked at the module
 *   boundary; what the browser then does with the result is not.
 *
 * If you are adding a collector, the bar is the one `links` met: a property
 * whose absence lets a wrong page pass a reasonable-looking test.
 */

interface ReactishElement {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}

const isElement = (node: unknown): node is ReactishElement =>
  typeof node === 'object' && node !== null && 'type' in node && 'props' in node;

/**
 * Everything the walk gathers, in one place.
 *
 * One object rather than five positional arguments. A fifth positional
 * collector threaded through eight recursive calls is how the sixth gets
 * skipped in one branch and quietly under-reports.
 */
interface Collect {
  readonly text: string[];
  readonly headings: string[];
  readonly links: string[];
  readonly values: string[];
  readonly duplicateKeys: string[];
}

/**
 * A React element's key, as React stores it.
 *
 * `{$$typeof, type, key, ref, props}` — the key is a property of the element
 * object, not something the reconciler computes. #194 concluded that key
 * collisions "only exist during reconciliation", which is true of the
 * *collision's effect* and false of the *key*: it is sitting in the tree this
 * walker already visits. React normalises it to a string or leaves it null.
 */
function keyOf(node: unknown): string | null {
  if (typeof node !== 'object' || node === null || !('key' in node)) return null;
  const key = (node as { key?: unknown }).key;
  return typeof key === 'string' ? key : null;
}

async function expand(node: unknown, c: Collect, out: string[]): Promise<void> {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    /**
     * The one place a key collision exists.
     *
     * React reconciles siblings **within one array**, so this loop is exactly
     * its scope. A key seen twice here renders as two nodes in this tree and
     * one in the DOM — invisible to a walker that only counts nodes, which is
     * why no test in this project could observe one (#194).
     *
     * Key-less members are skipped rather than folded together under one
     * pseudo-key. Most elements are not in arrays and need no key, and
     * treating `null` as a value would report a collision on every page with
     * two unkeyed siblings — a false positive worse than the blind spot,
     * because it would be loud.
     */
    const seen = new Set<string>();
    for (const child of node) {
      const key = keyOf(child);
      if (key !== null) {
        if (seen.has(key)) c.duplicateKeys.push(key);
        else seen.add(key);
      }
      await expand(child, c, out);
    }
    return;
  }
  if (node instanceof Promise) {
    await expand(await node, c, out);
    return;
  }
  if (!isElement(node)) {
    throw new Error(`the resolver met a node it cannot expand: ${JSON.stringify(node)}`);
  }

  const { type, props } = node;
  const children = props?.['children'];

  // Collected so a test can assert *what is reachable*, not merely what is
  // written. A page that renders a stale proposal's label without linking it
  // is indistinguishable from one that links it, if you only read the text —
  // and an assertion on text for a URL the harness never emits passes while
  // proving nothing.
  const href = props?.['href'];
  if (typeof href === 'string') c.links.push(href);

  // Collected for the same reason as `href`, and learned the same way: a form
  // re-rendered from stored values and one holding what the person typed are
  // indistinguishable in text, because a `defaultValue` is a prop and never a
  // text node. An assertion on `text` for a field's contents passes while
  // proving nothing — which is exactly what it did before this existed.
  for (const key of ['defaultValue', 'value'] as const) {
    const v = props?.[key];
    if (typeof v === 'string' && v.length > 0) c.values.push(v);
    else if (typeof v === 'number') c.values.push(String(v));
  }
  if (props?.['defaultChecked'] === true) c.values.push('checked');

  // Fragments and other symbol-typed wrappers render only their children.
  if (typeof type === 'symbol') {
    await expand(children, c, out);
    return;
  }

  if (typeof type === 'string') {
    if (/^h[1-6]$/.test(type)) {
      const inner: string[] = [];
      await expand(children, c, inner);
      const text = inner.join('');
      c.headings.push(text);
      out.push(text);
      return;
    }
    await expand(children, c, out);
    return;
  }

  if (typeof type === 'function') {
    // A nested component: call it the way React would, with its props. Async
    // server components return promises; sync ones return trees. A client
    // component using hooks throws here, because there is no dispatcher outside
    // a render pass — mock the hook at its module boundary and this walks it
    // fine. See `support/form-status.ts`, which also records why that is the
    // only way to reach a pending state rather than a way around this file.
    const rendered = (type as (p: unknown) => unknown)(props ?? {});
    await expand(rendered, c, out);
    return;
  }

  throw new Error(`the resolver met a component type it cannot expand: ${String(type)}`);
}

export interface Rendered {
  /** Every text node, in order, joined with single spaces. */
  readonly text: string;
  /** The text of each h1–h6, in document order. */
  readonly headings: readonly string[];
  /** Every `href` reached, in document order. */
  readonly links: readonly string[];
  /**
   * Every form value reached — `defaultValue`, `value`, and `checked` for a
   * checked box. What a field *holds*, which its text never says.
   */
  readonly values: readonly string[];
  /**
   * Every key found twice among the members of one array.
   *
   * The collector that meets this file's own bar most literally: its absence
   * let a wrong page pass a reasonable-looking test, and did. A test written
   * for two colliding key-less entries passed against the fixed code and
   * against the broken code alike, and was deleted rather than kept (#194).
   *
   * Reported, never asserted globally. Only a test that reads this can fail on
   * it — a blanket assertion across 35 files is a different change.
   */
  readonly duplicateKeys: readonly string[];
}

/** Render (resolve) what an awaited page component returned. */
export async function rendered(tree: unknown): Promise<Rendered> {
  const out: string[] = [];
  const c: Collect = { text: out, headings: [], links: [], values: [], duplicateKeys: [] };
  await expand(tree, c, out);
  return {
    text: out.join(' '),
    headings: c.headings,
    links: c.links,
    values: c.values,
    duplicateKeys: c.duplicateKeys,
  };
}
