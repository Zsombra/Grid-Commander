import type { ReactNode } from 'react';

import './globals.css';

/**
 * The document shell.
 *
 * App Router will not build an application without a root layout, which is why
 * every route in this product was unbuildable until this file existed. Its whole
 * job is to be the document; everything else belongs to a page.
 *
 * It settles **no visual value of its own**. The deferral recorded in DL-007 has
 * now resolved: the design agent has surveyed a surface and
 * `openspec/design/system.json` is `status: designed`, so this file imports the
 * generated stylesheet rather than choosing a font, a background, or a width
 * here. Anything hard-coded at this level would be invisible in every later
 * design ticket because it would already look like the baseline — which is why
 * the import is the whole change. See DT-0001.
 *
 * It renders `children` directly rather than wrapping them: every page supplies
 * its own `<main>`, and a second one here would give each page two landmarks.
 */

export const metadata = {
  title: 'Grid-Commander',
  description: 'A workbench for BattleGrid agents and the strategies that drive them.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
