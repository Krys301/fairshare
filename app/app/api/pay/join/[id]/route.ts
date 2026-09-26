import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { DEVNET_ENDPOINT, getProgram, ticketPda, vaultPda } from "@/lib/program";

export async function GET(_req: Request, ctx: RouteContext<"/api/pay/join/[id]">) {
  const { id } = await ctx.params;
  return NextResponse.json({
    label: "Fairshare",
    icon: "https://solana.com/src/img/branding/solanaLogoMark.svg",
    id,
  });
}

export async function POST(req: Request, ctx: RouteContext<"/api/pay/join/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const accountField = body?.account;
  if (typeof accountField !== "string") {
    return NextResponse.json({ error: "Missing account" }, { status: 400 });
  }

  let attendee: PublicKey;
  let event: PublicKey;
  try {
    attendee = new PublicKey(accountField);
    event = new PublicKey(id);
  } catch {
    return NextResponse.json({ error: "Invalid account or event id" }, { status: 400 });
  }

  const program = getProgram();
  const account = await program.account.event.fetch(event).catch(() => null);
  if (!account) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const vault = vaultPda(event);
  const ticket = ticketPda(event, attendee);
  const attendeeTokenAccount = getAssociatedTokenAddressSync(account.mint, attendee);

  const joinIx = await program.methods
    .join()
    .accountsPartial({
      attendee,
      event,
      vault,
      attendeeTokenAccount,
      ticket,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    attendee,
    attendeeTokenAccount,
    attendee,
    account.mint,
  );

  const connection = new Connection(DEVNET_ENDPOINT, "confirmed");
  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: attendee,
    recentBlockhash: blockhash,
  }).add(createAtaIx, joinIx);

  const serialized = transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  return NextResponse.json({
    transaction: serialized,
    message: "Join this Fairshare event",
  });
}
