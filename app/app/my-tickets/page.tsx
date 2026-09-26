import Link from "next/link";
import { listMyTickets } from "@/lib/api";
import { formatAmount } from "@/lib/pricing";

export default async function MyTicketsPage() {
  const tickets = await listMyTickets();

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My tickets</h1>
        <p className="mt-1 text-sm text-muted">
          Every event you&apos;ve joined, and what you paid.
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-card-border bg-card p-8 text-center text-sm text-muted">
          You haven&apos;t joined any events yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const refund =
              ticket.event.status === "Finalised" && ticket.event.finalPrice !== null
                ? ticket.amountPaid - ticket.event.finalPrice
                : ticket.event.status === "Cancelled"
                  ? ticket.amountPaid
                  : null;

            return (
              <Link
                key={ticket.eventId}
                href={`/events/${ticket.eventId}`}
                className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-5 transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <h2 className="font-semibold">{ticket.event.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    Paid ${formatAmount(ticket.amountPaid)}
                  </p>
                </div>
                <div className="text-right text-sm">
                  {ticket.refundClaimed ? (
                    <span className="text-muted">Refund claimed</span>
                  ) : refund !== null ? (
                    <span className="text-accent">Refund: ${formatAmount(refund)}</span>
                  ) : (
                    <span className="text-muted">Pending</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
