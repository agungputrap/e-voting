import { ethers } from "ethers";
import { voterBadgeAbi } from "./abi/voterBadge";
import { publicProvider } from "./providers";
import { VOTER_BADGE_ADDRESS } from "./config";

const voterBadgeReadOnly = VOTER_BADGE_ADDRESS
  ? new ethers.Contract(VOTER_BADGE_ADDRESS, voterBadgeAbi, publicProvider)
  : null;

export async function hasBadgeForEvent(address?: string | null, eventId?: number) {
  if (!address || !eventId || !voterBadgeReadOnly) return false;
  try {
    return await voterBadgeReadOnly.hasBadgeForEvent(address, eventId);
  } catch (error) {
    console.error("Failed to check badge", error);
    return false;
  }
}

export async function getBadgeTokenId(address?: string | null, eventId?: number) {
  if (!address || !eventId || !voterBadgeReadOnly) return 0;
  try {
    const tokenId: bigint = await voterBadgeReadOnly.getBadgeTokenId(
      address,
      eventId
    );
    return Number(tokenId);
  } catch (error) {
    console.error("Failed to fetch badge token id", error);
    return 0;
  }
}

