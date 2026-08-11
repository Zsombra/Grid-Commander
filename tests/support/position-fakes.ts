import type { Exposure, ExposureResult, OpenPosition, PositionsPort, RestingOrder, RestingOrdersResult } from '@/ports/positions.js';

/** The live HYPE position of 2026-08-06, verbatim in shape. */
export function aPosition(over: Partial<OpenPosition> = {}): OpenPosition {
  return {
    positionId: '2a7457a8-488e-4ff3-b0c0-f68eea11b3b6',
    agentId: 'a1',
    coinTicker: 'HYPE',
    direction: 'LONG',
    entryFillPrice: 56.233,
    markPrice: 56.176,
    entryNotionalUsd: 12.37126,
    currentNotionalUsd: 12.35872,
    marginedUsd: 2.474252,
    unrealizedPnlUsd: -0.012539999999998911,
    roePct: -0.5068198388845967,
    effectiveLeverage: 5,
    // The decision that opened this recorded 55.67456526. Trailing moved it.
    effectiveStopLoss: 55.954,
    effectiveTakeProfit: 57.34986948,
    liquidationPrice: null,
    conviction: 0.65,
    timeHorizon: '1h',
    openedAt: '2026-08-06T17:10:18.262Z',
    pricingStatus: 'LIVE',
    status: 'OPEN',
    decisionId: '4f1096e9-cb21-4695-ad4f-0befd0b5f704',
    signalLogId: 'da98f325-0271-4e5f-80fd-bc25cb5d153f',
    ...over,
  };
}

export function anExposure(over: Partial<Exposure> = {}): Exposure {
  return {
    totals: {
      openPositionCount: 1,
      activeAgentCount: 1,
      unpricedPositionCount: 0,
      marginedUsd: 2.474252,
      currentNotionalUsd: 12.35872,
      unrealizedPnlUsd: -0.012539999999998911,
      roePct: -0.5068198388845967,
      generatedAtMs: 1786038921702,
      pricingStatus: 'LIVE',
    },
    positions: [aPosition()],
    ...over,
  };
}

export class FakePositionsPort implements PositionsPort {
  result: ExposureResult = { kind: 'none' };
  /** Empty is a real answer: nothing rests. Reassign to script legs or a failure. */
  resting: RestingOrdersResult = { kind: 'orders', orders: [] };
  async readActivePositions(): Promise<ExposureResult> {
    return this.result;
  }
  async readRestingOrders(): Promise<RestingOrdersResult> {
    return this.resting;
  }
}

/** A resting leg in the exact shape observed live 2026-08-10 (#116). */
export function aRestingOrder(over: Partial<RestingOrder> = {}): RestingOrder {
  return {
    orderId: '513946107402',
    symbol: 'TRUMP',
    side: 'SELL',
    status: 'OPEN',
    orderType: 'Stop Market',
    price: 1.3257,
    triggerPrice: 1.4731,
    quantity: 10.1,
    originalSize: 10.1,
    filledSize: 0,
    reduceOnly: true,
    clientOrderId: '0x8fa5d8024172404eb2d6b6ddfafc3521',
    placedAtMs: 1786382848069,
    ...over,
  };
}
