import type { CatalogResult } from '@/domain/agent/catalog.js';
import type { AgentsPort } from '@/ports/agents.js';

/**
 * The vocabulary and limits the create form is built from.
 *
 * A query of its own so a route never touches the port directly. The form
 * cannot be rendered without it — an unreadable catalog means no form, rather
 * than a form whose submission is certain to fail.
 */
export class ReadCatalogQuery {
  constructor(private readonly agents: AgentsPort) {}

  async execute(params: { userId: string; accessToken: string }): Promise<CatalogResult> {
    return this.agents.readCatalog(params);
  }
}
