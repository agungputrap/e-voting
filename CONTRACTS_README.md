# 📝 Smart Contracts Documentation for Frontend Team

## 🎯 Overview

This e-voting system uses 3 smart contracts deployed on **Lisk Sepolia Testnet**:

1. **VotingToken (ERC-20)** - Token for voting power
2. **VoterBadgeNFT (ERC-721)** - NFT badges as rewards
3. **VotingSystem** - Main voting logic with commit-reveal pattern

## 📋 Deployed Contract Addresses

```
Network: Lisk Sepolia Testnet
Chain ID: 4202
RPC URL: https://rpc.sepolia-api.lisk.com
Explorer: https://sepolia-blockscout.lisk.com
```

### Contract Addresses:

```javascript
const VOTING_TOKEN_ADDRESS = "0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2";
const VOTER_BADGE_NFT_ADDRESS = "0xE8B821494E9c1b1Fb5C3C0504D4BA69F3Ec6D093";
const VOTING_SYSTEM_ADDRESS = "0x0e379D9E718b4F0E87DFA48b8c15bAF3440F0bfF";
```

**Blockscout Links (Verified):**
- [VotingToken](https://sepolia-blockscout.lisk.com/address/0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2)
- [VoterBadgeNFT](https://sepolia-blockscout.lisk.com/address/0xE8B821494E9c1b1Fb5C3C0504D4BA69F3Ec6D093)
- [VotingSystem](https://sepolia-blockscout.lisk.com/address/0x0e379D9E718b4F0E87DFA48b8c15bAF3440F0bfF)

## 📦 Contract ABIs

ABIs tersedia di folder `artifacts/contracts/`:

```
artifacts/contracts/VotingToken.sol/VotingToken.json
artifacts/contracts/VoterBadgeNFT.sol/VoterBadgeNFT.json
artifacts/contracts/VotingSystem.sol/VotingSystem.json
```

## 🔑 Key Contract Functions

### 1. VotingToken (ERC-20)

**Read Functions:**
```javascript
// Get token balance
await votingToken.balanceOf(address)

// Get token info
await votingToken.name()        // "VotingToken"
await votingToken.symbol()      // "VOTE"
await votingToken.decimals()    // 18
await votingToken.totalSupply() // 1,000,000 VOTE
```

**Write Functions:**
```javascript
// Transfer tokens
await votingToken.transfer(toAddress, amount)

// Approve spending (required before voting)
await votingToken.approve(VOTING_SYSTEM_ADDRESS, amount)
```

### 2. VoterBadgeNFT (ERC-721)

**Read Functions:**
```javascript
// Check if user has badge for event
await voterBadgeNFT.hasBadgeForEvent(userAddress, eventId)

// Get user's badge token ID
await voterBadgeNFT.getBadgeTokenId(userAddress, eventId)

// Get NFT metadata URI
await voterBadgeNFT.tokenURI(tokenId)

// Check total minted
await voterBadgeNFT.totalSupply()
```

### 3. VotingSystem (Main Contract)

**Read Functions:**
```javascript
// Get event details
await votingSystem["getEvent(uint256)"](eventId)
// Returns: { id, name, description, creator, startTime, endTime, isActive, totalVotes }

// Get candidates for event
await votingSystem["getEventCandidates(uint256)"](eventId)
// Returns: Array of { id, name, eventId, voteCount }

// Get voting results (after reveal phase)
await votingSystem.getResults(eventId)
// Returns: [candidateIds[], voteCounts[]]

// Get winner
await votingSystem.getWinner(eventId)
// Returns: { winnerId, winnerName, winnerVotes }

// Check if user has committed/revealed
await votingSystem.hasCommitted(voterAddress, eventId)
await votingSystem.hasRevealed(voterAddress, eventId)

// Get vote cost
await votingSystem.voteTokenCost() // 1 VOTE token
```

**Write Functions:**

```javascript
// 1. Commit vote (Phase 1 - Anonymous)
const secret = ethers.id("my-secret-string");
const commitHash = ethers.keccak256(
  ethers.solidityPacked(["uint256", "bytes32"], [candidateId, secret])
);

// Must approve token first!
await votingToken.approve(VOTING_SYSTEM_ADDRESS, ethers.parseEther("1"));

// Then commit
await votingSystem.commitVote(eventId, commitHash);

// IMPORTANT: Save secret for reveal!
localStorage.setItem(`vote_secret_${eventId}`, "my-secret-string");


// 2. Reveal vote (Phase 2 - After voting ends)
const savedSecret = localStorage.getItem(`vote_secret_${eventId}`);
const secretBytes = ethers.id(savedSecret);

await votingSystem.revealVote(eventId, candidateId, secretBytes);

// 3. Claim NFT badge (if not auto-minted)
await votingSystem.claimNFTBadge(eventId);
```

## 🗓️ Voting Timeline

```
┌─────────────────────────────────────────────────────────────┐
│  Event Created                                              │
│  ↓                                                          │
│  📝 Add Candidates (before startTime)                      │
│  ↓                                                          │
│  🕐 startTime ─────────────────────> endTime               │
│     COMMIT PHASE                                           │
│     Users submit vote commits (hashes)                     │
│  ↓                                                          │
│  🕐 endTime ──────────────────────> revealDeadline        │
│     REVEAL PHASE                                           │
│     Users reveal their votes                               │
│  ↓                                                          │
│  ✅ Results Available                                      │
│  🏆 Winner Announced                                       │
│  🎫 NFT Badges Distributed                                 │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Commit-Reveal Pattern Explained

**Why?** For anonymous voting - prevents vote manipulation.

**Phase 1: Commit (During voting)**
```javascript
// User votes for candidate 2 with secret "mysecret123"
const candidateId = 2;
const secret = "mysecret123";

// Generate commit hash
const secretBytes = ethers.id(secret); // Hash the secret
const commitHash = ethers.keccak256(
  ethers.solidityPacked(
    ["uint256", "bytes32"],
    [candidateId, secretBytes]
  )
);

// Submit commit (only hash is stored on-chain)
await votingSystem.commitVote(eventId, commitHash);
```

**Phase 2: Reveal (After voting ends)**
```javascript
// Submit the actual vote + secret
await votingSystem.revealVote(eventId, candidateId, secretBytes);

// Smart contract verifies:
// 1. Hash matches the commit
// 2. Only then counts the vote
```

## 💡 Frontend Integration Tips

### 1. Check Current Phase

```javascript
function getCurrentPhase(event) {
  const now = Math.floor(Date.now() / 1000);

  if (now < event.startTime) {
    return "NOT_STARTED";
  } else if (now <= event.endTime) {
    return "COMMIT_PHASE";
  } else if (now <= event.revealDeadline) {
    return "REVEAL_PHASE";
  } else {
    return "ENDED";
  }
}
```

### 2. Secret Management

```javascript
// Generate secure random secret
function generateSecret() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Save secret securely
function saveSecret(eventId, secret) {
  // LocalStorage
  localStorage.setItem(`vote_secret_${eventId}`, secret);

  // Also offer download
  const blob = new Blob([`Vote Secret: ${secret}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  // ... create download link
}
```

### 3. Error Handling

```javascript
async function safeCommitVote(eventId, commitHash) {
  try {
    // Check if already committed
    const hasCommitted = await votingSystem.hasCommitted(
      userAddress,
      eventId
    );
    if (hasCommitted) {
      throw new Error("You already voted in this event");
    }

    // Check token balance
    const balance = await votingToken.balanceOf(userAddress);
    if (balance < ethers.parseEther("1")) {
      throw new Error("Insufficient VOTE tokens");
    }

    // Proceed with commit
    await votingSystem.commitVote(eventId, commitHash);

  } catch (error) {
    if (error.message.includes("Event not active")) {
      alert("Voting is not active for this event");
    } else if (error.message.includes("Already committed")) {
      alert("You already voted!");
    }
    // Handle other errors...
  }
}
```

## 🧪 Testing on Testnet

### Get Test ETH
https://sepolia-faucet.lisk.com

### Get Test VOTE Tokens
Ask admin/deployer to transfer VOTE tokens to your address.

**Contract call:**
```javascript
// Admin distributes tokens
await votingToken.transfer(voterAddress, ethers.parseEther("100"));
```

## 📊 Important Notes

1. **1 VOTE token = 1 vote** (cost defined in VotingSystem)
2. **User can only vote ONCE per event** (enforced on-chain)
3. **NFT badge is auto-minted** after reveal (if not already claimed)
4. **Secrets must be saved** - cannot recover if lost!
5. **Use Panna SDK** for gasless transactions (better UX)

## 🔗 Useful Resources

- **Lisk Sepolia RPC:** https://rpc.sepolia-api.lisk.com
- **Explorer:** https://sepolia-blockscout.lisk.com
- **Faucet:** https://sepolia-faucet.lisk.com
- **Panna SDK Docs:** https://docs.panna.network
- **Full Integration Guide:** See `FRONTEND_INTEGRATION.md`

## 📞 Contact

For smart contract questions:
- Check verified contracts on Blockscout
- Review test scripts in `scripts/test-interaction.js`
- See `FRONTEND_INTEGRATION.md` for code examples

---

**Contract Version:** 1.0.0
**Network:** Lisk Sepolia Testnet
**Last Updated:** 2025-11-07
