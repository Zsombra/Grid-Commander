import type { RadarDeployment } from '@/domain/agent/deployment.js';
import type { Confirmation } from '@/domain/capability/confirmation.js';
import type { FailureCause } from './failure.js';

/**
 * The radar: where agents are deployed to act, and the two acts that change
 * it. The writes arrived with `deploy-and-undeploy-are-offered` — both are
 * person-confirmed against the agent+coin pair upstream, and the adapter
 * routes them through the full guard sequence.
 */
export interface RadarPort {
  listDeployments(params: {
    userId: string;
    accessToken: string;
  }): Promise<RadarReadResult>;

  /**
   * The timeframes the platform's own declaration permits for a deployment,
   * read from the live discovery — never a list compiled into the product.
   * Empty means the declaration could not answer, and composition refuses.
   */
  deploymentTimeframes(params: {
    userId: string;
    accessToken: string;
  }): Promise<readonly string[]>;

  /** Create or replace the deployment on one coin. Confirmed upstream. */
  upsertDeployment(params: {
    userId: string;
    accessToken: string;
    coinId: string;
    timeframe: string;
    enabled: boolean;
    agentId: string;
    expectedRevision: number | null;
    confirmation: Confirmation;
  }): Promise<{ readonly revision: number }>;

  /** Remove the deployment on one coin. Destructive; confirmed upstream. */
  deleteDeployment(params: {
    userId: string;
    accessToken: string;
    coinId: string;
    expectedRevision: number;
    confirmation: Confirmation;
  }): Promise<{ readonly deleted: boolean }>;
}

export type RadarReadResult =
  | { readonly kind: 'deployments'; readonly deployments: readonly RadarDeployment[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
