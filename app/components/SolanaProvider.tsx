"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { useMemo } from "react";
import { DEVNET_ENDPOINT } from "@/lib/program";

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  // Empty on purpose: Wallet Standard wallets (Phantom, Solflare, etc.) are
  // auto-detected from the browser without needing explicit adapter packages.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={DEVNET_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
