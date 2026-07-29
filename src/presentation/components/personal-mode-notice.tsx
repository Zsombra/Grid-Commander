/**
 * A deployment that authenticates nobody, saying so.
 *
 * In personal mode there is no session to resolve: whoever reaches this page
 * acts as the account owner, with a credential that can reconfigure their
 * trading agents. On one person's machine that is exactly right. Reachable from
 * anywhere else it is a door with no lock, and **nothing on the screen would
 * otherwise distinguish the two**.
 *
 * `consequence`, not `notice`. The system's own principle is that consequence
 * outranks everything on a screen, and this is the only element in the product
 * describing what someone else could do with it.
 *
 * Rendered on every page rather than once at connect time. A warning you saw
 * yesterday is not a warning; this is a property of the deployment, true on
 * every page for as long as it holds.
 */
export function PersonalModeNotice({ scopes }: { scopes: readonly string[] }) {
  return (
    <div
      role="note"
      className="border-b border-l-4 border-consequence-border border-l-consequence-default bg-consequence-subtle"
    >
      <p className="mx-auto max-w-2xl px-6 py-3 text-base text-text-primary">
        <span className="font-medium">This deployment authenticates nobody.</span>{' '}
        It holds your BattleGrid key, so anyone who can reach this page acts as
        you — reading your account and changing your agents. Keep it on your own
        machine.{' '}
        {/*
          Declared, not granted. The product cannot read what a bg_live_ key
          actually carries, and saying "limited to mcp:read" would claim a
          restriction the platform is not enforcing.
        */}
        <span className="text-text-secondary">
          It acts with {scopes.join(' and ')}, which is what you declared the key
          carries — not a limit BattleGrid enforces on it.
        </span>
      </p>
    </div>
  );
}
