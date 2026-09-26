"use client";

import { useEffect, useState } from "react";
import { getEvent } from "@/lib/api";
import { formatAmount, nextPriceDrop, price } from "@/lib/pricing";
import type { FairshareEvent } from "@/lib/types";
import { PriceCurveChart } from "./PriceCurveChart";
import { SolanaPayQR } from "./SolanaPayQR";

const POLL_INTERVAL_MS = 3000;

export function PresenterView({ initialEvent }: { initialEvent: FairshareEvent }) {
  const [event, setEvent] = useState(initialEvent);

  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await getEvent(initialEvent.id).catch(() => null);
      if (fresh) setEvent(fresh);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [initialEvent.id]);

  const currentN = event.attendeeCount + 1;
  const currentPrice = event.status === "Open" ? price(currentN, event.pricing) : event.finalPrice;
  const nextDrop = event.status === "Open" ? nextPriceDrop(currentN, event.pricing) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-10 text-center">
      <div>
        <p className="text-lg text-muted">{event.title}</p>
        <p className="mt-2 text-sm uppercase tracking-widest text-muted">
          {event.status === "Open" ? "Price falls as more people join" : event.status}
        </p>
      </div>

      <div>
        <div className="text-8xl font-black tracking-tight">
          ${currentPrice !== null ? formatAmount(currentPrice) : "—"}
        </div>
        <div className="mt-4 text-2xl text-muted">{event.attendeeCount} joined</div>
        {nextDrop && (
          <div className="mt-2 text-lg text-accent">
            Drops to ${formatAmount(price(nextDrop, event.pricing))} at {nextDrop} people —{" "}
            {nextDrop - currentN} to go
          </div>
        )}
      </div>

      <div className="w-full rounded-2xl border border-card-border bg-card p-6">
        <PriceCurveChart pricing={event.pricing} nMax={event.nMax} currentN={currentN} />
      </div>

      {event.status === "Open" && <SolanaPayQR eventId={event.id} size={240} hint={false} />}
    </div>
  );
}
