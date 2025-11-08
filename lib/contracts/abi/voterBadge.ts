export const voterBadgeAbi = [
  {
    type: "function",
    name: "hasBadgeForEvent",
    stateMutability: "view",
    inputs: [
      { name: "voter", type: "address" },
      { name: "eventId", type: "uint256" },
    ],
    outputs: [{ name: "hasBadge", type: "bool" }],
  },
  {
    type: "function",
    name: "getBadgeTokenId",
    stateMutability: "view",
    inputs: [
      { name: "voter", type: "address" },
      { name: "eventId", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
] as const;

