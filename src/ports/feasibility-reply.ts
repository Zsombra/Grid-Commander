import type { FeasibilityAdvisory } from '@/domain/agent/feasibility.js';
import type { FeasibilityReply } from '@/domain/agent/feasibility-reply.js';

export type { FeasibilityReply } from '@/domain/agent/feasibility-reply.js';

/**
 * Carrying a write's reply across the redirect that follows it.
 *
 * A port rather than a direct cookie call for the reason every other boundary
 * here is one: the surface must not know that this is a cookie, or that it is
 * signed, or with what. It asks for the reply to the last edit and gets one or
 * nothing.
 *
 * `read` returns `null` for every way this can fail — absent, malformed, badly
 * signed, or shaped unlike the declaration. The distinctions matter to the
 * audit and not to the surface: there is nothing an operator does differently
 * on a tampered cookie than on no cookie, and a surface offered four empty
 * states will render four slightly different nothings.
 */
export interface FeasibilityReplyPort {
  /**
   * Issue the reply to a write that just happened.
   *
   * Only callable where cookies may be written — a Next.js server action or
   * route handler, never a page render. That is a framework rule, and it is the
   * reason the reply is issued by the apply action rather than collected by the
   * page that shows it.
   */
  issue(params: { agentId: string; advisory: FeasibilityAdvisory }): void;

  /** The carried reply, if there is one this product wrote and still stands by. */
  read(): FeasibilityReply | null;
}
