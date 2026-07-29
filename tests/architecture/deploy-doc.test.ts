import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The deployment document describes the deployment this product is for.
 *
 * It did not. It opened with "Register the redirect URI at BattleGrid — do this
 * first", listed the two OAuth variables as required, and mentioned
 * `BATTLEGRID_API_KEY` zero times — while the product's whole personal path
 * exists so that you do *not* register a client to talk to your own account.
 * Someone following it would have done the exact ceremony the code was changed
 * to remove, and concluded the personal path did not exist.
 *
 * Prose cannot be typechecked, so it drifts silently and in one direction: a
 * change lands, the doc is not opened, and the gap is invisible until someone
 * follows it. These are the few claims whose falseness would send a reader to
 * the wrong place entirely.
 *
 * Deliberately not a spell-check of the whole file. A guard that fails on every
 * rewording gets deleted, and then it guards nothing.
 */

const DOC = 'docs/DEPLOYING.md';
const doc = () => readFileSync(DOC, 'utf8');

describe('the deploy doc covers the path this product is for', () => {
  it('names the personal credential', () => {
    expect(doc()).toMatch(/BATTLEGRID_API_KEY/);
  });

  it('says a personal deployment needs no registered client', () => {
    // The single most load-bearing sentence in the file. Without it the reader
    // goes and registers one.
    expect(doc()).toMatch(/not read at all|no client registration/i);
  });

  it('documents running it without a container', () => {
    // The image has never been built. A doc that only describes `docker run`
    // describes something nobody in this repository has ever done.
    expect(doc()).toMatch(/npm start/);
  });

  it('still covers the delegated path', () => {
    // Personal leading must not mean delegated disappearing — it is the only
    // path where other people can connect their own accounts.
    expect(doc()).toMatch(/BATTLEGRID_CLIENT_ID/);
    expect(doc()).toMatch(/redirect[_ ]uri/i);
  });

  it('discloses that a personal deployment authenticates nobody', () => {
    // Said at the moment someone chooses where to run it, which is the moment
    // it can still change their mind. The page says it too, by which point
    // they have already deployed.
    expect(doc()).toMatch(/authenticates nobody/i);
  });
});

describe('the deploy doc does not overstate what is required', () => {
  /**
   * There was a second assertion here, matching the old table's
   * `| BATTLEGRID_CLIENT_ID | yes |` shape. It passed against the very document
   * it was written to reject — the old row had a third column, so `yes` was
   * never the last cell and the anchor never matched.
   *
   * Deleted rather than repaired. The check below already rejects that row, and
   * a second assertion that cannot fail against the defect it names is the
   * thing this project keeps finding in its own guards: it costs a reader's
   * attention and buys nothing.
   */
  it('marks the OAuth variables per path rather than once', () => {
    const table = doc().slice(doc().indexOf('| Variable'));
    const row = table.split('\n').find((l) => l.includes('BATTLEGRID_CLIENT_ID'));
    expect(row, 'no BATTLEGRID_CLIENT_ID row in the configuration table').toBeDefined();
    expect(row).toMatch(/not read/i);
  });
});

describe('the deploy doc admits what has not been proven', () => {
  it('says the image has never been built', () => {
    expect(doc()).toMatch(/never been built/i);
  });

  /**
   * This used to assert the opposite, and the assertion outlived its truth.
   *
   * It required the doc to say *"no valid `bg_live_` key has existed in any
   * environment this was built in"* — correct when written, and false from the
   * day the personal path was exercised against two live accounts. A guard that
   * pins a document to a fact about the past will, the moment the fact changes,
   * fail on the honest edit and pass on the stale one. The fix was to point it
   * at what is *still* unproven rather than to delete it.
   *
   * The delegated path is that. Every OAuth branch is covered against a fake and
   * an invalid grant; no real authorization has ever been completed. It is also
   * the MVP's own exit criterion — "connect without ever handling a raw
   * credential" — so a deployer choosing it must be told.
   */
  it('says the OAuth path has never been completed for real', () => {
    expect(doc()).toMatch(/no real OAuth authorization has ever been completed/i);
  });

  it('does not claim the personal path is unproven either', () => {
    // The other half of the same failure: a document that reads as untested
    // everywhere is ignored everywhere.
    expect(doc()).toMatch(/What has been proven against the real platform/i);
  });
});
