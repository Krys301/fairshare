import Link from "next/link";
import { formatAmount, price } from "@/lib/pricing";
import type { FairshareEvent } from "@/lib/types";

export function EventCard({ event }: { event: FairshareEvent }) {
  const currentPrice =
    event.status === "Open"
      ? price(event.attendeeCount + 1, event.pricing)
      : (event.finalPrice ?? 0);

  const statusLabel =
    event.status === "Open"
      ? `${event.attendeeCount} joined`
      : event.status === "Finalised"
        ? "Finalised"
        : "Cancelled";

  return (
    <Link
      href={`/events/${event.id}`}
      className="block overflow-hidden rounded-2xl border border-card-border bg-card shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5"
    >
      <div
        className="h-28 w-full"
        style={{
          background: `linear-gradient(135deg, ${event.coverGradient[0]}, ${event.coverGradient[1]})`,
        }}
      />
      <div className="flex flex-col gap-2 p-5">
        <h2 className="text-lg font-semibold tracking-tight">{event.title}</h2>
        <p className="text-sm text-muted">
          {event.organiser} · {event.location}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted">{statusLabel}</span>
          <span className="text-base font-semibold">
            ${formatAmount(currentPrice)}
          </span>
        </div>
      </div>
    </Link>
  );
}
