'use client';

import { usePathname } from 'next/navigation';

/**
 * How you get from one capability to another.
 *
 * There was no way. Four top-level destinations, none of them linking to any
 * other, all of them working — usable only by typing a URL. That is what
 * `app-access` means by a route that renders and is not reachable.
 *
 * One nav in one file, rendered by the layout every page under `(app)` shares.
 * Four copies would be four things that can disagree, and the disagreement
 * would stay invisible until someone noticed a section had gone missing from
 * one page.
 *
 * **The only client component in this product**, and it earns that on one
 * detail: `usePathname` is the only way to know which section you are in. A
 * layout is not given the path, and the alternative — each page passing its own
 * — is the four-copies problem with extra steps. Everything else here stays
 * server-rendered, including the plain `<a>` elements below: this product
 * navigates with full page loads everywhere, and a nav that alone did something
 * different would be the odd one out.
 *
 * **Tokens only, and no more.** The surfaces beneath it have never had a design
 * pass, and a navigation styled ahead of them would set a baseline nobody chose
 * — the same reason the root layout settles no visual value of its own. A
 * design ticket follows.
 */

const SECTIONS = [
  { href: '/agents', label: 'Agents' },
  { href: '/strategies', label: 'Strategies' },
  { href: '/arena', label: 'Arena' },
  { href: '/explorer', label: 'The field' },
  { href: '/recorder', label: 'Recorder' },
  { href: '/pending', label: 'Proposed' },
  // Trades an agent proposed and is waiting on a human for. Distinct from
  // "Proposed", which is what a *model* suggested about configuration: these
  // expire in fifteen minutes and cost money.
  { href: '/approvals', label: 'Waiting' },
  { href: '/audit', label: 'Activity' },
] as const;

export function SectionNav() {
  const path = usePathname();

  return (
    <nav aria-label="Sections" className="border-b border-border-subtle">
      <ul className="mx-auto flex max-w-2xl gap-1 px-6">
        {SECTIONS.map(({ href, label }) => {
          // Current when the path is *inside* the section, not only when it
          // matches — reading an agent's journal is still being in Agents.
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <a
                href={href}
                // Says where you are, not only where you can go. A nav that
                // marks nothing leaves the user to work it out from the page.
                aria-current={here ? 'page' : undefined}
                className={
                  here
                    ? '-mb-px inline-block border-b-2 border-accent-default px-3 py-3 text-base font-medium text-text-primary'
                    : '-mb-px inline-block border-b-2 border-transparent px-3 py-3 text-base text-text-secondary hover:text-text-primary'
                }
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
