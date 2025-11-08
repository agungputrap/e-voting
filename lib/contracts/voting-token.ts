import type { Account } from "@panna/sdk";
import { ethers } from "ethers";
import {
  LISK_CHAIN_ID,
  VOTING_SYSTEM_ADDRESS,
  VOTING_TOKEN_ADDRESS,
} from "./config";
import { votingTokenAbi } from "./abi/votingToken";
import { publicProvider } from "./providers";

if (!VOTING_TOKEN_ADDRESS) {
  console.warn("NEXT_PUBLIC_VOTING_TOKEN_ADDRESS is not configured");
}

const votingTokenInterface = new ethers.Interface(votingTokenAbi);
const votingTokenReadOnly = VOTING_TOKEN_ADDRESS
  ? new ethers.Contract(VOTING_TOKEN_ADDRESS, votingTokenAbi, publicProvider)
  : null;

export async function getVotingTokenBalance(address?: string | null) {
  if (!address || !votingTokenReadOnly) return 0n;
  const balance: bigint = await votingTokenReadOnly.balanceOf(address);
  return balance;
}

export async function getVotingTokenAllowance(owner?: string | null) {
  if (!owner || !votingTokenReadOnly || !VOTING_SYSTEM_ADDRESS) {
    return 0n;
  }
  const allowance: bigint = await votingTokenReadOnly.allowance(
    owner,
    VOTING_SYSTEM_ADDRESS
  );
  return allowance;
}

export async function ensureVoteTokenAllowance(
  account: Account,
  requiredAmount: bigint
) {
  if (!VOTING_TOKEN_ADDRESS) {
    throw new Error("Voting token address is not configured");
  }
  // @ts-expect-error - TypeScript cache issue with Account type
  const currentAllowance = await getVotingTokenAllowance(account.address);
  if (currentAllowance >= requiredAmount) {
    return;
  }

  const data = votingTokenInterface.encodeFunctionData("approve", [
    VOTING_SYSTEM_ADDRESS,
    requiredAmount,
  ]);

  // @ts-expect-error - TypeScript cache issue with Account type
  await account.sendTransaction({
    chainId: LISK_CHAIN_ID,
    to: VOTING_TOKEN_ADDRESS,
    data,
    value: 0n,
  });
}
