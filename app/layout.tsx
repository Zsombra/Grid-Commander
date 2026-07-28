import type { ReactNode } from 'react';

/**
 * The document shell.
 *
 * App Router will not build an application without a root layout, which is why
 * every route in this product was unbuildable until this file existed. Its whole
 * job is to be the document; everything else belongs to a page.
 *
 * It carries **no visual design on purpose**. A root layout is the most tempting
 * place in a Next.js application to settle a font, a background, or a page width
 * by accident, and those decisions belong to the design agent, who has not yet
 * seen a surface. `openspec/design/system.json` is still a placeholder, and a
 * value chosen here would be invisible in every later design ticket because it
 * would already look like the baseline. See DL-007.
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
