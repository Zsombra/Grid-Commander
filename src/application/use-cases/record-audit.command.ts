import type { AuditWriter, NewAuditEntry } from '@/domain/audit/audit-repository.js';
import type { AuditOutcome } from '@/domain/audit/audit-entry.js';

/**
 * The two-phase audit write.
 *
 * `begin` commits before the operation is attempted; `complete` records what
 * happened. They are deliberately separate calls rather than a wrapper that
 * takes a callback, because the adapter needs the entry id in between to put
 * on its result.
 */
export class RecordAuditCommand {
  constructor(private readonly audit: AuditWriter) {}

  async begin(entry: NewAuditEntry): Promise<string> {
    return this.audit.begin(entry);
  }

  async complete(
    id: string,
    outcome: Exclude<AuditOutcome, 'attempted'>,
    failureReason?: string,
  ): Promise<void> {
    await this.audit.complete(id, outcome, failureReason);
  }
}
