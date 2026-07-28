import type { ReactNode } from 'react';
import { SectionNav } from '@/presentation/components/section-nav.js';

/**
 * The shell every capability shares.
 *
 * It exists for one reason: the navigation belongs in exactly one place. Before
 * this, `/agents`, `/strategies`, `/assistant` and `/audit` were four islands —
 * each worked, none linked to any other, and the only way between them was
 * typing a URL.
 *
 * `/connect` is outside this group, so the page that offers connecting does not
 * also offer four sections that would all refuse.
 *
 * **It does not follow that only connected users see the nav, and rendering it
 * showed as much.** Someone who types `/agents` without a session, or whose
 * session expires while they are reading, gets the navigation above a "Not
 * connected" page. That is left as it is: the shell stays put instead of
 * appearing and disappearing underneath them, the connect link is on the page
 * itself, and the nav is already correct the moment they come back. Resolving
 * the session here to hide it would put a second session read above every page
 * that already does one, to remove something that costs nothing.
 *
 * Like the root layout, this settles no visual value of its own. It renders the
 * nav and then the page, and every page still supplies its own `<main>`.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SectionNav />
      {children}
    </>
  );
}
