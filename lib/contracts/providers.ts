import { ethers } from "ethers";
import { LISK_RPC_URL } from "./config";

export const publicProvider = new ethers.JsonRpcProvider(LISK_RPC_URL);

export function getBrowserProvider() {
  if (typeof window === "undefined") {
    throw new Error("Browser provider is only available client-side");
  }

  const anyWindow = window as typeof window & {
    ethereum?: ethers.Eip1193Provider;
  };

  if (!anyWindow.ethereum) {
    throw new Error("No injected wallet provider found");
  }

  return new ethers.BrowserProvider(anyWindow.ethereum);
}

