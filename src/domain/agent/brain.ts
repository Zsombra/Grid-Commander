/**
 * What an agent reasons with.
 *
 * BattleGrid accepts either a named preset — which carries its own model *and*
 * trader soul — or a custom model paired with a behavior profile. The tool
 * schema says: never both (findings-agents F-5).
 *
 * Modelled as a union rather than an object with optional fields, so "preset
 * AND custom model" is unconstructible. The alternative makes the invalid state
 * representable right up until the user has filled in the whole form and
 * pressed create, and moves the failure from the type checker to the server.
 */

export type Brain =
  | { readonly kind: 'preset'; readonly preset: string }
  | { readonly kind: 'custom'; readonly modelId: string; readonly behavior: Behavior };

export interface Behavior {
  readonly risk: Risk;
  readonly outlook: Outlook;
  readonly conviction: Conviction;
}

/**
 * These three are closed enums in the tool schema, so they are typed here.
 * Everything with an open or growing value set — model ids, brain presets,
 * position-management presets — is read from the platform at runtime instead.
 * See `catalog.ts` and findings-agents F-3.
 */
export const RISKS = ['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'] as const;
export const OUTLOOKS = ['OPTIMIST', 'REALIST', 'PESSIMIST'] as const;
export const CONVICTIONS = ['CAUTIOUS', 'MEASURED', 'BOLD'] as const;

export type Risk = (typeof RISKS)[number];
export type Outlook = (typeof OUTLOOKS)[number];
export type Conviction = (typeof CONVICTIONS)[number];

export function isRisk(v: unknown): v is Risk {
  return typeof v === 'string' && (RISKS as readonly string[]).includes(v);
}

export function isOutlook(v: unknown): v is Outlook {
  return typeof v === 'string' && (OUTLOOKS as readonly string[]).includes(v);
}

export function isConviction(v: unknown): v is Conviction {
  return typeof v === 'string' && (CONVICTIONS as readonly string[]).includes(v);
}

/**
 * Render a brain as the `brain` argument BattleGrid expects.
 *
 * The union collapses to exactly one variant here, which is the point: there is
 * no branch that can emit both shapes.
 */
export function brainToArgument(brain: Brain): Record<string, unknown> {
  return brain.kind === 'preset'
    ? { kind: 'preset', preset: brain.preset }
    : { kind: 'custom', modelId: brain.modelId, behavior: { ...brain.behavior } };
}
