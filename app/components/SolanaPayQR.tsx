"use client";

import { QRCodeSVG } from "qrcode.react";

export function SolanaPayQR({
  eventId,
  size = 180,
  hint = true,
}: {
  eventId: string;
  size?: number;
  hint?: boolean;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const apiUrl = `${baseUrl}/api/pay/join/${eventId}`;
  const url = `solana:${encodeURIComponent(apiUrl)}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-card-border bg-card p-5">
      <h2 className="text-sm font-medium text-muted">Scan to join with Phantom</h2>
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={url} size={size} />
      </div>
      {hint && (
        <p className="max-w-xs text-center text-xs text-muted">
          Only reachable from a phone if NEXT_PUBLIC_APP_URL is a public URL
          (e.g. an ngrok tunnel or your Vercel deployment) — not localhost.
        </p>
      )}
    </div>
  );
}
