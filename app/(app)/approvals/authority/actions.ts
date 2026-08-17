'use server';

import { redirect } from 'next/navigation';
import { acting } from '@/presentation/session.js';

/**
 * Begin a step-up for fund-committing authority.
 *
 * **The only caller of `startConnection` that passes `stepUp`.** Reached from a
 * form submit on the authority page, which is itself reached from a decision the
 * operator is looking at — so the widening happens because a person asked for
 * it, at the point of use, and nowhere else. No read, no model-recorded
 * proposal, and no scheduled work can arrive here: a server action runs only on
 * a form submission, and nothing in the product submits this one.
 *
 * Nothing is recorded before BattleGrid answers. An operator who begins this and
 * abandons it leaves no half-granted state behind and no authority the product
 * claims but does not hold.
 */
export async function grantAnswerAuthority() {
  const { app, user } = await acting();
  if (user.kind === 'not-connected') redirect('/connect');

  const { authorizationUrl } = await app.startConnection.execute({ stepUp: true });
  redirect(authorizationUrl);
}
