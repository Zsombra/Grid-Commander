import type { Answer, Consultation } from '@/domain/assistant/answer.js';
import { ground } from '@/domain/assistant/answer.js';
import { isReachable, readOnlyToolset } from '@/domain/assistant/toolset.js';
import { NOT_CONNECTED } from '@/domain/session/session.js';
import { AssistantUnavailableError, ConnectionRevokedError } from '@/domain/errors.js';
import type { AssistantPort, Turn } from '@/ports/assistant.js';
import type { BattleGridPort } from '@/ports/battlegrid.js';

export interface AskAssistantRequest {
  readonly userId: string;
  readonly accessToken: string;
  readonly question: string;
  readonly history?: readonly Turn[] | undefined;
}

export interface AskAssistantResponse {
  readonly answer: Answer;
}

/**
 * Reads the assistant makes are recorded as the assistant's.
 *
 * The audit log's claim is "this is what Grid-Commander did to your account", and
 * an assistant reading twelve tools to answer one question is Grid-Commander
 * doing something on the user's behalf. Marked rather than merged: reviewing a
 * log, "I did this" and "the assistant did this while answering me" are different
 * levels of intent. See design A-E.
 */
export const ASSISTANT_ACTOR = 'assistant' as const;

export class UnreachableToolError extends Error {
  constructor(name: string) {
    super(`"${name}" is not available to the assistant`);
  }
}

/**
 * Ask a question about the connected account.
 *
 * Three things happen here that the assistant implementation cannot do for
 * itself, which is why they are here rather than in the port:
 *
 * 1. The toolset is **derived**, by filtering the live discovered set through
 *    the same classifier the guard sequence uses. Nothing else may assemble it.
 * 2. Every tool call is checked against that set again before it runs. This
 *    should be impossible to trip — the model was handed the list — and it rests
 *    on a model honouring what it was handed, which is not a guarantee.
 * 3. Losing access abandons the answer rather than completing it from reads that
 *    happened while the grant still existed. See design A-F.
 *
 * It holds no `AuditWriter`: the reads go through `callTool`, which runs the
 * guard sequence, which records them. A second writer here would be a second
 * record of one act.
 */
export class AskAssistantCommand {
  constructor(
    private readonly battlegrid: BattleGridPort,
    private readonly assistant: AssistantPort,
  ) {}

  async execute(req: AskAssistantRequest): Promise<AskAssistantResponse> {
    const discovered = await this.battlegrid.discoverTools(req.accessToken).catch(() => null);
    if (discovered === null) {
      return {
        answer: {
          kind: 'refused',
          reason:
            'I could not find out what I am able to read from BattleGrid right now, ' +
            'so I would be guessing about your setup. Try again shortly.',
        },
      };
    }

    const toolset = readOnlyToolset(discovered);
    const consulted: Consultation[] = [];

    /**
     * Whether authority was withdrawn at any point while answering.
     *
     * Recorded rather than only thrown, because throwing is not enough: a model
     * harness that catches its own tool errors and carries on is entirely
     * ordinary, and the throw would never reach this method. Without this flag,
     * a swallowed revocation becomes a grounded answer about an account the
     * product had just lost access to — with the revocation recorded as nothing
     * worse than a failed read.
     *
     * Found by mutation testing: removing the re-throw broke nothing, which was
     * the clue that the re-throw was not what was carrying A-F.
     */
    let revoked = false;

    const callTool = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
      // Checked again, after the model chose. The list it was handed is the
      // guarantee; this is what makes the guarantee not depend on the model.
      if (!isReachable(toolset, name)) throw new UnreachableToolError(name);

      try {
        const result = await this.battlegrid.callTool({
          userId: req.userId,
          accessToken: req.accessToken,
          // Marked, so a user reviewing their audit log can tell "I did this"
          // from "the assistant did this while answering me". See A-E.
          actor: ASSISTANT_ACTOR,
          tool: name,
          args,
        });
        consulted.push({ tool: name, outcome: 'read' });
        return result.content;
      } catch (err) {
        // A revoked connection is not a failed read — it ends the answer. See
        // A-F: a synthesised statement about an account, composed from a grant
        // that no longer exists, is not something to hand back.
        if (err instanceof ConnectionRevokedError) {
          revoked = true;
          throw err;
        }
        consulted.push({
          tool: name,
          outcome: 'failed',
          failure: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    };

    try {
      const response = await this.assistant.answer({
        question: req.question,
        toolset,
        history: req.history ?? [],
        callTool,
      });

      // Checked after the port returns, not only on the way through. See the
      // note on `revoked`.
      if (revoked) return { answer: { kind: 'refused', reason: NOT_CONNECTED } };

      // The consultations this use case observed, not the ones the port
      // reported. A port that under-reported its reads would otherwise be
      // producing an answer whose citation it wrote itself.
      return { answer: ground(response.text, consulted) };
    } catch (err) {
      if (err instanceof ConnectionRevokedError) {
        return { answer: { kind: 'refused', reason: NOT_CONNECTED } };
      }
      // No model configured, or the configured one could not be reached. A
      // refusal, for the same reason a discovery failure above is one: the
      // alternative is an error page over a question that was fine to ask, and
      // the reads that did happen are not an answer waiting to be presented.
      if (err instanceof AssistantUnavailableError) {
        return { answer: { kind: 'refused', reason: err.message } };
      }
      throw err;
    }
  }
}
