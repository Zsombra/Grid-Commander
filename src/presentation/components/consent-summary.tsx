import type { GrantDescription } from '@/application/use-cases/describe-grant.query.js';

/**
 * What the user is about to grant, in words that are true.
 *
 * Requirement "Configuration Authority Is Described Honestly" forbids calling
 * this access read-only, because mcp:read can rebind an agent's entire
 * configuration. The wording comes from DescribeGrantQuery so it cannot drift
 * between screens, and `tests/connection/consent.test.ts` fails if it softens.
 */
export function ConsentSummary({ grant }: { grant: GrantDescription }) {
  return (
    <section aria-labelledby="consent-heading" className="max-w-prose space-y-4">
      <h2 id="consent-heading" className="text-lg font-semibold">
        What Grid-Commander will be able to do
      </h2>

      <ul className="space-y-2">
        {grant.permissions.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm">
        This is not view-only access. It can create and change your agents and
        strategies, and those changes take effect on your BattleGrid account
        immediately.
      </p>

      {grant.notRequested.length > 0 && (
        <div className="rounded border p-3">
          <h3 className="font-medium">Not requested</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {grant.notRequested.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            Grid-Commander cannot move your funds. It does not ask for that
            authority.
          </p>
        </div>
      )}
    </section>
  );
}
