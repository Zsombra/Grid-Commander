/**
 * What a user can actually do when the product's authority stops working.
 *
 * Diagnosis and remedy are different facts. *What went wrong* is deliberately
 * one message for every cause — an expired token, a forged cookie, a 401 — so
 * that nobody has to distinguish between things they cannot act on differently
 * (design W-C). *What to do about it* is the opposite: it depends entirely on
 * how this deployment obtained its authority, and there are exactly two answers.
 *
 * Naming the wrong one is worse than naming none. Someone told to reconnect on a
 * deployment with nothing to reconnect goes looking for a button that was
 * removed on purpose, and concludes the product is broken.
 *
 * Chosen once, where the deployment is assembled, and never per request.
 */
export type Remedy =
  /** A delegated grant was lost. Authorizing again produces a new one. */
  | 'reconnect'
  /** A configured credential was refused. Only the operator can replace it. */
  | 'repair-the-key';

/**
 * The sentence for a remedy.
 *
 * Composed here rather than at each surface, for the same reason
 * `describeDisclosure` is: two copies of a sentence become two sentences.
 */
export function describeRemedy(remedy: Remedy): string {
  switch (remedy) {
    case 'reconnect':
      return 'Reconnect to continue.';
    case 'repair-the-key':
      // Names the variable, because the person reading this is the person who
      // set it. A restart is required and said so: the key is read at startup,
      // so replacing it without one changes nothing.
      return 'Check the BATTLEGRID_API_KEY this deployment was configured with, then restart it.';
  }
}
