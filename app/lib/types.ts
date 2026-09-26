import type { PricingParams } from "./pricing";

export type EventStatus = "Open" | "Finalised" | "Cancelled";

export interface FairshareEvent {
  id: string;
  title: string;
  description: string;
  organiser: string;
  location: string;
  deadline: string; // ISO timestamp
  attendeeCount: number;
  nMin: number;
  nMax: number;
  finalPrice: number | null;
  status: EventStatus;
  pricing: PricingParams;
  coverGradient: [string, string];
}

export interface Ticket {
  eventId: string;
  amountPaid: number;
  refundClaimed: boolean;
}
