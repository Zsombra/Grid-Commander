import type { RadarDeployment } from '@/domain/agent/deployment.js';
import type { FailureCause } from './failure.js';

/**
 * The radar, read-only: where agents are deployed to act.
 *
 * The write half — deploying and undeploying — is deliberately absent until
 * it arrives behind the full guard sequence
 * (`the-app-authors-agents-it-cannot-deploy`, step 2). This port exists so a
 * surface can stop being silent about whether an agent is doing anything.
 */
export interface RadarPort {
  listDeployments(params: {
    userId: string;
    accessToken: string;
  }): Promise<RadarReadResult>;
}

export type RadarReadResult =
  | { readonly kind: 'deployments'; readonly deployments: readonly RadarDeployment[] }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };
