import { boolean, index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Tables mirror columns 1:1. Nothing here is computed, and nothing nullable is
 * given a default that would erase the difference between "absent" and "zero".
 */

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    // The connection IS the identity — this is the natural key.
    battlegridSubject: text('battlegrid_subject').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_battlegrid_subject_idx').on(t.battlegridSubject)],
);

export const connections = pgTable(
  'connections',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    battlegridSubject: text('battlegrid_subject').notNull(),
    // Encrypted at rest. A database dump alone must not be usable.
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted'),
    // Nullable on purpose: the server may not tell us, and pretending it did
    // would be worse than knowing we do not know.
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    scopes: text('scopes').array().notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('connections_user_id_idx').on(t.userId)],
);

export const oauthTransactions = pgTable('oauth_transactions', {
  state: text('state').primaryKey(),
  codeVerifier: text('code_verifier').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const auditEntries = pgTable(
  'audit_entries',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    // Who caused it — the user, or the assistant reading on their behalf.
    // Defaulted rather than required so that the column has an answer for a row
    // written by any path that predates it; nothing writes such a row today.
    actor: text('actor').notNull().default('user'),
    tool: text('tool').notNull(),
    destructive: boolean('destructive').notNull(),
    // attempted | succeeded | failed. There is no 'unknown': 'attempted' IS
    // the unknown state, and reading it that way is the point.
    outcome: text('outcome').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    idempotencyKey: text('idempotency_key'),
  },
  (t) => [
    index('audit_entries_user_id_created_at_idx').on(t.userId, t.createdAt),
    uniqueIndex('audit_entries_user_idempotency_idx').on(t.userId, t.idempotencyKey),
  ],
);

export const confirmationTokens = pgTable(
  'confirmation_tokens',
  {
    token: text('token').primaryKey(),
    userId: text('user_id').notNull(),
    // No `actor` here, unlike audit_entries. A confirmation is evidence that a
    // human was shown a consequence, so the only actor it can have is the user;
    // the assistant cannot issue one because it cannot reach a mutating tool.
    tool: text('tool').notNull(),
    target: text('target').notNull(),
    // Stored so the audit can prove what the user was actually shown.
    consequence: text('consequence').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
  },
  (t) => [index('confirmation_tokens_user_id_idx').on(t.userId)],
);

/**
 * What a model has suggested, and nothing that can be spent.
 *
 * A proposal is a **note**: which product operation, against which target, with
 * which values. It holds no confirmation token and no access token, and the
 * `battlegrid-connection` requirement it implements is stated as a property —
 * an attacker who reads every row here can change nothing on any account.
 * `tests/db/proposals.test.ts` asserts the absence of both columns by reading
 * the schema, so a later migration cannot reintroduce one quietly.
 *
 * There is deliberately no worker, no scheduler and no retry touching this
 * table. Nothing consumes a row but a person opening it, which is why the
 * spec can say a proposal never performs itself.
 */
export const proposals = pgTable(
  'proposals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    // A *product operation* — `edit`, `rebind`, `deploy` — never a BattleGrid
    // tool name. The web route and the MCP layer resolve the same vocabulary,
    // so a name cannot come to mean two things, and a platform rename does not
    // reach a migration.
    operation: text('operation').notNull(),
    // What it points at, in this product's terms: an agent id, a strategy id
    // and signal, a coin. Opaque here on purpose — its shape belongs to the
    // operation, exactly as `signal_rules.params` belongs to the signal.
    target: text('target').notNull(),
    // The model's values, verbatim. Kept so `/pending/[id]` can show what was
    // proposed beside what the fresh describe says will happen; reconciling
    // them here would be agreeing on the operator's behalf.
    proposedValues: text('proposed_values').notNull(),
    // Written from the injected clock, never `defaultNow()`. Staleness is
    // computed from this against the 72-hour horizon, and a database default
    // would put the one value the tests need to move outside their reach.
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    // open | agreed | declined. Never 'stale': staleness is derived from
    // `recordedAt`, so a stored flag could disagree with the timestamp it is
    // supposed to summarise.
    status: text('status').notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [index('proposals_user_id_recorded_at_idx').on(t.userId, t.recordedAt)],
);
