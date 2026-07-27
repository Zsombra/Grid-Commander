import { NextResponse, type NextRequest } from 'next/server';
import { acting } from '@/presentation/session.js';

/**
 * Disconnecting revokes the grant at BattleGrid, then clears the session.
 *
 * In that order. Clearing the cookie first would leave the user believing they
 * had revoked something that is still live, and with no way back to revoke it.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const { app, user } = await acting();
  if (user.kind === 'acting') {
    await app.disconnect.execute(user.authority.userId);
  }
  await app.sessions.clear();
  return NextResponse.redirect(new URL('/connect', request.url), { status: 303 });
}
