// Seeds a devnet demo event and joins it from 3 test wallets so the price is
// already dropping before a live demo. Requires: the program deployed to
// devnet, and USDC_MINT set to a devnet SPL token mint whose mint authority
// is this script's wallet (create one with `spl-token create-token --url devnet`).
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import anchorPkg from "@anchor-lang/core";
const { AnchorProvider, BN, Program, Wallet } = anchorPkg;
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEVNET_URL = process.env.ANCHOR_PROVIDER_URL ?? "https://api.devnet.solana.com";
const WALLET_PATH = (process.env.ANCHOR_WALLET ?? "~/.config/solana/id.json").replace(
  /^~/,
  homedir(),
);

const EVENT_SEED = Buffer.from("event");
const VAULT_SEED = Buffer.from("vault");
const TICKET_SEED = Buffer.from("ticket");

// Small-scale demo numbers (fake devnet USDC, 6 decimals) chosen so the price
// visibly drops across just 3 joins: ~221 -> ~111 -> ~74.
const FIXED = new BN(200_000_000);
const PER_HEAD = new BN(1_000_000);
const MARGIN_BPS = 1_000;
const P_MIN = new BN(2_000_000);
const P_MAX = new BN(1_000_000_000);
const N_MIN = new BN(3);
const N_MAX = new BN(50);
const DEADLINE_SECONDS_FROM_NOW = 600; // 10 minutes

const TEST_WALLET_SOL = 0.01;
const TEST_WALLET_USDC = 1_000_000_000; // 1000 fake-USDC

function u64LeBytes(value: InstanceType<typeof BN>): Buffer {
  return value.toArrayLike(Buffer, "le", 8);
}

async function main() {
  const usdcMintEnv = process.env.USDC_MINT;
  if (!usdcMintEnv) {
    throw new Error(
      "Set USDC_MINT to a devnet SPL token mint you control (create one with " +
        "`spl-token create-token --url devnet`, then `spl-token create-account <mint> --url devnet`).",
    );
  }
  const usdcMint = new PublicKey(usdcMintEnv);

  const connection = new Connection(DEVNET_URL, "confirmed");
  const organiserKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(WALLET_PATH, "utf-8"))),
  );
  const wallet = new Wallet(organiserKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = JSON.parse(
    readFileSync(path.join(__dirname, "..", "target", "idl", "fairshare.json"), "utf-8"),
  );
  const program = new Program(idl, provider);
  const programId = program.programId;

  const eventId = new BN(Date.now());
  const deadline = new BN(Math.floor(Date.now() / 1000) + DEADLINE_SECONDS_FROM_NOW);

  const [eventPda] = PublicKey.findProgramAddressSync(
    [EVENT_SEED, organiserKeypair.publicKey.toBuffer(), u64LeBytes(eventId)],
    programId,
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [VAULT_SEED, eventPda.toBuffer()],
    programId,
  );

  console.log(`Creating event ${eventId.toString()} at ${eventPda.toBase58()}...`);
  await program.methods
    .createEvent(eventId, FIXED, PER_HEAD, MARGIN_BPS, P_MIN, P_MAX, N_MIN, N_MAX, deadline)
    .accountsPartial({
      organiser: organiserKeypair.publicKey,
      event: eventPda,
      vault: vaultPda,
      mint: usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("Event created.");

  for (let i = 1; i <= 3; i++) {
    const attendee = Keypair.generate();
    console.log(`\nAttendee ${i}: ${attendee.publicKey.toBase58()}`);

    const fundingTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: organiserKeypair.publicKey,
        toPubkey: attendee.publicKey,
        lamports: Math.floor(TEST_WALLET_SOL * 1_000_000_000),
      }),
    );
    await provider.sendAndConfirm(fundingTx);

    const attendeeTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      organiserKeypair,
      usdcMint,
      attendee.publicKey,
    );
    await mintTo(
      connection,
      organiserKeypair,
      usdcMint,
      attendeeTokenAccount.address,
      organiserKeypair,
      TEST_WALLET_USDC,
    );

    const [ticketPda] = PublicKey.findProgramAddressSync(
      [TICKET_SEED, eventPda.toBuffer(), attendee.publicKey.toBuffer()],
      programId,
    );

    const sig = await program.methods
      .join()
      .accountsPartial({
        attendee: attendee.publicKey,
        event: eventPda,
        vault: vaultPda,
        attendeeTokenAccount: attendeeTokenAccount.address,
        ticket: ticketPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([attendee])
      .rpc();

    console.log(`Joined. tx: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  }

  console.log(
    `\nDemo event live: https://explorer.solana.com/address/${eventPda.toBase58()}?cluster=devnet`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
