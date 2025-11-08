# 🔌 Backend Integration Guide

Panduan lengkap untuk menggunakan smart contracts dengan backend API (PostgreSQL + Prisma).

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Setup & Installation](#setup--installation)
3. [Using Blockchain Service](#using-blockchain-service)
4. [Event Listener Service](#event-listener-service)
5. [Sync Service](#sync-service)
6. [Integration Workflow](#integration-workflow)
7. [API Examples](#api-examples)
8. [Troubleshooting](#troubleshooting)

---

## 1. Architecture Overview

### 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│                  - User Interface                            │
│                  - Panna SDK (Gasless)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           ▼                       ▼
┌──────────────────────┐  ┌──────────────────────┐
│   Backend API        │  │   Smart Contracts     │
│   (Next.js API)      │  │   (Lisk Sepolia)      │
│                      │  │                        │
│   ┌──────────────┐   │  │   - VotingToken       │
│   │ PostgreSQL   │   │  │   - VoterBadgeNFT     │
│   │ (Prisma)     │◄──┼──┤   - VotingSystem      │
│   └──────────────┘   │  │                        │
│                      │  └──────────────────────┘
│   Services:          │           ▲
│   - BlockchainService├───────────┘
│   - EventListener    │
│   - SyncService      │
└──────────────────────┘
```

### 📊 Data Flow

**1. Event Creation (Database → Blockchain):**
```
User creates event → Save to PostgreSQL → Sync to Blockchain → Update DB with blockchain event ID
```

**2. Voting (Blockchain → Database):**
```
User votes → Blockchain transaction → Event emitted → Listener catches event → Save to Database
```

**3. Results (Database ← Blockchain):**
```
Frontend queries API → API reads from Database (fast) → Optionally verify with Blockchain
```

---

## 2. Setup & Installation

### ✅ Prerequisites

```bash
# 1. Prisma sudah installed (sudah ada di package.json kamu)
# 2. PostgreSQL database running
# 3. .env configured
```

### 📝 Environment Variables

File `.env` kamu sudah lengkap:
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/evoting?schema=public"

# Blockchain
LISK_RPC_URL="https://rpc.sepolia-api.lisk.com"
PRIVATE_KEY="your_private_key_here"

# Contract Addresses
NEXT_PUBLIC_VOTING_TOKEN_ADDRESS="0x1C949e163CA26b5FbdbD0CA9666062A1D6B94dd2"
NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS="0xE8B821494E9c1b1Fb5C3C0504D4BA69F3Ec6D093"
NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS="0x0e379D9E718b4F0E87DFA48b8c15bAF3440F0bfF"
```

### 🔧 Generate Prisma Client

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

---

## 3. Using Blockchain Service

### 📚 Import

```javascript
const { getBlockchainService } = require('./lib/blockchain');
const blockchain = getBlockchainService();
```

### 🪙 Token Operations

```javascript
// Get token balance
const balance = await blockchain.getTokenBalance("0xAlice...");
console.log(`Balance: ${balance} tokens`);

// Mint tokens to single address
const result = await blockchain.mintTokens("0xAlice...", "100");
console.log(`Minted! TX: ${result.transactionHash}`);

// Batch mint (recommended for multiple users)
const recipients = ["0xAlice...", "0xBob...", "0xCharlie..."];
const amounts = ["100", "100", "100"];

const batchResult = await blockchain.batchMintTokens(recipients, amounts);
console.log(`Batch minted! TX: ${batchResult.transactionHash}`);
```

### 🗳️ Event Operations

```javascript
// Create event on blockchain
const eventData = {
  name: "Presidential Election 2024",
  description: "Vote for the next president",
  startTime: Math.floor(new Date("2024-12-01").getTime() / 1000),
  duration: 86400 * 7, // 7 days
  revealPeriod: 3600 * 24 // 24 hours
};

const result = await blockchain.createBlockchainEvent(eventData);
console.log(`Event created! Blockchain Event ID: ${result.blockchainEventId}`);
console.log(`Transaction: ${result.transactionHash}`);

// Add candidates
const candidateNames = ["Alice", "Bob", "Charlie"];
await blockchain.addCandidates(result.blockchainEventId, candidateNames);

// Get event details
const event = await blockchain.getEvent(result.blockchainEventId);
console.log(`Event: ${event.name}`);
console.log(`Total Votes: ${event.totalVotes}`);

// Get candidates with vote counts
const candidates = await blockchain.getEventCandidates(result.blockchainEventId);
candidates.forEach(c => {
  console.log(`${c.name}: ${c.voteCount} votes`);
});

// Get winner
const winner = await blockchain.getWinner(result.blockchainEventId);
console.log(`Winner: ${winner.winnerName} with ${winner.winnerVotes} votes (${winner.percentage}%)`);
```

### 🎨 NFT Operations

```javascript
// Check if user has badge
const hasBadge = await blockchain.hasBadgeForEvent("0xAlice...", 1);
console.log(`Has badge: ${hasBadge}`);

// Get badge token ID
const tokenId = await blockchain.getBadgeTokenId("0xAlice...", 1);
console.log(`Token ID: ${tokenId}`);

// Set metadata URI for event
await blockchain.setEventBaseURI(1, "ipfs://QmPresidentialElection2024/");
```

---

## 4. Event Listener Service

### 🎧 Starting the Listener

**Method 1: As Background Service**

```bash
# Start listener (runs continuously)
node services/eventListener.js
```

Output:
```
🎧 Starting blockchain event listener...

✅ Event listener started successfully
📡 Listening to:
   - VoteCommitted
   - VoteRevealed
   - BadgeMinted
   - EventCreated

🔄 Service running... Press Ctrl+C to stop
```

**Method 2: In Your Application**

```javascript
const { getEventListenerService } = require('./services/eventListener');

const listener = getEventListenerService();
listener.start();

// Later, to stop:
// listener.stop();
```

### 📝 What It Does

When user votes on blockchain:
```
1. User reveals vote → VoteRevealed event emitted
2. Listener catches event
3. Creates/finds voter in database
4. Finds corresponding event and candidate in database
5. Saves vote record to database
6. Logs to console
```

Example output:
```
✅ VoteRevealed: Event #1, Voter: 0xAlice..., Candidate: 0
  👤 Voter found in DB: ID 5
  💾 Vote saved to database: Vote ID 12
```

---

## 5. Sync Service

### 🔄 Commands

```bash
# Check sync status
node services/syncService.js status

# Sync all pending events
node services/syncService.js sync-all

# Sync specific event
node services/syncService.js sync-event 1

# Sync vote counts
node services/syncService.js sync-votes 1

# Distribute tokens to all voters
node services/syncService.js distribute-tokens 100
```

### 📊 Sync Status Example

```bash
$ node services/syncService.js status
```

Output:
```
📊 Checking sync status...

Events:
  Total: 5
  Synced to blockchain: 3
  Pending sync: 2

Voters & Votes:
  Total voters: 150
  Total votes recorded: 87
```

### 🔄 Sync Event to Blockchain

```bash
$ node services/syncService.js sync-event 1
```

Output:
```
🔄 Syncing event 1 to blockchain...
  ✅ Created blockchain event #1
  📝 Transaction: 0xabc123...
  💾 Updated database with blockchain event ID
  📋 Adding 3 candidates to blockchain...
  ✅ Candidates added. Transaction: 0xdef456...
```

### 💰 Distribute Tokens

```bash
$ node services/syncService.js distribute-tokens 100
```

Output:
```
🪙 Distributing 100 tokens to all voters...

  👥 Found 150 voters in database
  ✓ Alice (0x742d35Cc...) already has 100.0 tokens
  ✓ Bob (0x123456789...) already has 100.0 tokens

  💰 148 voters need tokens

  📤 Sending batch mint transaction...
  ✅ Tokens distributed!
  📝 Transaction: 0x789abc...
  📦 Block: 12345
```

---

## 6. Integration Workflow

### 📋 Typical Workflow: Create Event

**Step 1: User creates event via API**

```javascript
// API Route: /api/events/create
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

app.post('/api/events/create', async (req, res) => {
  const { name, description, startTime, endTime, candidates, createdBy } = req.body;

  // Save to database first
  const event = await prisma.event.create({
    data: {
      name,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      createdBy,
      isActive: true,
      candidates: {
        create: candidates.map(name => ({ name }))
      }
    },
    include: { candidates: true }
  });

  res.json({
    success: true,
    event: {
      id: event.id,
      name: event.name,
      blockchainSynced: false
    }
  });
});
```

**Step 2: Sync to blockchain (manual or automatic)**

```javascript
// API Route: /api/events/:id/sync-blockchain
const { getSyncService } = require('./services/syncService');

app.post('/api/events/:id/sync-blockchain', async (req, res) => {
  const eventId = parseInt(req.params.id);

  const syncService = getSyncService();
  const result = await syncService.syncEventToBlockchain(eventId);

  res.json({
    success: true,
    blockchainEventId: result.blockchainEventId,
    transactionHash: result.transactionHash
  });
});
```

**Step 3: User votes (directly to blockchain via frontend)**

User votes via Panna SDK → Blockchain transaction → Event emitted

**Step 4: Listener saves vote to database** (automatic)

EventListener running in background catches VoteRevealed event and saves to database

---

### 📋 Typical Workflow: Voter Registration

**Step 1: User registers**

```javascript
// API Route: /api/voters/register
app.post('/api/voters/register', async (req, res) => {
  const { name, walletId } = req.body;

  const voter = await prisma.voter.create({
    data: {
      name,
      walletId: walletId.toLowerCase()
    }
  });

  res.json({
    success: true,
    voter: {
      id: voter.id,
      name: voter.name,
      walletId: voter.walletId
    }
  });
});
```

**Step 2: Admin distributes tokens**

```bash
# CLI
node services/syncService.js distribute-tokens 100

# Or via API
POST /api/admin/distribute-tokens
{
  "amount": "100"
}
```

```javascript
// API implementation
app.post('/api/admin/distribute-tokens', async (req, res) => {
  const { amount } = req.body;

  const syncService = getSyncService();
  const result = await syncService.distributeTokensToVoters(amount || "100");

  res.json({
    success: true,
    votersCount: result.votersCount,
    transactionHash: result.transactionHash
  });
});
```

---

## 7. API Examples

### 📝 Complete API Examples

#### **GET /api/events**

Get all events dengan blockchain data:

```javascript
app.get('/api/events', async (req, res) => {
  const { getBlockchainService } = require('./lib/blockchain');
  const blockchain = getBlockchainService();

  const events = await prisma.event.findMany({
    include: {
      candidates: true,
      _count: {
        select: { votes: true }
      }
    }
  });

  // Enhance dengan blockchain data
  const eventsWithBlockchainData = await Promise.all(
    events.map(async (event) => {
      if (event.blockAddress) {
        try {
          const blockchainEvent = await blockchain.getEvent(Number(event.blockAddress));
          return {
            ...event,
            blockchain: {
              totalVotes: blockchainEvent.totalVotes,
              isActive: blockchainEvent.isActive
            }
          };
        } catch (error) {
          console.error(`Error fetching blockchain data for event ${event.id}:`, error);
        }
      }
      return event;
    })
  );

  res.json({ events: eventsWithBlockchainData });
});
```

#### **GET /api/events/:id/results**

Get event results dengan vote counts:

```javascript
app.get('/api/events/:id/results', async (req, res) => {
  const eventId = parseInt(req.params.id);

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      candidates: {
        include: {
          _count: {
            select: { votes: true }
          }
        }
      }
    }
  });

  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  // Get winner dari blockchain
  let blockchainWinner = null;
  if (event.blockAddress) {
    try {
      const blockchain = getBlockchainService();
      blockchainWinner = await blockchain.getWinner(Number(event.blockAddress));
    } catch (error) {
      console.error('Error fetching blockchain winner:', error);
    }
  }

  const results = event.candidates.map(candidate => ({
    id: candidate.id,
    name: candidate.name,
    votes: candidate._count.votes
  }));

  const totalVotes = results.reduce((sum, c) => sum + c.votes, 0);

  res.json({
    event: {
      id: event.id,
      name: event.name,
      totalVotes
    },
    candidates: results.map(c => ({
      ...c,
      percentage: totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(2) : 0
    })),
    blockchainWinner
  });
});
```

#### **POST /api/voters/:walletId/check-token**

Check if voter has voting token:

```javascript
app.post('/api/voters/:walletId/check-token', async (req, res) => {
  const { walletId } = req.params;

  const blockchain = getBlockchainService();

  const balance = await blockchain.getTokenBalance(walletId);

  res.json({
    walletId,
    balance,
    canVote: parseFloat(balance) > 0
  });
});
```

#### **POST /api/voters/:walletId/check-badge**

Check if voter has NFT badge for event:

```javascript
app.post('/api/voters/:walletId/check-badge', async (req, res) => {
  const { walletId } = req.params;
  const { eventId } = req.body;

  const blockchain = getBlockchainService();

  // Get event from database
  const event = await prisma.event.findUnique({
    where: { id: parseInt(eventId) }
  });

  if (!event || !event.blockAddress) {
    return res.status(404).json({ error: 'Event not found or not synced' });
  }

  const hasBadge = await blockchain.hasBadgeForEvent(
    walletId,
    Number(event.blockAddress)
  );

  let tokenId = null;
  if (hasBadge) {
    tokenId = await blockchain.getBadgeTokenId(
      walletId,
      Number(event.blockAddress)
    );
  }

  res.json({
    walletId,
    eventId,
    hasBadge,
    tokenId
  });
});
```

---

## 8. Troubleshooting

### ❌ Error: "Cannot find module '@prisma/client'"

**Solution:**
```bash
npx prisma generate
```

### ❌ Error: "PrismaClient unable to connect to database"

**Solution:**
1. Check PostgreSQL is running
2. Verify `DATABASE_URL` in `.env`
3. Test connection:
```bash
npx prisma db push
```

### ❌ Error: "Contract not deployed at address"

**Solution:**
1. Verify contract addresses in `.env`
2. Check RPC URL is correct
3. Ensure contracts are deployed:
```bash
node scripts/check-balance.js
```

### ❌ Event Listener Not Catching Events

**Checklist:**
1. Is listener running? Check console logs
2. Are contracts deployed and verified?
3. Is RPC URL accessible?
4. Check database connection

**Debug:**
```javascript
// Add console.log in eventListener.js
blockchain.onVoteRevealed((eventId, voter, candidateId, event) => {
  console.log("🔍 DEBUG: Event caught!", { eventId, voter, candidateId });
  // ... rest of code
});
```

### ⚠️ Votes Not Syncing to Database

**Possible Causes:**
1. Event not in database → Add event first
2. Voter not in database → Register voter first
3. Candidate not found → Check candidate order matches blockchain

**Solution:**
```bash
# Check sync status
node services/syncService.js status

# Sync specific event
node services/syncService.js sync-event 1
```

---

## 📚 Summary

### ✅ What You Have Now:

1. **BlockchainService** (`lib/blockchain.js`)
   - Interact dengan smart contracts
   - Mint tokens, create events, query data

2. **EventListenerService** (`services/eventListener.js`)
   - Listen blockchain events
   - Auto-sync votes to database

3. **SyncService** (`services/syncService.js`)
   - Sync events database → blockchain
   - Distribute tokens
   - Check sync status

### 🚀 Usage:

```javascript
// In your API routes:
const { getBlockchainService } = require('./lib/blockchain');
const { getEventListenerService } = require('./services/eventListener');
const { getSyncService } = require('./services/syncService');

const blockchain = getBlockchainService();
const listener = getEventListenerService();
const sync = getSyncService();

// Start listener (once, in server startup)
listener.start();

// Use blockchain service
await blockchain.mintTokens("0xAlice...", "100");

// Use sync service
await sync.syncEventToBlockchain(eventId);
```

### 📋 Quick Commands:

```bash
# Event Listener
node services/eventListener.js

# Sync Service
node services/syncService.js status
node services/syncService.js sync-all
node services/syncService.js distribute-tokens 100

# Prisma
npx prisma studio
npx prisma db push
npx prisma generate
```

---

**Sekarang backend kamu sudah fully integrated dengan smart contracts! 🎉**

Untuk Demo Day, kamu bisa tunjukkan:
- ✅ Event creation: Database → Blockchain
- ✅ Token distribution: Backend → Smart Contract
- ✅ Real-time vote sync: Blockchain → Database
- ✅ Results dashboard: Database (fast) + Blockchain verification

Happy integrating! 🚀
