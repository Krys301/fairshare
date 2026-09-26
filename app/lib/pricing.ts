// Mirrors programs/fairshare/src/pricing.rs for display purposes only.
// The onchain program is the source of truth; this never signs a transaction.

export interface PricingParams {
  fixed: number;
  perHead: number;
  marginBps: number;
  pMin: number;
  pMax: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** price(n) = clamp( ceil((fixed/n + perHead) * (1 + marginBps/10000)), pMin, pMax ) */
export function price(n: number, params: PricingParams): number {
  if (n <= 0) {
    throw new Error("attendee count must be greater than zero");
  }
  const { fixed, perHead, marginBps, pMin, pMax } = params;

  const cost = fixed + perHead * n;
  const numerator = cost * (10_000 + marginBps);
  const denominator = n * 10_000;
  const raw = Math.ceil(numerator / denominator);

  return clamp(raw, pMin, pMax);
}

/** The smallest attendee count above `from` where the price is strictly lower, if any. */
export function nextPriceDrop(
  from: number,
  params: PricingParams,
  searchLimit = 10_000,
): number | null {
  const current = price(from, params);
  if (current === params.pMin) {
    return null; // already at the floor; it can never drop further
  }
  for (let n = from + 1; n <= from + searchLimit; n++) {
    if (price(n, params) < current) {
      return n;
    }
  }
  return null;
}

/** The smallest attendee count whose price equals price(n) (the start of the current tier). */
export function priceTierStart(n: number, params: PricingParams, searchLimit = 10_000): number {
  const current = price(n, params);
  let start = n;
  for (let m = n - 1; m >= 1 && n - m <= searchLimit; m--) {
    if (price(m, params) !== current) {
      break;
    }
    start = m;
  }
  return start;
}

/** Base units -> a display string with the given decimals (e.g. 6 for USDC). */
export function formatAmount(baseUnits: number, decimals = 6): string {
  return (baseUnits / 10 ** decimals).toFixed(2);
}
