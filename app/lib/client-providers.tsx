"use client";

import { PannaProvider } from "panna-sdk";
import { WalletProvider } from "./wallet-provider";
import type { ReactNode } from "react";

/**
 * ClientProviders wraps the app with necessary client-side providers
 * 
 * This component must be "use client" because it uses client-side hooks
 * and manages client-side state.
 * 
 * It provides:
 * 1. PannaProvider - for wallet connection via Panna SDK
 * 2. WalletProvider - for authentication state and JWT token management
 * 
 * Environment variables needed:
 * - NEXT_PUBLIC_PANNA_CLIENT_ID: Your Panna client ID
 * - NEXT_PUBLIC_PANNA_PARTNER_ID: Your Panna partner ID
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  // Get client ID and partner ID from environment variables
  const clientId = process.env.NEXT_PUBLIC_PANNA_CLIENT_ID;
  const partnerId = process.env.NEXT_PUBLIC_PANNA_PARTNER_ID;

  // Warn if environment variables are missing
  if (!clientId) {
    console.warn(
      "NEXT_PUBLIC_PANNA_CLIENT_ID is not set. Wallet connection will not work."
    );
  }

  if (!partnerId) {
    console.warn(
      "NEXT_PUBLIC_PANNA_PARTNER_ID is not set. Wallet connection will not work."
    );
  }

  return (
    <PannaProvider clientId={clientId} partnerId={partnerId}>
      <WalletProvider>{children}</WalletProvider>
    </PannaProvider>
  );
}

