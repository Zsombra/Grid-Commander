import type { Catalog } from '@/domain/agent/catalog.js';
import { removesTheLimit, TRADING_CONFIG_FIELDS } from '@/domain/agent/catalog.js';
import { POSITION_MANAGEMENT_FIELDS, positionDrift } from '@/domain/agent/trading-config.js';
import type { AccountStatePort } from '@/ports/account.js';
import type { AgentsPort } from '@/ports/agents.js';
import type { FailureCause } from '@/ports/failure.js';
import { exitGeometry, type ExitGeometry } from './read-trading-record.query.js';

/**
 * An agent's settings, each against the thing that makes it safe or unsafe.
 *
 * `maxDailyTrades: 34` is not a reading anyone can act on. Against BattleGrid's
 * own declared default of 10 it is a decision to trade more than three times as
 * often as the platform suggests, and *that* is the fact worth surfacing. The
 * gauge beside it already says how much of the 34 is used; nothing said whether
 * 34 was a reasonable number to pick.
 *
 * Three readings, three independent reads, and **one failing hides neither of
 * the others** — the same rule the pipeline page keeps for its three stages. An
 * operator whose catalog read times out should still learn that 74% of their
 * agent's trades ended at a stop.
 */

/**
 * One capped field, beside what the platform would have chosen for it.
 *
 * `null` on `platformDefault` is a real answer and not a missing one: six
 * fields are deliberately undefaulted by BattleGrid — `tradingMode`,
 * `maxDailyLossUsd`, `maxCumulativeDrawdownUsd`, `maxConcurrentExposureUsd`,
 * `balanceThresholdUsd`, `minAllocationUsd` — which is to say the platform
 * declines to decide on anyone's behalf how much an agent may lose. A surface
 * inventing a comparison for those would be answering a question BattleGrid
 * deliberately left open.
 */
export interface AgainstDefault {
  readonly field: string;
  readonly value: number;
  readonly platformDefault: number | null;
  /**
   * The agent's value as a multiple of the platform's, where both are numbers
   * and the default is not zero.
   *
   * Computed here rather than in a component for the reason `DecisionList`
   * gives about confidence against its threshold: a surface that works out the
   * ratio for itself will one day work it out upside down, and on a limit that
   * reads as caution when the truth is the opposite.
   */
  readonly multiple: number | null;
  /** True where the agent's value is exactly the platform's — agreement is a fact. */
  readonly matchesDefault: boolean;
  /**
   * Whether this page's owner can still change it.
   *
   * The read is wider than the write and has been since the beginning, but v15
   * made the gap matter here: `maxStopLossPct`, `minStopLossPct` and
   * `minRiskRewardRatio` moved off the agent and onto the strategy. The agent
   * read still returns them, so `maxStopLossPct: 1` against a declared default
   * of 5 renders as `0.2×` — a true and useful reading of a field **an
   * operator cannot act on from an agent**.
   *
   * Derived from `TRADING_CONFIG_FIELDS`, the list a write is assembled from,
   * so a field the platform moves back becomes writable here without anyone
   * editing a second list. Showing the comparison without this flag would
   * invite someone to fix a number on the page that owns it least.
   */
  readonly writable: boolean;
}

/**
 * What decides how long a position survives, beside how long they have.
 *
 * The preset label is not in here. `agent-authoring` owns what drift between a
 * label and its values means, and it says so on the edit surface; a second
 * implementation of that contract is the drift it was written to prevent. This
 * carries the two switches that force an exit — trailing and time decay — and
 * defers the naming of drift to `positionDrift()`, the function that already
 * answers it.
 */
export interface Management {
  readonly enabled: boolean;
  readonly trailingEnabled: boolean;
  readonly timeDecayEnabled: boolean;
  readonly preset: string | null;
  /** Fields differing from the preset's catalog values, via `positionDrift()`. */
  readonly differing: readonly string[];
}

/**
 * The exposure cap, against the money behind it.
 *
 * `THE .0` carries a cap of 250 on an account holding 43.67. A cap larger than
 * the balance cannot ever stop the agent: it renders as a limit and reads as
 * prudence, which is the same failure as a stop set inside the noise.
 *
 * The balance is **the account's**. One balance funds every agent on it, so a
 * per-agent surface implying otherwise would overstate the money available by
 * the number of agents sharing it.
 */
export interface CapAgainstBalance {
  readonly capUsd: number;
  /** The account balance, or null where the platform stated none. */
  readonly balanceUsd: number | null;
  /** Whether the platform reports a funded account at all. */
  readonly hasAccount: boolean;
  /**
   * The cap as a multiple of the balance, where both are numbers and the
   * balance is not zero.
   *
   * Computed here rather than in a component for the reason the panel's other
   * readings are: a surface working out `cap ÷ balance` for itself will one day
   * work it out upside down, and on this figure upside down reads as headroom.
   */
  readonly multiple: number | null;
  /**
   * The finding, stated rather than left as arithmetic.
   *
   * `5.7×` alone makes the reader work out which side is larger on the one
   * screen built so they do not have to.
   */
  readonly exceedsBalance: boolean;
}

/** A source that answered, one that had nothing, or one that could not be read. */
export type Reading<T> =
  | { readonly kind: 'read'; readonly value: T }
  | { readonly kind: 'none' }
  | { readonly kind: 'unreadable'; readonly reason: string; readonly cause: FailureCause };

export interface RiskReading {
  readonly ceilings: Reading<readonly AgainstDefault[]>;
  readonly geometry: Reading<ExitGeometry>;
  readonly management: Reading<Management>;
  readonly exposure: Reading<CapAgainstBalance>;
}

/**
 * How many closed trades to fold.
 *
 * The platform pages `list_trade_outcomes` and reports a `total`. Fifty is one
 * page and enough for a median to mean something without pretending to be the
 * agent's whole history — `ExitGeometry` carries `from`, `to` and `measured` so
 * the surface states the window it summarised rather than implying it counted
 * everything.
 */
const GEOMETRY_WINDOW = 50;

export class ReadRiskReadingQuery {
  constructor(
    private readonly agents: AgentsPort,
    private readonly account: AccountStatePort,
  ) {}

  async execute(req: {
    userId: string;
    accessToken: string;
    agentId: string;
  }): Promise<RiskReading> {
    // Concurrent and independently settled. `Promise.all` is safe because each
    // port call resolves its own failure into a result branch rather than
    // throwing — a rejection here would take down the two reads that answered.
    const [catalog, roster, trades, account] = await Promise.all([
      this.agents.readCatalog(req),
      this.agents.listAgents(req),
      this.agents.readTradeOutcomes({ ...req, limit: GEOMETRY_WINDOW }),
      this.account.readAccountState(req),
    ]);

    const agent =
      roster.kind === 'agents' ? roster.agents.find((a) => a.id === req.agentId) : undefined;
    const fields = agent?.tradingConfig?.fields ?? null;

    return {
      ceilings: againstDefaults(catalog, fields, roster),
      geometry:
        trades.kind === 'unreadable'
          ? trades
          : trades.kind === 'none' || trades.outcomes.length === 0
            ? { kind: 'none' }
            : { kind: 'read', value: exitGeometry(trades.outcomes) },
      management: management(catalog, fields, roster),
      exposure: capAgainstBalance(account, fields, roster),
    };
  }
}

/**
 * Every numeric field the agent carries, against the catalog's default for it.
 *
 * Derived from what the agent actually holds rather than from a list of fields
 * kept here. A default BattleGrid starts publishing is one this surface picks
 * up without anyone editing it, and a field it stops publishing stops being
 * compared — the same property `undefaultableFields()` gets by deriving instead
 * of enumerating.
 */
function againstDefaults(
  catalog: Awaited<ReturnType<AgentsPort['readCatalog']>>,
  fields: Readonly<Record<string, unknown>> | null,
  roster: Awaited<ReturnType<AgentsPort['listAgents']>>,
): Reading<readonly AgainstDefault[]> {
  if (catalog.kind === 'unreadable') return catalog;
  if (roster.kind === 'unreadable') return roster;
  if (fields === null) return { kind: 'none' };

  const declared: Catalog = catalog.catalog;
  const out: AgainstDefault[] = [];
  for (const [field, raw] of Object.entries(fields)) {
    // Only numbers are comparable. `tradingMode` is a string and
    // `positionManagement` an object; neither has a multiple, and neither
    // belongs in a list of ceilings.
    if (typeof raw !== 'number') continue;
    const d = declared.defaults[field];
    const platformDefault = typeof d === 'number' ? d : null;
    out.push({
      field,
      value: raw,
      platformDefault,
      // A default of zero admits no multiple, and dividing by it would produce
      // an Infinity that renders as a number.
      multiple: platformDefault === null || platformDefault === 0 ? null : raw / platformDefault,
      matchesDefault: platformDefault !== null && raw === platformDefault,
      writable: (TRADING_CONFIG_FIELDS as readonly string[]).includes(field),
    });
  }
  out.sort((a, b) => a.field.localeCompare(b.field));

  return out.length === 0 ? { kind: 'none' } : { kind: 'read', value: out };
}

/**
 * The two switches that end a position early, and whether the agent's values
 * still are what its label claims.
 *
 * `enabled` is read as the master switch it is: with position management off,
 * the fourteen values beneath it are moot, and presenting them as governing
 * anything would explain behaviour that is not happening.
 */
function management(
  catalog: Awaited<ReturnType<AgentsPort['readCatalog']>>,
  fields: Readonly<Record<string, unknown>> | null,
  roster: Awaited<ReturnType<AgentsPort['listAgents']>>,
): Reading<Management> {
  if (roster.kind === 'unreadable') return roster;
  if (fields === null) return { kind: 'none' };

  const block = fields['positionManagement'];
  if (typeof block !== 'object' || block === null) return { kind: 'none' };
  const pm = block as Readonly<Record<string, unknown>>;

  const preset = typeof pm['positionManagementPreset'] === 'string'
    ? (pm['positionManagementPreset'] as string)
    : null;

  // Drift needs the catalog. Where it could not be read the settings still
  // render — an unreadable catalog costs the drift claim, not the whole panel.
  const drift = catalog.kind === 'unreadable' ? null : positionDrift(pm, catalog.catalog);

  return {
    kind: 'read',
    value: {
      enabled: pm['enabled'] === true,
      trailingEnabled: pm['trailingEnabled'] === true,
      timeDecayEnabled: pm['timeDecayEnabled'] === true,
      preset,
      differing: drift?.differing ?? [],
    },
  };
}

/** The fourteen behavioural fields, re-exported so a surface names them once. */
export { POSITION_MANAGEMENT_FIELDS };


/**
 * The exposure cap, against the account balance behind it.
 *
 * Two reads, and they fail independently of each other and of everything else
 * on the panel: an unreadable balance costs this comparison and not the exit
 * geometry beside it.
 *
 * **No apportionment.** The balance is the account's and is reported as the
 * account's. `get_agent_fund_allocation` is the one tool claiming to divide it
 * per agent and it answered `committedUsd: 0` for an agent holding $17.45 of
 * margin at the same moment, so dividing it ourselves would be an invention
 * dressed as a reading.
 */
function capAgainstBalance(
  account: Awaited<ReturnType<AccountStatePort['readAccountState']>>,
  fields: Readonly<Record<string, unknown>> | null,
  roster: Awaited<ReturnType<AgentsPort['listAgents']>>,
): Reading<CapAgainstBalance> {
  if (roster.kind === 'unreadable') return roster;
  if (account.kind === 'unreadable') return account;
  if (fields === null) return { kind: 'none' };

  const cap = fields['maxConcurrentExposureUsd'];
  if (typeof cap !== 'number') return { kind: 'none' };
  // An unbounded cap is already reported as unbounded by the gauges. A multiple
  // against a limit that does not exist would describe nothing, and would read
  // as though the agent were capped when the point is that it is not.
  if (removesTheLimit('maxConcurrentExposureUsd', cap)) return { kind: 'none' };

  const { balanceUsd, hasAccount } = account.state;
  // A balance of zero admits no multiple, and dividing by it would produce an
  // Infinity that renders as a number.
  const comparable = hasAccount && balanceUsd !== null && balanceUsd > 0;

  return {
    kind: 'read',
    value: {
      capUsd: cap,
      balanceUsd: hasAccount ? balanceUsd : null,
      hasAccount,
      multiple: comparable ? cap / (balanceUsd as number) : null,
      exceedsBalance: comparable && cap > (balanceUsd as number),
    },
  };
}
