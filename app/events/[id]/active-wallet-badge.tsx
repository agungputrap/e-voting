"use client";

import { Wallet2, ShieldAlert, Loader2 } from "lucide-react";
import { useWallet } from "@/app/lib/wallet-provider";

export function ActiveWalletBadge() {
  const { walletAddress, isAuthenticated, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
        Authenticating wallet...
      </div>
    );
  }

  if (isAuthenticated && walletAddress) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 font-mono text-sm text-white shadow-[0_10px_35px_rgba(16,185,129,0.35)]">
        <Wallet2 className="h-4 w-4 text-emerald-200" />
        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        <span aria-hidden className="text-lg">🦊</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100">
      <ShieldAlert className="h-4 w-4" />
      Connect wallet to vote
    </div>
  );
}

