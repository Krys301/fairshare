"use client";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEvent } from "@/lib/api";
import { price } from "@/lib/pricing";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

function usd(value: FormDataEntryValue | null): number {
  return Math.round(Number(value ?? 0) * 1_000_000);
}

export default function CreateEventPage() {
  const wallet = useAnchorWallet();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!wallet) {
      setError("Connect your wallet first");
      return;
    }
    setError(null);

    const formData = new FormData(formEvent.currentTarget);
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
      setError("All numbers must be greater than zero");
      return;
    }
    if (nMin > nMax) {
      setError("Minimum attendees can't exceed capacity");
      return;
    }
    if (pMin > pMax) {
      setError("Floor price can't exceed the starting cap");
      return;
    }
    if (pMax < price(nMin, pricing)) {
      setError(
        "The price cap is below cost at the minimum attendee count — raise it or lower costs",
      );
      return;
    }

    setPending(true);
    try {
      const event = await createEvent(
        {
          deadline: new Date(deadlineInput).toISOString(),
          nMin,
          nMax,
          pricing,
        },
        wallet,
      );
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create an event</h1>
        <p className="mt-1 text-sm text-muted">
          Set your costs and margin — the price falls as more people join. Title and
          description aren&apos;t stored onchain yet, so events show as &quot;Event
          #id&quot; for now.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl border border-card-border bg-card p-5"
      >
        <Field label="Joins close">
          <input type="datetime-local" name="deadline" required className={inputClass} />
        </Field>

        <div className="h-px bg-card-border" />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fixed cost ($)">
            <input
              type="number"
              name="fixed"
              min="0"
              step="0.01"
              required
              defaultValue="2000"
              className={inputClass}
            />
          </Field>
          <Field label="Cost per head ($)">
            <input
              type="number"
              name="perHead"
              min="0"
              step="0.01"
              required
              defaultValue="5"
              className={inputClass}
            />
          </Field>
          <Field label="Margin (%)">
            <input
              type="number"
              name="marginPercent"
              min="0"
              step="0.1"
              required
              defaultValue="10"
              className={inputClass}
            />
          </Field>
          <Field label="Floor price ($)">
            <input
              type="number"
              name="pMin"
              min="0"
              step="0.01"
              required
              defaultValue="10"
              className={inputClass}
            />
          </Field>
          <Field label="Starting cap ($)">
            <input
              type="number"
              name="pMax"
              min="0"
              step="0.01"
              required
              defaultValue="50"
              className={inputClass}
            />
          </Field>
          <Field label="Minimum attendees">
            <input
              type="number"
              name="nMin"
              min="1"
              required
              defaultValue="50"
              className={inputClass}
            />
          </Field>
          <Field label="Capacity">
            <input
              type="number"
              name="nMax"
              min="1"
              required
              defaultValue="400"
              className={inputClass}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-xl bg-accent px-5 py-3 text-base font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {wallet ? (pending ? "Creating…" : "Create event") : "Connect your wallet to create"}
        </button>
      </form>
    </div>
  );
}
