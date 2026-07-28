/** Injected so expiry is testable without waiting. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
