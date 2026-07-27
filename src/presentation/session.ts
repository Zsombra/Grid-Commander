import { cookies } from 'next/headers';
import { app, type App } from '@/composition.js';
import type { CurrentUserResult } from '@/application/use-cases/current-user.query.js';

/**
 * The two lines every route starts with, in one place.
 *
 * A route resolves who it acts for and calls one use case. It does not branch on
 * domain state, validate anything, or reach BattleGrid — all of that is
 * implemented and tested one layer down, and a route that re-does it creates a
 * second answer that will drift from the tested one. See design W-D.
 */
export async function requestApp(): Promise<App> {
  const store = await cookies();
  return app({
    get: (name) => store.get(name)?.value,
    set: (name, value, options) => store.set(name, value, options),
    delete: (name) => store.delete(name),
  });
}

export async function acting(): Promise<{ app: App; user: CurrentUserResult }> {
  const a = await requestApp();
  return { app: a, user: await a.currentUser.execute() };
}
