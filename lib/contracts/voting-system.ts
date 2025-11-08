import type { Account } from "@panna/sdk";
import { ethers } from "ethers";
import { LISK_CHAIN_ID, VOTING_SYSTEM_ADDRESS } from "./config";
import { votingSystemAbi } from "./abi/votingSystem";
import { publicProvider } from "./providers";
import {
  ensureVoteTokenAllowance,
  getVotingTokenBalance,
} from "./voting-token";

if (!VOTING_SYSTEM_ADDRESS) {
  console.warn("NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS is not configured");
}

const votingSystemInterface = new ethers.Interface(votingSystemAbi);
const votingSystemReadOnly = VOTING_SYSTEM_ADDRESS
  ? new ethers.Contract(VOTING_SYSTEM_ADDRESS, votingSystemAbi, publicProvider)
  : null;

type RawVotingEvent = {
  id: bigint;
  name: string;
  description: string;
  creator: string;
  startTime: bigint;
  endTime: bigint;
  revealDeadline: bigint;
  isActive: boolean;
  totalVotes: bigint;
  candidateIds: readonly bigint[];
};

type RawCandidate = {
  id: bigint;
  name: string;
  eventId: bigint;
  voteCount: bigint;
  exists: boolean;
};

export type ChainVotingEvent = {
  id: number;
  name: string;
  description: string;
  creator: string;
  startTime: number;
  endTime: number;
  revealDeadline: number;
  isActive: boolean;
  totalVotes: number;
  candidateIds: number[];
};

export type ChainCandidate = {
  id: number;
  name: string;
  eventId: number;
  voteCount: number;
};

export type VotePhase =
  | "NOT_STARTED"
  | "COMMIT_PHASE"
  | "REVEAL_PHASE"
  | "ENDED";

type MinimalTxResult = {
  transactionHash?: string;
  hash?: string;
};

const DEFAULT_REVEAL_DURATION_SECONDS = 48 * 60 * 60;

function describeContractError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const candidate = error as {
      shortMessage?: unknown;
      reason?: unknown;
      code?: unknown;
    };
    if (typeof candidate.shortMessage === "string")
      return candidate.shortMessage;
    if (typeof candidate.reason === "string") return candidate.reason;
    if (typeof candidate.code === "string") return candidate.code;
  }
  return null;
}

function logContractWarning(context: string, error: unknown) {
  const summary = describeContractError(error);
  if (summary) {
    console.warn(`${context}: ${summary}`);
  } else {
    console.warn(context);
  }
}

export function getVotePhase(
  event: ChainVotingEvent,
  now = Date.now()
): VotePhase {
  const nowSeconds = Math.floor(now / 1000);
  if (nowSeconds < event.startTime) return "NOT_STARTED";
  if (nowSeconds <= event.endTime) return "COMMIT_PHASE";
  if (nowSeconds <= event.revealDeadline) return "REVEAL_PHASE";
  return "ENDED";
}

export async function fetchChainEvent(
  eventId: number
): Promise<ChainVotingEvent | null> {
  if (!votingSystemReadOnly) return null;
  try {
    // Fetch event data from blockchain contract
    // @ts-expect-error - EventFragment type definition mismatch
    const eventStruct = (await votingSystemReadOnly.getEvent(BigInt(eventId))) as RawVotingEvent;
    return {
      id: Number(eventStruct.id),
      name: eventStruct.name,
      description: eventStruct.description,
      creator: eventStruct.creator,
      startTime: Number(eventStruct.startTime),
      endTime: Number(eventStruct.endTime),
      revealDeadline: Number(eventStruct.revealDeadline),
      isActive: eventStruct.isActive,
      totalVotes: Number(eventStruct.totalVotes),
      candidateIds: Array.from(eventStruct.candidateIds).map((id) =>
        Number(id)
      ),
    };
  } catch (error) {
    logContractWarning("Failed to fetch on-chain event", error);
    return null;
  }
}

export async function fetchChainCandidates(
  eventId: number
): Promise<ChainCandidate[]> {
  if (!votingSystemReadOnly) return [];
  try {
    const candidates = (await votingSystemReadOnly.getEventCandidates(
      eventId
    )) as RawCandidate[];
    return candidates
      .filter((candidate) => candidate.exists)
      .map((candidate) => ({
        id: Number(candidate.id),
        name: candidate.name,
        eventId: Number(candidate.eventId),
        voteCount: Number(candidate.voteCount),
      }));
  } catch (error) {
    logContractWarning("Failed to fetch on-chain candidates", error);
    return [];
  }
}

export async function fetchVoteCost(): Promise<bigint> {
  if (!votingSystemReadOnly) return 0n;
  try {
    const cost: bigint = await votingSystemReadOnly.voteTokenCost();
    return cost;
  } catch (error) {
    logContractWarning("Failed to fetch vote token cost", error);
    return 0n;
  }
}

export async function fetchCommitState(
  voterAddress: string,
  eventId: number
): Promise<{ hasCommitted: boolean; hasRevealed: boolean }> {
  if (!votingSystemReadOnly) {
    return { hasCommitted: false, hasRevealed: false };
  }
  try {
    const [committed, revealed] = await Promise.all([
      votingSystemReadOnly.hasCommitted(voterAddress, eventId),
      votingSystemReadOnly.hasRevealed(voterAddress, eventId),
    ]);
    return {
      hasCommitted: Boolean(committed),
      hasRevealed: Boolean(revealed),
    };
  } catch (error) {
    logContractWarning("Failed to fetch commit state", error);
    return { hasCommitted: false, hasRevealed: false };
  }
}

export function generateSecret() {
  const array = new Uint8Array(32);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    // Fallback for server-side usage when we need deterministic value
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function normalizeSecret(secret: string): `0x${string}` {
  const trimmed = secret.trim();
  if (trimmed.startsWith("0x")) {
    return trimmed as `0x${string}`;
  }
  // Convert secret to a keccak256 hash for use on-chain
  return ethers.id(trimmed) as `0x${string}`;
}

export async function commitVoteOnChain(params: {
  account: Account;
  eventId: number;
  candidateId: number;
  secret: string;
}) {
  if (!VOTING_SYSTEM_ADDRESS) {
    throw new Error("Voting system address not configured");
  }

  const { account, eventId, candidateId, secret } = params;
  const voteCost = await fetchVoteCost();
  // @ts-expect-error - TypeScript cache issue with Account type
  const balance = await getVotingTokenBalance(account.address);
  if (balance < voteCost) {
    throw new Error("Insufficient VOTE token balance");
  }

  await ensureVoteTokenAllowance(account, voteCost);

  const secretBytes = normalizeSecret(secret);
  const commitHash = ethers.keccak256(
    ethers.solidityPacked(["uint256", "bytes32"], [candidateId, secretBytes])
  );

  const data = votingSystemInterface.encodeFunctionData("commitVote", [
    eventId,
    commitHash,
  ]);

  // @ts-expect-error - TypeScript cache issue with Account type
  const txResult: MinimalTxResult = await account.sendTransaction({
    chainId: LISK_CHAIN_ID,
    to: VOTING_SYSTEM_ADDRESS,
    data,
    value: 0n,
  });

  return {
    secret: secretBytes,
    txHash: txResult.transactionHash ?? txResult.hash,
  };
}

export async function createVotingEventOnChain(params: {
  account: Account;
  name: string;
  description: string;
  startTime: number; // seconds
  endTime: number; // seconds
  revealDurationSeconds?: number;
}) {
  if (!VOTING_SYSTEM_ADDRESS) {
    throw new Error("Voting system address not configured");
  }

  const {
    account,
    name,
    description,
    startTime,
    endTime,
    revealDurationSeconds,
  } = params;

  if (endTime <= startTime) {
    throw new Error("End time must be after start time");
  }

  const revealDuration =
    revealDurationSeconds ?? DEFAULT_REVEAL_DURATION_SECONDS;
  const data = votingSystemInterface.encodeFunctionData("createEvent", [
    name,
    description,
    BigInt(startTime),
    BigInt(endTime),
    BigInt(revealDuration),
  ]);

  // @ts-expect-error - TypeScript cache issue with Account type
  const txResult: MinimalTxResult = await account.sendTransaction({
    chainId: LISK_CHAIN_ID,
    to: VOTING_SYSTEM_ADDRESS,
    data,
    value: 0n,
  });

  const txHash = txResult.transactionHash ?? txResult.hash;
  if (!txHash) {
    throw new Error("Failed to retrieve transaction hash");
  }

  const receipt = await publicProvider.waitForTransaction(txHash);
  if (!receipt) {
    throw new Error("Transaction not found on chain");
  }
  if (typeof receipt.status === "number" && receipt.status === 0) {
    throw new Error("On-chain event creation transaction failed");
  }

  const targetAddress = VOTING_SYSTEM_ADDRESS.toLowerCase();
  let createdEventId: number | null = null;

  for (const log of receipt.logs ?? []) {
    if ((log.address ?? "").toLowerCase() !== targetAddress) continue;
    try {
      const parsedLog = votingSystemInterface.parseLog(log);
      if (parsedLog?.name === "EventCreated") {
        const rawId = parsedLog.args?.eventId ?? parsedLog.args?.[0];
        if (typeof rawId === "bigint" || typeof rawId === "number") {
          createdEventId = Number(rawId);
          break;
        }
      }
    } catch {
      // Ignore unrelated logs
    }
  }

  if (!createdEventId) {
    throw new Error(
      "Unable to determine on-chain event id from transaction logs"
    );
  }

  return {
    eventId: createdEventId,
    txHash,
  };
}

export async function revealVoteOnChain(params: {
  account: Account;
  eventId: number;
  candidateId: number;
  secret: string;
}) {
  if (!VOTING_SYSTEM_ADDRESS) {
    throw new Error("Voting system address not configured");
  }

  const { account, eventId, candidateId, secret } = params;
  const secretBytes = normalizeSecret(secret);

  const data = votingSystemInterface.encodeFunctionData("revealVote", [
    eventId,
    candidateId,
    secretBytes,
  ]);

  // Send the transaction
  // @ts-expect-error - TypeScript cache issue with Account type
  const txResult: MinimalTxResult = await account.sendTransaction({
    chainId: LISK_CHAIN_ID,
    to: VOTING_SYSTEM_ADDRESS,
    data,
    value: 0n,
  });

  const txHash = txResult.transactionHash ?? txResult.hash;

  // Wait for transaction to be confirmed on blockchain
  // This ensures vote counts are updated before we return
  if (txHash) {
    try {
      await publicProvider.waitForTransaction(txHash, 1); // Wait for 1 confirmation
    } catch (error) {
      console.warn("Failed to wait for transaction confirmation:", error);
    }
  }

  return {
    txHash,
  };
}
