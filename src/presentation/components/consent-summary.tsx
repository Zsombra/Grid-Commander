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

      {/* The sentence being agreed to. It says "reaches your live account
          immediately", which is what the consequence role means — DT-0005. */}
      <p className="rounded-gc-2 border border-consequence-border bg-consequence-subtle p-4 text-sm text-text-primary">
        This is not view-only access. It can create and change your agents and
        strategies, and those changes take effect on your BattleGrid account
        immediately.
      </p>

      {grant.notRequested.length > 0 && (
        // Absence stated, not implied: what is deliberately not asked for
        // wears quiet, visibly lighter than the consequence above. DT-0005.
        <div className="rounded-gc-2 border border-quiet-border bg-quiet-subtle p-4">
          <h3 className="font-medium">Not requested</h3>
          <ul className="mt-1 space-y-1 text-sm">
            {grant.notRequested.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {/*
            Scoped to this grant, deliberately. "It does not ask for that
            authority" was true of the whole product until answering a proposed
            trade was built; it is still exactly true of what is being agreed to
            here, and the second sentence keeps the difference visible rather
            than letting someone discover it later.
          */}
          <p className="mt-2 text-sm">
            Connecting does not give Grid-Commander the ability to move your funds, and
            this authorization does not ask for it. If you later want it to answer a trade
            one of your agents proposes, it will ask you for that separately.
          </p>
        </div>
      )}
    </section>
  );
}
