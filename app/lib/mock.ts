import { price } from "./pricing";
import type { FairshareEvent, Ticket } from "./types";

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const events: FairshareEvent[] = [
  {
    id: "society-trip",
    title: "Society Trip: Snowdonia Weekend",
    description: "Coach, hostel and a guided hike for the whole society.",
    organiser: "Outdoors Society",
    location: "Snowdonia, Wales",
    deadline: inDays(5),
    attendeeCount: 62,
    nMin: 50,
    nMax: 400,
    finalPrice: null,
    status: "Open",
    pricing: {
      fixed: 2_000_000_000,
      perHead: 5_000_000,
      marginBps: 1_000,
      pMin: 10_000_000,
      pMax: 50_000_000,
    },
    coverGradient: ["#312e81", "#7c3aed"],
  },
  {
    id: "gig-night",
    title: "Battle of the Bands",
    description: "Venue hire and sound engineer, split across everyone who joins.",
    organiser: "Music Collective",
    location: "The Cellar, city centre",
    deadline: inDays(2),
    attendeeCount: 18,
    nMin: 20,
    nMax: 150,
    finalPrice: null,
    status: "Open",
    pricing: {
      fixed: 400_000_000,
      perHead: 2_000_000,
      marginBps: 1_500,
      pMin: 5_000_000,
      pMax: 25_000_000,
    },
    coverGradient: ["#7c2d12", "#f97316"],
  },
  {
    id: "bootcamp",
    title: "Weekend Coding Bootcamp",
    description: "Room hire, catering and mentor time, priced per attendee.",
    organiser: "Campus Devs",
    location: "Engineering Building, Room 204",
    deadline: inDays(-1),
    attendeeCount: 44,
    nMin: 15,
    nMax: 60,
    finalPrice: 12_000_000,
    status: "Finalised",
    pricing: {
      fixed: 150_000_000,
      perHead: 1_000_000,
      marginBps: 1_000,
      pMin: 8_000_000,
      pMax: 20_000_000,
    },
    coverGradient: ["#065f46", "#10b981"],
  },
];

const tickets: Ticket[] = [
  { eventId: "bootcamp", amountPaid: 15_000_000, refundClaimed: false },
];

export function mockListEvents(): FairshareEvent[] {
  return events;
}

export function mockGetEvent(id: string): FairshareEvent | null {
  return events.find((event) => event.id === id) ?? null;
}

export function mockCreateEvent(
  input: Omit<FairshareEvent, "id" | "attendeeCount" | "finalPrice" | "status">,
): FairshareEvent {
  const event: FairshareEvent = {
    ...input,
    id: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `event-${events.length + 1}`,
    attendeeCount: 0,
    finalPrice: null,
    status: "Open",
  };
  events.unshift(event);
  return event;
}

export function mockJoinEvent(id: string): { event: FairshareEvent; ticket: Ticket } {
  const event = mockGetEvent(id);
  if (!event) throw new Error(`Unknown event: ${id}`);
  if (event.status !== "Open") throw new Error("Event is not open");
  if (event.attendeeCount >= event.nMax) throw new Error("Event is at capacity");

  event.attendeeCount += 1;
  const amountPaid = price(event.attendeeCount, event.pricing);
  const ticket: Ticket = { eventId: id, amountPaid, refundClaimed: false };
  tickets.push(ticket);
  return { event, ticket };
}

export function mockListMyTickets(): Array<Ticket & { event: FairshareEvent }> {
  return tickets
    .map((ticket) => {
      const event = mockGetEvent(ticket.eventId);
      return event ? { ...ticket, event } : null;
    })
    .filter((t): t is Ticket & { event: FairshareEvent } => t !== null);
}
