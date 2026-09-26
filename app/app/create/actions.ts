"use server";

import { redirect } from "next/navigation";
import { createEvent } from "@/lib/api";
import { price } from "@/lib/pricing";

function usd(value: FormDataEntryValue | null): number {
  return Math.round(Number(value ?? 0) * 1_000_000);
}

export async function createEventAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const organiser = String(formData.get("organiser") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const deadlineInput = String(formData.get("deadline") ?? "");
  const nMin = Number(formData.get("nMin") ?? 0);
  const nMax = Number(formData.get("nMax") ?? 0);

  const fixed = usd(formData.get("fixed"));
  const perHead = usd(formData.get("perHead"));
  const pMin = usd(formData.get("pMin"));
  const pMax = usd(formData.get("pMax"));
  const marginBps = Math.round(Number(formData.get("marginPercent") ?? 0) * 100);
  const pricing = { fixed, perHead, marginBps, pMin, pMax };

  if (nMin <= 0 || nMax <= 0 || pMin <= 0 || pMax <= 0) {
    redirect(`/create?error=${encodeURIComponent("All numbers must be greater than zero")}`);
  }
  if (nMin > nMax) {
    redirect(`/create?error=${encodeURIComponent("Minimum attendees can't exceed capacity")}`);
  }
  if (pMin > pMax) {
    redirect(`/create?error=${encodeURIComponent("Floor price can't exceed the starting cap")}`);
  }
  if (pMax < price(nMin, pricing)) {
    redirect(
      `/create?error=${encodeURIComponent(
        "The price cap is below cost at the minimum attendee count — raise it or lower costs",
      )}`,
    );
  }

  const event = await createEvent({
    title,
    description,
    organiser,
    location,
    deadline: new Date(deadlineInput).toISOString(),
    nMin,
    nMax,
    pricing: { fixed, perHead, marginBps, pMin, pMax },
    coverGradient: ["#312e81", "#7c3aed"],
  });

  redirect(`/events/${event.id}`);
}
