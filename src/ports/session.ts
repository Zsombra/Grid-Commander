import type { SessionResult, SessionValue } from '@/domain/session/session.js';

/**
 * Reading and writing the session, without the domain or the use cases knowing
 * what a cookie is.
 *
 * `next/headers` is a framework detail and an awkward one to test against; the
 * rules about what a session means are neither.
 */
export interface SessionPort {
  /** Read and verify. Returns why it was rejected, never a bare null. */
  read(): Promise<SessionResult>;
  issue(session: SessionValue): Promise<void>;
  clear(): Promise<void>;
}
