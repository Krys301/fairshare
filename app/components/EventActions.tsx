"use client";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { claimRefund, finalizeEvent, getEvent, joinEvent, withdraw } from "@/lib/api";
import { formatAmount, price } from "@/lib/pricing";
import type { FairshareEvent } from "@/lib/types";
import { PriceCard } from "./PriceCard";

const POLL_INTERVAL_MS = 5000;

function explorerTx(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function EventActions({ initialEvent }: { initialEvent: FairshareEvent }) {
  const wallet = useAnchorWallet();
  const [event, setEvent] = useState(initialEvent);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; href?: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const eventId = initialEvent.id;

  useEffect(() => {
    const interval = setInterval(async () => {
      setNow(Date.now());
      const fresh = await getEvent(eventId).catch(() => null);
      if (fresh) setEvent(fresh);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [eventId]);

  async function run(action: string, fn: () => Promise<string | { signature: string }>) {
    setPending(action);
    setMessage(null);
    try {
      const result = await fn();
      const signature = typeof result === "string" ? result : result.signature;
      setMessage({ text: `${action} succeeded`, href: explorerTx(signature) });
      const fresh = await getEvent(eventId);
      if (fresh) setEvent(fresh);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : `${action} failed` });
    } finally {
      setPending(null);
    }
  }

  const isOrganiser = wallet?.publicKey.toBase58() === event.organiser;
  const canFinalize =
    event.status === "Open" &&
    (now >= new Date(event.deadline).getTime() || event.attendeeCount >= event.nMax);

  return (
    <div className="flex flex-col gap-4">
      {event.status === "Open" && (
        <>
          <PriceCard pricing={event.pricing} attendeeCount={event.attendeeCount} />

          <button
            type="button"
            disabled={!wallet || pending !== null}
            onClick={() => wallet && run("Join", () => joinEvent(eventId, wallet))}
            className="w-full rounded-xl bg-accent px-5 py-4 text-base font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {wallet
              ? pending === "Join"
                ? "Joining…"
                : `Join for $${formatAmount(price(event.attendeeCount + 1, event.pricing))}`
              : "Connect your wallet to join"}
          </button>

          {canFinalize && (
            <button
              type="button"
              disabled={!wallet || pending !== null}
              onClick={() => wallet && run("Finalize", () => finalizeEvent(eventId, wallet))}
              className="w-full rounded-xl border border-card-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:opacity-50"
            >
              {pending === "Finalize" ? "Finalizing…" : "Finalize event"}
            </button>
          )}
        </>
      )}

      {event.status !== "Open" && (
        <div className="rounded-2xl border border-card-border bg-card p-5 text-center">
          <p className="text-sm text-muted">{event.status}</p>
          {event.finalPrice !== null && (
            <p className="mt-1 text-2xl font-bold">${formatAmount(event.finalPrice)}</p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={!wallet || pending !== null}
              onClick={() => wallet && run("Claim refund", () => claimRefund(eventId, wallet))}
              className="flex-1 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending === "Claim refund" ? "Claiming…" : "Claim refund"}
            </button>

            {event.status === "Finalised" && isOrganiser && (
              <button
                type="button"
                disabled={!wallet || pending !== null}
                onClick={() => wallet && run("Withdraw", () => withdraw(eventId, wallet))}
                className="flex-1 rounded-xl border border-card-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-50"
              >
                {pending === "Withdraw" ? "Withdrawing…" : "Withdraw (organiser)"}
              </button>
            )}
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-card-border bg-card px-4 py-3 text-sm">
          {message.href ? (
            <a href={message.href} target="_blank" rel="noreferrer" className="text-accent underline">
              {message.text} — view on Explorer
            </a>
          ) : (
            <span className="text-red-300">{message.text}</span>
          )}
        </div>
      )}
    </div>
  );
}
