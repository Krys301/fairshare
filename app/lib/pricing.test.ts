import { describe, expect, it } from "vitest";
import { formatAmount, nextPriceDrop, price, priceTierStart, type PricingParams } from "./pricing";

// PRD worked example: F=2000, c=5, margin=10%, p_min=10, p_max=50 (USDC, 6 decimals).
const WORKED_EXAMPLE: PricingParams = {
  fixed: 2_000_000_000,
  perHead: 5_000_000,
  marginBps: 1_000,
  pMin: 10_000_000,
  pMax: 50_000_000,
};

describe("price", () => {
  it("matches the PRD worked example", () => {
    expect(price(50, WORKED_EXAMPLE)).toBe(49_500_000);
    expect(price(100, WORKED_EXAMPLE)).toBe(27_500_000);
    expect(price(200, WORKED_EXAMPLE)).toBe(16_500_000);
    expect(price(400, WORKED_EXAMPLE)).toBe(11_000_000);
  });

  it("clamps to p_max for small n", () => {
    expect(price(1, WORKED_EXAMPLE)).toBe(WORKED_EXAMPLE.pMax);
  });

  it("clamps to p_min for large n", () => {
    expect(price(100_000, WORKED_EXAMPLE)).toBe(WORKED_EXAMPLE.pMin);
  });

  it("never increases as n increases", () => {
    let previous = price(1, WORKED_EXAMPLE);
    for (let n = 2; n <= 1000; n++) {
      const current = price(n, WORKED_EXAMPLE);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it("throws for n <= 0", () => {
    expect(() => price(0, WORKED_EXAMPLE)).toThrow();
  });
});

describe("nextPriceDrop", () => {
  it("finds the next attendee count where price falls", () => {
    const next = nextPriceDrop(50, WORKED_EXAMPLE);
    expect(next).not.toBeNull();
    expect(price(next!, WORKED_EXAMPLE)).toBeLessThan(price(50, WORKED_EXAMPLE));
  });

  it("returns null once already at the floor", () => {
    expect(nextPriceDrop(100_000, WORKED_EXAMPLE)).toBeNull();
  });
});

describe("priceTierStart", () => {
  it("finds where the current price plateau began", () => {
    const start = priceTierStart(1, WORKED_EXAMPLE);
    expect(price(start, WORKED_EXAMPLE)).toBe(price(1, WORKED_EXAMPLE));
    expect(price(start - 1 || 1, WORKED_EXAMPLE)).toBe(WORKED_EXAMPLE.pMax);
  });

  it("stays close to n once outside the p_max clamp region", () => {
    const start = priceTierStart(50, WORKED_EXAMPLE);
    expect(start).toBeLessThanOrEqual(50);
    expect(price(start, WORKED_EXAMPLE)).toBe(price(50, WORKED_EXAMPLE));
  });
});

describe("formatAmount", () => {
  it("formats base units as a 2-decimal string", () => {
    expect(formatAmount(49_500_000)).toBe("49.50");
    expect(formatAmount(11_000_000)).toBe("11.00");
  });
});
