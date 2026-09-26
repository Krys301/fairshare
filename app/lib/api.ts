// Stage 5: backed by in-memory mock data. Stage 6 swaps these implementations
// for real devnet program calls without changing the function signatures.
import {
  mockCreateEvent,
  mockGetEvent,
  mockJoinEvent,
  mockListEvents,
  mockListMyTickets,
} from "./mock";
import type { FairshareEvent, Ticket } from "./types";

export async function listEvents(): Promise<FairshareEvent[]> {
  return mockListEvents();
}

export async function getEvent(id: string): Promise<FairshareEvent | null> {
  return mockGetEvent(id);
}

export async function createEvent(
  input: Omit<FairshareEvent, "id" | "attendeeCount" | "finalPrice" | "status">,
): Promise<FairshareEvent> {
  return mockCreateEvent(input);
}

export async function joinEvent(
  id: string,
): Promise<{ event: FairshareEvent; ticket: Ticket }> {
  return mockJoinEvent(id);
}

export async function listMyTickets(): Promise<
  Array<Ticket & { event: FairshareEvent }>
> {
  return mockListMyTickets();
}
