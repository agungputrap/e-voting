import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import { ClientProviders } from "./lib/client-providers";
import { WalletConnectButton } from "./_components/wallet-connect-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Votie.io - E-Voting Platform",
  description: "Absolute Transparency. Every Vote Verified On-Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientProviders>
          {/* Navbar - placed in layout for global access with web3 styling */}
          <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-emerald-500/20">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              {/* Logo section with glow effect */}
              <Link
                href="/"
                className="flex items-center gap-2 group cursor-pointer"
                aria-label="Go to homepage"
              >
                <div className="relative">
                  {/* Glow behind logo */}
                  <div className="absolute inset-0 bg-emerald-500/30 rounded-lg blur-lg group-hover:bg-emerald-500/50 transition-all duration-300"></div>
                  <Image src="/logo.png" alt="Votie.io" width={42} height={42} />
                </div>
                <span className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 uppercase">
                  votie.io
                </span>
              </Link>

              {/* Wallet connection section */}
              <WalletConnectButton />
            </div>

            {/* Subtle bottom gradient line for extra web3 feel */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
          </nav>

          {/* Main content - with top padding to account for fixed navbar */}
          <div className="">{children}</div>
          <Toaster />
        </ClientProviders>
      </body>
    </html>
  );
}
