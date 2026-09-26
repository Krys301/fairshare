import { EventCard } from "@/components/EventCard";
import { listEvents } from "@/lib/api";

export default async function Home() {
  const events = await listEvents();

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-muted">
          The more people join, the cheaper it gets for everyone.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
