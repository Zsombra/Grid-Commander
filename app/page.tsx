import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';

/**
 * The front door.
 *
 * This did not exist, and the address of the product returned 404 for its whole
 * life. Every reachability check was green throughout: they each asked whether
 * the paths *out* of a page led somewhere, and none asked whether anything led
 * in. See `tests/architecture/reachability.test.ts`.
 *
 * A redirect rather than a page, deliberately. The question at the root is
 * *where does this person belong right now*, and there are exactly two answers,
 * both of which are already built. Rendering a third thing here would be a
 * landing page — a product decision this change is not entitled to make — and
 * it would need its own navigation, its own empty states, and its own reasons
 * to disagree with the pages it duplicates.
 *
 * `/agents` rather than a dashboard, because agents are the thing a user came
 * to check on. The idea brief's exit criteria all start there.
 */
export default async function Root() {
  const { user } = await acting();
  redirect(user.kind === 'not-connected' ? '/connect' : '/agents');
}
