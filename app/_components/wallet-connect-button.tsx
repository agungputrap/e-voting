"use client";

import { liskSepolia, LoginButton } from "@panna/sdk";
import { useWallet } from "@/app/lib/wallet-provider";
import { Loader2, LogOut, CheckCircle2 } from "lucide-react";

/**
 * WalletConnectButton displays the appropriate wallet connection UI
 * 
 * Shows different states:
 * - Connect button when not connected
 * - Loading state during authentication
 * - Wallet address + disconnect when connected
 * 
 * Uses:
 * - LoginButton from Panna SDK for wallet connection
 * - useWallet hook for authentication state
 */
export function WalletConnectButton() {
  const { walletAddress, isAuthenticated, isLoading, logout } = useWallet();

  // Show loading state during authentication
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/90 border border-emerald-500/30 rounded-full">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
        <span className="text-sm text-white font-mono">Authenticating...</span>
      </div>
    );
  }

  // // Show wallet address and disconnect button when authenticated
  // if (isAuthenticated && walletAddress) {
  //   return (
  //     <div className="flex items-center gap-2">
  //       {/* Authenticated indicator */}
  //       {/* <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
  //         <CheckCircle2 className="h-3 w-3 text-emerald-400" />
  //         <span className="text-xs text-emerald-400 font-mono">Connected</span>
  //       </div> */}


  //         <LoginButton
  //         connectButton={{
  //           label: "Connect Wallet",
  //           className:
  //             "!bg-gradient-to-r !from-emerald-500 !to-cyan-500 !text-white !font-semibold !px-6 !py-2 !rounded-full !border-0",
  //         }}
  //         chain={liskSepolia}
  //       />

  //       {/* Disconnect button */}
  //       {/* <button
  //         onClick={logout}
  //         className="group flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-full hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300"
  //         aria-label="Disconnect wallet"
  //       >
  //         <LogOut className="h-4 w-4 text-red-400" />
  //         <span className="hidden sm:inline text-xs text-red-400 font-medium">
  //           Disconnect
  //         </span>
  //       </button> */}
  //     </div>
  //   );
  // }

  // Show connect button when not connected
  // Using Panna SDK's LoginButton with custom styling
  return (
    <div className="relative group">
      {/* Hover glow effect */}
      {/* <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full opacity-0 group-hover:opacity-75 blur transition-all duration-300"></div> */}

      {/* LoginButton wrapper with custom styling */}
      <div className="relative">
        <LoginButton
          connectButton={{
            label: "Connect Wallet",
            className:
              "!bg-gradient-to-r !from-emerald-500 !to-cyan-500 !text-white !font-semibold !px-6 !py-2 !rounded-full !border-0 hover:!opacity-90 !transition-all !duration-300",
          }}
          chain={liskSepolia}
        />
      </div>
    </div>
  );
}

