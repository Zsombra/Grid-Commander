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
 */

interface ReactishElement {
  readonly type: unknown;
  readonly props: Record<string, unknown> | null;
}

const isElement = (node: unknown): node is ReactishElement =>
  typeof node === 'object' && node !== null && 'type' in node && 'props' in node;

async function expand(node: unknown, out: string[], headings: string[], links: string[]): Promise<void> {
  if (node === null || node === undefined || typeof node === 'boolean') return;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) await expand(child, out, headings, links);
    return;
  }
  if (node instanceof Promise) {
    await expand(await node, out, headings, links);
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
  if (typeof href === 'string') links.push(href);

  // Fragments and other symbol-typed wrappers render only their children.
  if (typeof type === 'symbol') {
    await expand(children, out, headings, links);
    return;
  }

  if (typeof type === 'string') {
    if (/^h[1-6]$/.test(type)) {
      const inner: string[] = [];
      await expand(children, inner, headings, links);
      const text = inner.join('');
      headings.push(text);
      out.push(text);
      return;
    }
    await expand(children, out, headings, links);
    return;
  }

  if (typeof type === 'function') {
    // A nested component: call it the way React would, with its props. Async
    // server components return promises; sync ones return trees. A client
    // component using hooks will throw here — and that is a real limit worth
    // hearing about, not one to paper over.
    const rendered = (type as (p: unknown) => unknown)(props ?? {});
    await expand(rendered, out, headings, links);
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
}

/** Render (resolve) what an awaited page component returned. */
export async function rendered(tree: unknown): Promise<Rendered> {
  const out: string[] = [];
  const headings: string[] = [];
  const links: string[] = [];
  await expand(tree, out, headings, links);
  return { text: out.join(' '), headings, links };
}
