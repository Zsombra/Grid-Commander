/**
 * The submitted-ness of a form, for tests.
 *
 * `useFormStatus()` is the only way a server-action form can know it is
 * working, and it is a **client runtime** fact: it becomes true after
 * hydration, when a submission is in flight. Nothing rendered on the server
 * ever sees it true.
 *
 * That is not a limitation of this project's walker. Measured against React's
 * own server renderer:
 *
 *     renderToStaticMarkup(<form><Submit /></form>)
 *     -> '<form><button>pending=false</button></form>'
 *
 * So swapping the walker for a real renderer — the migration
 * `the-render-harness-cannot-see-a-key-collision` (#194) contemplated and
 * `a-submitted-confirmation-gives-no-sign-it-is-working` (#153) was priced for
 * — would have cost 36 test files and still rendered exactly one of the two
 * states, never the one worth asserting.
 *
 * Mocking the hook is therefore not a shortcut around a weak harness. It is the
 * only way to reach the pending branch at all, short of driving a browser, and
 * it is the same move this suite already makes for `@/presentation/session.js`:
 * replace the boundary the page cannot control, then assert what the page does
 * with the answer.
 *
 * ## Using it
 *
 * `vi.mock` is hoisted above imports, so the factory has to import this itself:
 *
 *     vi.mock('react-dom', async (orig) => ({
 *       ...(await orig<Record<string, unknown>>()),
 *       useFormStatus: (await import('./support/form-status.js')).formStatus,
 *     }));
 *
 * Then drive it per assertion with `setPending(true)`. `resetPending()` belongs
 * in `beforeEach`: the flag is module state, and a test that left it true would
 * make the next file's idle assertions fail somewhere else entirely.
 */

let pending = false;

/** What `useFormStatus()` returns. The shape React documents, in full. */
export function formStatus(): {
  pending: boolean;
  data: FormData | null;
  method: string | null;
  action: string | null;
} {
  return { pending, data: null, method: null, action: null };
}

/** Assert against a form mid-submission. */
export function setPending(value: boolean): void {
  pending = value;
}

/** Back to idle. Belongs in `beforeEach`, not at the end of a test — a test that
 *  throws half way would otherwise leak `pending: true` into its neighbours. */
export function resetPending(): void {
  pending = false;
}
