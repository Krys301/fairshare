import { CalendarDays, MapPin, User } from "lucide-react";
import { notFound } from "next/navigation";
import { PriceCard } from "@/components/PriceCard";
import { PriceCurveChart } from "@/components/PriceCurveChart";
import { getEvent } from "@/lib/api";
import { formatAmount, price } from "@/lib/pricing";
import { joinEventAction } from "./actions";

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  const deadlineLabel = new Date(event.deadline).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const joinPrice = event.status === "Open" ? price(event.attendeeCount + 1, event.pricing) : 0;

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-10">
      <div
        className="h-40 w-full rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${event.coverGradient[0]}, ${event.coverGradient[1]})`,
        }}
      />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
        <p className="mt-2 text-sm text-muted">{event.description}</p>

        <div className="mt-4 flex flex-col gap-2 text-sm text-muted">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} />
            <span>Joins close {deadlineLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={16} />
            <span>Organised by {event.organiser}</span>
          </div>
        </div>
      </div>

      {event.status === "Open" ? (
        <>
          <PriceCard pricing={event.pricing} attendeeCount={event.attendeeCount} />

          <form action={joinEventAction.bind(null, event.id)}>
            <button
              type="submit"
              className="w-full rounded-xl bg-accent px-5 py-4 text-base font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Join for ${formatAmount(joinPrice)}
            </button>
          </form>
        </>
      ) : (
        <div className="rounded-2xl border border-card-border bg-card p-5 text-center">
          <p className="text-sm text-muted">
            {event.status === "Finalised" ? "Finalised" : "Cancelled"}
          </p>
          {event.finalPrice !== null && (
            <p className="mt-1 text-2xl font-bold">${formatAmount(event.finalPrice)}</p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-card-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted">Price curve</h2>
        <div className="mt-2">
          <PriceCurveChart
            pricing={event.pricing}
            nMax={event.nMax}
            currentN={Math.max(event.attendeeCount + 1, 1)}
          />
        </div>
      </div>
    </div>
  );
}
