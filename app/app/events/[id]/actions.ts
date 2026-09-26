"use server";

import { revalidatePath } from "next/cache";
import { joinEvent } from "@/lib/api";

export async function joinEventAction(eventId: string) {
  await joinEvent(eventId);
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/");
  revalidatePath("/my-tickets");
}
