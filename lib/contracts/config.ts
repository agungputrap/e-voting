const ONE = BigInt(1);

export const LISK_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4202);
export const LISK_RPC_URL =
  process.env.NEXT_PUBLIC_LISK_RPC_URL ??
  process.env.LISK_RPC_URL ??
  "https://rpc.sepolia-api.lisk.com";

export const VOTING_SYSTEM_ADDRESS = (process.env
  .NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS ?? "") as `0x${string}`;
export const VOTING_TOKEN_ADDRESS = (process.env
  .NEXT_PUBLIC_VOTING_TOKEN_ADDRESS ?? "") as `0x${string}`;
export const VOTER_BADGE_ADDRESS = (process.env
  .NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS ?? "") as `0x${string}`;

export function assertContractEnv(variable: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required contract env: ${variable}`);
  }
}

export const ONE_TOKEN = ONE * BigInt(10) ** BigInt(18);
