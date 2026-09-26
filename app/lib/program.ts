import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./idl/fairshare.json";
import type { Fairshare } from "./idl/fairshare_types";

import { AnchorProvider, Program } from "@anchor-lang/core";
export type FairshareProgram = InstanceType<typeof Program<Fairshare>>;

export const DEVNET_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

export const PROGRAM_ID = new PublicKey((idl as { address: string }).address);

export const EVENT_SEED = Buffer.from("event");
export const VAULT_SEED = Buffer.from("vault");
export const TICKET_SEED = Buffer.from("ticket");

export function getUsdcMint(): PublicKey {
  const mint = process.env.NEXT_PUBLIC_USDC_MINT;
  if (!mint) {
    throw new Error(
      "NEXT_PUBLIC_USDC_MINT is not set. Point it at a devnet SPL token mint " +
        "(the same one used by scripts/seed-demo.ts).",
    );
  }
  return new PublicKey(mint);
}

// A read-only wallet stub so reads work before any wallet is connected.
// It can never sign, so anything that actually needs a signature must pass
// a real connected wallet via getProgram(wallet).
const READONLY_WALLET: AnchorWallet = {
  publicKey: PublicKey.default,
  signTransaction: () => Promise.reject(new Error("No wallet connected")),
  signAllTransactions: () => Promise.reject(new Error("No wallet connected")),
};

export function getProgram(wallet?: AnchorWallet): FairshareProgram {
  const connection = new Connection(DEVNET_ENDPOINT, "confirmed");
  const provider = new AnchorProvider(connection, wallet ?? READONLY_WALLET, {
    commitment: "confirmed",
  });
  return new Program<Fairshare>(idl as Fairshare, provider);
}

export function eventPda(organiser: PublicKey, eventId: bigint): PublicKey {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(eventId);
  return PublicKey.findProgramAddressSync(
    [EVENT_SEED, organiser.toBuffer(), idBuf],
    PROGRAM_ID,
  )[0];
}

export function vaultPda(event: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([VAULT_SEED, event.toBuffer()], PROGRAM_ID)[0];
}

export function ticketPda(event: PublicKey, attendee: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [TICKET_SEED, event.toBuffer(), attendee.toBuffer()],
    PROGRAM_ID,
  )[0];
}
