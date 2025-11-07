# 🎨 Frontend Integration Guide

Guide untuk integrate smart contracts dengan frontend menggunakan Panna SDK (gasless transactions).

## 📋 Prerequisites

1. ✅ Contracts sudah deployed ke Lisk Sepolia
2. ✅ Contract addresses sudah disave di `.env`
3. ✅ Contracts sudah verified di Blockscout
4. ✅ Panna API Key (dapatkan dari https://docs.panna.network)

## 🚀 Setup Panna SDK

### 1. Install Dependencies

```bash
npm install @panna/sdk ethers@^6.0.0
```

### 2. Update .env dengan Panna API Key

```env
NEXT_PUBLIC_PANNA_API_KEY="your_panna_api_key_here"
```

### 3. Create Provider Config

Buat file `lib/panna.ts` atau `lib/panna.js`:

```typescript
import { PannaProvider } from '@panna/sdk';

export const pannaProvider = new PannaProvider({
  chainId: 4202, // Lisk Sepolia
  apiKey: process.env.NEXT_PUBLIC_PANNA_API_KEY!,
});
```

## 📝 Contract ABIs

Setelah deploy, ABIs ada di folder `artifacts/contracts/`.

### Copy ABIs ke Frontend

```bash
# Copy ABIs untuk frontend
mkdir -p lib/abi
cp artifacts/contracts/VotingToken.sol/VotingToken.json lib/abi/
cp artifacts/contracts/VoterBadgeNFT.sol/VoterBadgeNFT.json lib/abi/
cp artifacts/contracts/VotingSystem.sol/VotingSystem.json lib/abi/
```

## 🔌 Contract Integration Examples

### 1. Connect Wallet

```typescript
import { pannaProvider } from '@/lib/panna';

export async function connectWallet() {
  try {
    const accounts = await pannaProvider.request({
      method: 'eth_requestAccounts'
    });

    const address = accounts[0];
    console.log('Connected:', address);
    return address;
  } catch (error) {
    console.error('Connection failed:', error);
  }
}
```

### 2. Get User Balance (VotingToken)

```typescript
import { ethers } from 'ethers';
import VotingTokenABI from '@/lib/abi/VotingToken.json';

const VOTING_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_VOTING_TOKEN_ADDRESS;

export async function getVotingTokenBalance(userAddress: string) {
  const provider = new ethers.BrowserProvider(pannaProvider);
  const contract = new ethers.Contract(
    VOTING_TOKEN_ADDRESS,
    VotingTokenABI.abi,
    provider
  );

  const balance = await contract.balanceOf(userAddress);
  return ethers.formatEther(balance);
}
```

### 3. Get Active Events

```typescript
import { ethers } from 'ethers';
import VotingSystemABI from '@/lib/abi/VotingSystem.json';

const VOTING_SYSTEM_ADDRESS = process.env.NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS;

export async function getEvent(eventId: number) {
  const provider = new ethers.BrowserProvider(pannaProvider);
  const contract = new ethers.Contract(
    VOTING_SYSTEM_ADDRESS,
    VotingSystemABI.abi,
    provider
  );

  const event = await contract.getEvent(eventId);
  return {
    id: Number(event.id),
    name: event.name,
    description: event.description,
    startTime: new Date(Number(event.startTime) * 1000),
    endTime: new Date(Number(event.endTime) * 1000),
    isActive: event.isActive,
    totalVotes: Number(event.totalVotes)
  };
}

export async function getEventCandidates(eventId: number) {
  const provider = new ethers.BrowserProvider(pannaProvider);
  const contract = new ethers.Contract(
    VOTING_SYSTEM_ADDRESS,
    VotingSystemABI.abi,
    provider
  );

  const candidates = await contract.getEventCandidates(eventId);
  return candidates.map((c: any) => ({
    id: Number(c.id),
    name: c.name,
    voteCount: Number(c.voteCount)
  }));
}
```

### 4. Commit Vote (Phase 1)

```typescript
import { ethers } from 'ethers';

export async function commitVote(
  eventId: number,
  candidateId: number,
  secret: string
) {
  // 1. Generate commit hash
  const secretBytes = ethers.id(secret); // Hash secret
  const commitHash = ethers.keccak256(
    ethers.solidityPacked(
      ['uint256', 'bytes32'],
      [candidateId, secretBytes]
    )
  );

  console.log('Commit hash:', commitHash);
  console.log('⚠️ IMPORTANT: Save this secret:', secret);

  // 2. Approve VotingToken spending
  const provider = new ethers.BrowserProvider(pannaProvider);
  const signer = await provider.getSigner();

  const votingToken = new ethers.Contract(
    VOTING_TOKEN_ADDRESS,
    VotingTokenABI.abi,
    signer
  );

  const voteTokenCost = ethers.parseEther('1'); // 1 VOTE token

  const approveTx = await votingToken.approve(
    VOTING_SYSTEM_ADDRESS,
    voteTokenCost
  );
  await approveTx.wait();
  console.log('✅ Token approved');

  // 3. Commit vote
  const votingSystem = new ethers.Contract(
    VOTING_SYSTEM_ADDRESS,
    VotingSystemABI.abi,
    signer
  );

  const commitTx = await votingSystem.commitVote(eventId, commitHash);
  await commitTx.wait();
  console.log('✅ Vote committed!');

  // 4. IMPORTANT: Save secret to localStorage
  localStorage.setItem(`vote_secret_${eventId}`, secret);

  return {
    success: true,
    txHash: commitTx.hash,
    secret: secret
  };
}
```

### 5. Reveal Vote (Phase 2)

```typescript
export async function revealVote(
  eventId: number,
  candidateId: number,
  secret?: string
) {
  // Get secret from localStorage if not provided
  const savedSecret = secret || localStorage.getItem(`vote_secret_${eventId}`);

  if (!savedSecret) {
    throw new Error('Secret not found! Cannot reveal vote.');
  }

  const provider = new ethers.BrowserProvider(pannaProvider);
  const signer = await provider.getSigner();

  const votingSystem = new ethers.Contract(
    VOTING_SYSTEM_ADDRESS,
    VotingSystemABI.abi,
    signer
  );

  const secretBytes = ethers.id(savedSecret);

  const revealTx = await votingSystem.revealVote(
    eventId,
    candidateId,
    secretBytes
  );
  await revealTx.wait();

  console.log('✅ Vote revealed!');

  // Clear secret from localStorage
  localStorage.removeItem(`vote_secret_${eventId}`);

  return {
    success: true,
    txHash: revealTx.hash
  };
}
```

### 6. Check if User Has NFT Badge

```typescript
export async function checkUserBadge(
  userAddress: string,
  eventId: number
) {
  const provider = new ethers.BrowserProvider(pannaProvider);
  const contract = new ethers.Contract(
    VOTER_BADGE_NFT_ADDRESS,
    VoterBadgeNFTABI.abi,
    provider
  );

  const hasBadge = await contract.hasBadgeForEvent(userAddress, eventId);

  if (hasBadge) {
    const tokenId = await contract.getBadgeTokenId(userAddress, eventId);
    return {
      hasBadge: true,
      tokenId: Number(tokenId)
    };
  }

  return { hasBadge: false };
}
```

### 7. Get Voting Results

```typescript
export async function getVotingResults(eventId: number) {
  const provider = new ethers.BrowserProvider(pannaProvider);
  const contract = new ethers.Contract(
    VOTING_SYSTEM_ADDRESS,
    VotingSystemABI.abi,
    provider
  );

  // Get results
  const [candidateIds, voteCounts] = await contract.getResults(eventId);

  const results = candidateIds.map((id: bigint, index: number) => ({
    candidateId: Number(id),
    voteCount: Number(voteCounts[index])
  }));

  // Get winner
  const [winnerId, winnerName, winnerVotes] = await contract.getWinner(eventId);

  return {
    results,
    winner: {
      id: Number(winnerId),
      name: winnerName,
      votes: Number(winnerVotes)
    }
  };
}
```

## 🎨 UI Component Examples

### Vote Button Component

```tsx
'use client';

import { useState } from 'react';
import { commitVote } from '@/lib/contracts';

export function VoteButton({
  eventId,
  candidateId,
  candidateName
}: {
  eventId: number;
  candidateId: number;
  candidateName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');

  async function handleVote() {
    setLoading(true);
    try {
      // Generate random secret
      const randomSecret = Math.random().toString(36).substring(2);

      const result = await commitVote(eventId, candidateId, randomSecret);

      alert(`Vote committed successfully!

⚠️ IMPORTANT: Save this secret to reveal your vote later:
${result.secret}

Transaction: ${result.txHash}`);

      setSecret(result.secret);
    } catch (error) {
      console.error('Vote failed:', error);
      alert('Vote failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
    >
      {loading ? 'Voting...' : `Vote for ${candidateName}`}
    </button>
  );
}
```

## 🔒 Security Best Practices

### 1. Secret Management

```typescript
// GOOD: Generate cryptographically secure random secret
function generateSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// BAD: Weak secret
const weakSecret = "123456"; // ❌ Don't do this!
```

### 2. Save Secret Securely

```typescript
// Store secret in localStorage with event-specific key
localStorage.setItem(`vote_secret_${eventId}`, secret);

// Also provide download option for users
function downloadSecret(secret: string, eventId: number) {
  const blob = new Blob([`Event ${eventId} Vote Secret: ${secret}`],
    { type: 'text/plain' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vote-secret-event-${eventId}.txt`;
  a.click();
}
```

### 3. Transaction Error Handling

```typescript
async function safeContractCall(fn: () => Promise<any>) {
  try {
    return await fn();
  } catch (error: any) {
    // Handle specific errors
    if (error.code === 'ACTION_REJECTED') {
      throw new Error('Transaction rejected by user');
    }
    if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds for gas');
    }
    if (error.message.includes('Already committed')) {
      throw new Error('You have already voted in this event');
    }

    // Generic error
    throw new Error(`Transaction failed: ${error.message}`);
  }
}
```

## 📊 State Management (Optional)

### Using Zustand

```typescript
import create from 'zustand';

interface VotingState {
  userAddress: string | null;
  votingTokenBalance: string;
  events: any[];
  setUserAddress: (address: string) => void;
  setBalance: (balance: string) => void;
  addEvent: (event: any) => void;
}

export const useVotingStore = create<VotingState>((set) => ({
  userAddress: null,
  votingTokenBalance: '0',
  events: [],
  setUserAddress: (address) => set({ userAddress: address }),
  setBalance: (balance) => set({ votingTokenBalance: balance }),
  addEvent: (event) => set((state) => ({
    events: [...state.events, event]
  })),
}));
```

## 🎯 Complete Voting Flow Example

```typescript
// 1. User connects wallet
const address = await connectWallet();

// 2. Check user's voting token balance
const balance = await getVotingTokenBalance(address);
console.log('Balance:', balance, 'VOTE');

// 3. Get active events
const event = await getEvent(1);
console.log('Event:', event);

// 4. Get candidates
const candidates = await getEventCandidates(1);
console.log('Candidates:', candidates);

// 5. User selects candidate and commits vote
const secret = generateSecret();
await commitVote(1, candidateId, secret);

// 6. Wait for reveal phase...
// (After event.endTime has passed)

// 7. User reveals vote
await revealVote(1, candidateId, secret);

// 8. Check if user received NFT badge
const badge = await checkUserBadge(address, 1);
console.log('Badge:', badge);

// 9. Get final results
const results = await getVotingResults(1);
console.log('Winner:', results.winner);
```

## 🚀 Deployment Checklist

- [ ] Contracts deployed to Lisk Sepolia
- [ ] Contracts verified on Blockscout
- [ ] Contract addresses in `.env`
- [ ] Panna SDK integrated
- [ ] Wallet connection working
- [ ] Vote flow tested (commit + reveal)
- [ ] NFT badge minting tested
- [ ] Results display working
- [ ] Error handling implemented
- [ ] Frontend deployed to Vercel

---

Good luck with your frontend integration! 🎨
