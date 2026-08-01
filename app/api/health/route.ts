import { checkHealth } from '@/composition.js';

/**
 * The answer a load balancer needs and nothing else. `/connect` serves
 * without touching the database, so a process whose database has gone away
 * underneath it would look green there while every authenticated route
 * returned 500 — this is the route that tells those apart.
 *
 * No session, no cookie, no version, no schema state, no configuration:
 * it is reachable unauthenticated by definition, so its body carries
 * nothing worth reading.
 */
export async function GET(): Promise<Response> {
  try {
    await checkHealth();
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
