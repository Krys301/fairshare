// Stage 6: real devnet program calls. Reads need no wallet; every write takes
// the connected wallet and is meant to be called from a client component.
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@anchor-lang/core";

import {
  eventPda,
  getProgram,
  getUsdcMint,
  ticketPda,
  vaultPda,
} from "./program";
import type { EventStatus, FairshareEvent, Ticket } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeStatus(status: any): EventStatus {
  if ("finalised" in status) return "Finalised";
  if ("cancelled" in status) return "Cancelled";
  return "Open";
}

function gradientFor(address: PublicKey): [string, string] {
  const bytes = address.toBytes();
  const hue = bytes[0] % 360;
  return [`hsl(${hue}, 60%, 25%)`, `hsl(${(hue + 60) % 360}, 70%, 45%)`];
}

function shorten(address: PublicKey): string {
  const s = address.toBase58();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEvent(address: PublicKey, account: any): FairshareEvent {
  return {
    id: address.toBase58(),
    title: `Event #${account.eventId.toString()}`,
    description: `Onchain event created by ${shorten(account.organiser)}`,
    organiser: account.organiser.toBase58(),
    location: "Devnet",
    deadline: new Date(account.deadline.toNumber() * 1000).toISOString(),
    attendeeCount: account.attendeeCount.toNumber(),
    nMin: account.nMin.toNumber(),
    nMax: account.nMax.toNumber(),
    finalPrice: account.finalPrice.toNumber() > 0 ? account.finalPrice.toNumber() : null,
    status: decodeStatus(account.status),
    pricing: {
      fixed: account.fixed.toNumber(),
      perHead: account.perHead.toNumber(),
      marginBps: account.marginBps,
      pMin: account.pMin.toNumber(),
      pMax: account.pMax.toNumber(),
    },
    coverGradient: gradientFor(address),
  };
}

export async function listEvents(): Promise<FairshareEvent[]> {
  const program = getProgram();
  const accounts = await program.account.event.all();
  return accounts
    .map(({ publicKey, account }) => toEvent(publicKey, account))
    .sort((a, b) => (a.deadline < b.deadline ? 1 : -1));
}

export async function getEvent(id: string): Promise<FairshareEvent | null> {
  const program = getProgram();
  try {
    const address = new PublicKey(id);
    const account = await program.account.event.fetch(address);
    return toEvent(address, account);
  } catch {
    return null;
  }
}

export async function createEvent(
  input: Pick<FairshareEvent, "deadline" | "nMin" | "nMax" | "pricing">,
  wallet: AnchorWallet,
): Promise<FairshareEvent> {
  const program = getProgram(wallet);
  const mint = getUsdcMint();
  const eventId = BigInt(Date.now());
  const event = eventPda(wallet.publicKey, eventId);
  const vault = vaultPda(event);

  const deadlineSeconds = Math.floor(new Date(input.deadline).getTime() / 1000);

  await program.methods
    .createEvent(
      new BN(eventId.toString()),
      new BN(input.pricing.fixed),
      new BN(input.pricing.perHead),
      input.pricing.marginBps,
      new BN(input.pricing.pMin),
      new BN(input.pricing.pMax),
      new BN(input.nMin),
      new BN(input.nMax),
      new BN(deadlineSeconds),
    )
    .accountsPartial({
      organiser: wallet.publicKey,
      event,
      vault,
      mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const created = await getEvent(event.toBase58());
  if (!created) throw new Error("Event was created but could not be re-read");
  return created;
}

export async function joinEvent(
  id: string,
  wallet: AnchorWallet,
): Promise<{ event: FairshareEvent; ticket: Ticket; signature: string }> {
  const program = getProgram(wallet);
  const event = new PublicKey(id);
  const account = await program.account.event.fetch(event);
  const vault = vaultPda(event);
  const ticket = ticketPda(event, wallet.publicKey);
  const attendeeTokenAccount = getAssociatedTokenAddressSync(account.mint, wallet.publicKey);

  const signature = await program.methods
    .join()
    .accountsPartial({
      attendee: wallet.publicKey,
      event,
      vault,
      attendeeTokenAccount,
      ticket,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        attendeeTokenAccount,
        wallet.publicKey,
        account.mint,
      ),
    ])
    .rpc();

  const updated = await getEvent(id);
  if (!updated) throw new Error("Event not found after join");
  const ticketAccount = await program.account.ticket.fetch(ticket);

  return {
    event: updated,
    ticket: {
      eventId: id,
      amountPaid: ticketAccount.amountPaid.toNumber(),
      refundClaimed: ticketAccount.refundClaimed,
    },
    signature,
  };
}

export async function finalizeEvent(id: string, wallet: AnchorWallet): Promise<string> {
  const program = getProgram(wallet);
  const event = new PublicKey(id);
  return program.methods.finalize().accountsPartial({ event }).rpc();
}

export async function claimRefund(id: string, wallet: AnchorWallet): Promise<string> {
  const program = getProgram(wallet);
  const event = new PublicKey(id);
  const account = await program.account.event.fetch(event);
  const vault = vaultPda(event);
  const ticket = ticketPda(event, wallet.publicKey);
  const attendeeTokenAccount = getAssociatedTokenAddressSync(account.mint, wallet.publicKey);

  return program.methods
    .claimRefund()
    .accountsPartial({
      attendee: wallet.publicKey,
      event,
      vault,
      attendeeTokenAccount,
      ticket,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function withdraw(id: string, wallet: AnchorWallet): Promise<string> {
  const program = getProgram(wallet);
  const event = new PublicKey(id);
  const account = await program.account.event.fetch(event);
  const vault = vaultPda(event);
  const organiserTokenAccount = getAssociatedTokenAddressSync(account.mint, wallet.publicKey);

  return program.methods
    .withdraw()
    .accountsPartial({
      organiser: wallet.publicKey,
      event,
      vault,
      organiserTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        organiserTokenAccount,
        wallet.publicKey,
        account.mint,
      ),
    ])
    .rpc();
}

export async function listMyTickets(
  wallet: AnchorWallet,
): Promise<Array<Ticket & { event: FairshareEvent }>> {
  const program = getProgram(wallet);
  const tickets = await program.account.ticket.all([
    {
      memcmp: {
        offset: 8 + 32, // discriminator + event pubkey
        bytes: wallet.publicKey.toBase58(),
      },
    },
  ]);

  const results: Array<Ticket & { event: FairshareEvent }> = [];
  for (const { account } of tickets) {
    const event = await getEvent(account.event.toBase58());
    if (event) {
      results.push({
        eventId: event.id,
        amountPaid: account.amountPaid.toNumber(),
        refundClaimed: account.refundClaimed,
        event,
      });
    }
  }
  return results;
}
