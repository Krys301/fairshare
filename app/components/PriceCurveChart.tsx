"use client";

import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatAmount, price } from "@/lib/pricing";
import type { PricingParams } from "@/lib/pricing";

export function PriceCurveChart({
  pricing,
  nMax,
  currentN,
}: {
  pricing: PricingParams;
  nMax: number;
  currentN: number;
}) {
  const points = Math.max(nMax, currentN);
  const step = Math.max(1, Math.floor(points / 60));
  const data = [];
  for (let n = 1; n <= points; n += step) {
    data.push({ n, price: price(n, pricing) });
  }
  if (data[data.length - 1]?.n !== points) {
    data.push({ n: points, price: price(points, pricing) });
  }

  const currentPrice = price(currentN, pricing);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="n"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--card-border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value: number) => `$${formatAmount(value)}`}
            width={56}
          />
          <Tooltip
            formatter={(value) => [`$${formatAmount(Number(value))}`, "Price"]}
            labelFormatter={(n) => `${n} attendees`}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              color: "var(--foreground)",
            }}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
          />
          <ReferenceDot
            x={currentN}
            y={currentPrice}
            r={5}
            fill="var(--accent)"
            stroke="var(--foreground)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
