import type { AuditEntry } from '@/domain/audit/audit-entry.js';
import type { AuditReader } from '@/domain/audit/audit-repository.js';

export interface ListAuditRequest {
  readonly userId: string;
  readonly limit?: number | undefined;
}

export interface ListAuditResponse {
  readonly entries: readonly AuditEntry[];
  /** Operations we started and never learned the outcome of. */
  readonly unresolvedCount: number;
}

const DEFAULT_LIMIT = 100;

export class ListAuditQuery {
  constructor(private readonly audit: AuditReader) {}

  async execute(req: ListAuditRequest): Promise<ListAuditResponse> {
    const entries = await this.audit.listForUser(req.userId, req.limit ?? DEFAULT_LIMIT);
    return {
      entries,
      unresolvedCount: entries.filter((e) => e.outcome === 'attempted').length,
    };
  }
}
