import { NextResponse, type NextRequest } from 'next/server';
import { requestApp } from '@/presentation/session.js';
import { AccountUnidentifiedError, UntrustedCallbackError } from '@/domain/errors.js';

/**
 * The authorization response.
 *
 * The session is issued only after `CompleteConnectionCommand` returns, which is
 * only after BattleGrid confirmed the grant. Identity in this product comes from
 * that confirmation and from nothing else — issuing a session earlier would make
 * the cookie, rather than the grant, the thing that decides who someone is.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;

  // The user declined at BattleGrid. Nothing is stored, and they are told why
  // rather than dropped on an error page.
  const error = params.get('error');
  if (error) {
    return NextResponse.redirect(new URL(`/connect?declined=${encodeURIComponent(error)}`, request.url));
  }

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    return NextResponse.redirect(new URL('/connect?error=incomplete', request.url));
  }

  const app = await requestApp();
  try {
    const { userId } = await app.completeConnection.execute({ code, state });
    await app.sessions.issue({ userId, issuedAt: new Date() });
  } catch (err) {
    if (err instanceof UntrustedCallbackError) {
      return NextResponse.redirect(new URL('/connect?error=untrusted', request.url));
    }
    // The authorization worked and the account behind it could not be named, so
    // nothing was stored. Two outcomes, because the user is owed a different
    // second sentence when the authorization could not be withdrawn either.
    //
    // A fixed value, never the platform's own words: the reason travels in a
    // redirect the user's browser will carry, and this is the one path in the
    // product where a live access token is in scope beside one.
    if (err instanceof AccountUnidentifiedError) {
      const reason = err.released ? 'unidentified' : 'unidentified-standing';
      return NextResponse.redirect(new URL(`/connect?error=${reason}`, request.url));
    }
    throw err;
  }

  return NextResponse.redirect(new URL('/agents', request.url));
}
