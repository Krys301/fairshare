import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { SolanaProvider } from "@/components/SolanaProvider";
import { WalletButton } from "@/components/WalletButton";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fairshare",
  description: "Event tickets that get cheaper as more people join.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SolanaProvider>
          <header className="border-b border-white/10">
            <div className="mx-auto flex w-full max-w-[640px] items-center justify-between px-4 py-4">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                fairshare
              </Link>
              <nav className="flex items-center gap-4 text-sm text-muted">
                <Link href="/create" className="hover:text-foreground transition-colors">
                  Create
                </Link>
                <Link href="/my-tickets" className="hover:text-foreground transition-colors">
                  My tickets
                </Link>
                <WalletButton />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </SolanaProvider>
      </body>
    </html>
  );
}
