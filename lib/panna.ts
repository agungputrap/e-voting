import { createPannaClient, liskSepolia } from "@panna/sdk";

const clientId = process.env.NEXT_PUBLIC_PANNA_CLIENT_ID;
const partnerId = process.env.NEXT_PUBLIC_PANNA_PARTNER_ID;

export const pannaClient = clientId
  ? createPannaClient({ clientId })
  : null;

export const pannaPartnerId = partnerId ?? "";
export const pannaChain = liskSepolia;

