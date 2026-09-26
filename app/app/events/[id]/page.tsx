import { CalendarDays, MapPin, User } from "lucide-react";
import { notFound } from "next/navigation";
import { EventActions } from "@/components/EventActions";
import { PriceCurveChart } from "@/components/PriceCurveChart";
import { SolanaPayQR } from "@/components/SolanaPayQR";
import { getEvent } from "@/lib/api";

export const dynamic = "force-dynamic";

function shorten(address: string): string {
  return address.length > 12 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

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
            <span>Organised by {shorten(event.organiser)}</span>
          </div>
        </div>
      </div>

      <EventActions initialEvent={event} />

      {event.status === "Open" && <SolanaPayQR eventId={event.id} />}

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
