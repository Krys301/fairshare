import { formatAmount, nextPriceDrop, price, priceTierStart } from "@/lib/pricing";
import type { PricingParams } from "@/lib/pricing";

export function PriceCard({
  pricing,
  attendeeCount,
}: {
  pricing: PricingParams;
  attendeeCount: number;
}) {
  const currentN = attendeeCount + 1;
  const currentPrice = price(currentN, pricing);
  const tierStart = priceTierStart(currentN, pricing);
  const nextDrop = nextPriceDrop(currentN, pricing);

  const progress = nextDrop
    ? Math.min(1, (currentN - tierStart) / (nextDrop - tierStart))
    : 1;

  return (
    <div className="rounded-2xl border border-card-border bg-card p-5 shadow-lg shadow-black/20">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">Current price</span>
        <span className="text-sm text-muted">{attendeeCount} joined</span>
      </div>
      <div className="mt-1 text-3xl font-bold tracking-tight">
        ${formatAmount(currentPrice)}
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {nextDrop
            ? `Price falls to $${formatAmount(price(nextDrop, pricing))} at ${nextDrop} people, ${nextDrop - currentN} to go`
            : "Already at the lowest price"}
        </p>
      </div>
    </div>
  );
}
