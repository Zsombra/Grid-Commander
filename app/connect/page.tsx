import { redirect } from 'next/navigation';
import { requestApp } from '@/presentation/session.js';
import { ConsentSummary } from '@/presentation/components/consent-summary.js';
import { NothingToConnect } from '@/presentation/components/nothing-to-connect.js';
import { DescribeGrantQuery } from '@/application/use-cases/describe-grant.query.js';

/**
 * What the user is agreeing to, before they are sent anywhere.
 *
 * The consent copy is a product surface, not boilerplate: `mcp:read` is
 * write-capable, and describing it as read-only would be a lie told at the
 * user's first interaction. See requirement "Configuration Authority Is
 * Described Honestly".
 *
 * On a deployment acting with a configured credential there is nothing to agree
 * to and nothing to start, so neither is offered. The button would have built an
 * `/authorize` URL with an empty `client_id` — an action that cannot work, on
 * the page the old failure message sent people looking for. See "A Remedy Named
 * Must Exist In That Deployment".
 */
export default async function ConnectPage() {
  const { personal } = await requestApp();
  if (personal) return <NothingToConnect />;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-medium">Connect your BattleGrid account</h1>
      <ConsentSummary grant={new DescribeGrantQuery().execute()} />
      <form action={startAuthorization}>
        <button type="submit" className="rounded border px-4 py-2 text-sm">
          Continue to BattleGrid
        </button>
      </form>
    </main>
  );
}

async function startAuthorization() {
  'use server';
  const app = await requestApp();
  const { authorizationUrl } = await app.startConnection.execute();
  redirect(authorizationUrl);
}
