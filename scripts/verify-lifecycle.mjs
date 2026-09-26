// Dev tool: exercises the full event lifecycle (create -> join x3 ->
// finalize -> claim_refund x3 -> withdraw) against whatever cluster
// ANCHOR_PROVIDER_URL points at, to verify everything end-to-end without
// needing devnet SOL. Uses a 5-second deadline, so it runs in seconds.
//
// Usage (against a local validator):
//   solana-test-validator            # separate terminal, from a native
//                                     # Linux path (not /mnt/c/...)
//   anchor deploy
//   spl-token create-token --decimals 6   # note the mint address
//   ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 USDC_MINT=<mint> npm run verify:local
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import anchorPkg from "@anchor-lang/core";
const { AnchorProvider, BN, Program, Wallet } = anchorPkg;
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const RPC_URL = process.env.ANCHOR_PROVIDER_URL ?? "http://127.0.0.1:8899";
const USDC_MINT = new PublicKey(process.env.USDC_MINT);
const WALLET_PATH = (process.env.ANCHOR_WALLET ?? "~/.config/solana/id.json").replace(
  /^~/,
  homedir(),
);

const EVENT_SEED = Buffer.from("event");
const VAULT_SEED = Buffer.from("vault");
const TICKET_SEED = Buffer.from("ticket");

function u64Le(bn) {
  return bn.toArrayLike(Buffer, "le", 8);
}

function fmt(n) {
  return (n / 1_000_000).toFixed(2);
}

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const organiser = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(WALLET_PATH, "utf-8"))),
  );
  const provider = new AnchorProvider(connection, new Wallet(organiser), {
    commitment: "confirmed",
  });
  const idl = JSON.parse(
    readFileSync(path.join(process.cwd(), "target", "idl", "fairshare.json"), "utf-8"),
  );
  const program = new Program(idl, provider);
  const programId = program.programId;

  const eventId = new BN(Date.now());
  const deadline = new BN(Math.floor(Date.now() / 1000) + 5);

  const [event] = PublicKey.findProgramAddressSync(
    [EVENT_SEED, organiser.publicKey.toBuffer(), u64Le(eventId)],
    programId,
  );
  const [vault] = PublicKey.findProgramAddressSync([VAULT_SEED, event.toBuffer()], programId);

  console.log(`Creating event ${eventId.toString()} (deadline in 5s)...`);
  await program.methods
    .createEvent(
      eventId,
      new BN(200_000_000),
      new BN(1_000_000),
      1_000,
      new BN(2_000_000),
      new BN(1_000_000_000),
      new BN(2),
      new BN(10),
      deadline,
    )
    .accountsPartial({
      organiser: organiser.publicKey,
      event,
      vault,
      mint: USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const attendees = [];
  for (let i = 1; i <= 3; i++) {
    const attendee = Keypair.generate();
    await provider.sendAndConfirm(
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: organiser.publicKey,
          toPubkey: attendee.publicKey,
          lamports: 10_000_000,
        }),
      ),
    );
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      organiser,
      USDC_MINT,
      attendee.publicKey,
    );
    await mintTo(connection, organiser, USDC_MINT, ata.address, organiser, 1_000_000_000);

    const [ticket] = PublicKey.findProgramAddressSync(
      [TICKET_SEED, event.toBuffer(), attendee.publicKey.toBuffer()],
      programId,
    );

    await program.methods
      .join()
      .accountsPartial({
        attendee: attendee.publicKey,
        event,
        vault,
        attendeeTokenAccount: ata.address,
        ticket,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([attendee])
      .rpc();

    const ticketAccount = await program.account.ticket.fetch(ticket);
    console.log(`Attendee ${i} paid $${fmt(ticketAccount.amountPaid.toNumber())}`);
    attendees.push({ attendee, ata: ata.address, ticket, amountPaid: ticketAccount.amountPaid });
  }

  console.log("Waiting for the deadline to pass...");
  await new Promise((r) => setTimeout(r, 6000));

  await program.methods.finalize().accountsPartial({ event }).rpc();
  const finalized = await program.account.event.fetch(event);
  console.log(
    `Finalized. status=${JSON.stringify(finalized.status)} final_price=$${fmt(finalized.finalPrice.toNumber())}`,
  );

  for (const [i, a] of attendees.entries()) {
    const before = (await connection.getTokenAccountBalance(a.ata)).value.amount;
    await program.methods
      .claimRefund()
      .accountsPartial({
        attendee: a.attendee.publicKey,
        event,
        vault,
        attendeeTokenAccount: a.ata,
        ticket: a.ticket,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([a.attendee])
      .rpc();
    const after = (await connection.getTokenAccountBalance(a.ata)).value.amount;
    const ticketClosed = (await connection.getAccountInfo(a.ticket)) === null;
    console.log(
      `Attendee ${i + 1} refunded $${fmt(Number(after) - Number(before))}, ticket closed=${ticketClosed}`,
    );
  }

  const organiserAta = getAssociatedTokenAddressSync(USDC_MINT, organiser.publicKey);
  const orgBefore = (await connection.getTokenAccountBalance(organiserAta)).value.amount;
  await program.methods
    .withdraw()
    .accountsPartial({
      organiser: organiser.publicKey,
      event,
      vault,
      organiserTokenAccount: organiserAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  const orgAfter = (await connection.getTokenAccountBalance(organiserAta)).value.amount;
  console.log(`Organiser withdrew $${fmt(Number(orgAfter) - Number(orgBefore))}`);

  const vaultClosed = (await connection.getAccountInfo(vault)) === null;
  console.log(`Vault closed (rent reclaimed): ${vaultClosed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
