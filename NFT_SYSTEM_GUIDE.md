# 🎨 NFT System Guide - VoterBadgeNFT

Panduan lengkap tentang cara kerja sistem NFT (Non-Fungible Token) di project E-Voting System.

---

## 📋 Table of Contents

1. [NFT Concept Overview](#nft-concept-overview)
2. [How NFT Works in Our System](#how-nft-works-in-our-system)
3. [NFT Minting Flow](#nft-minting-flow)
4. [NFT Metadata Structure](#nft-metadata-structure)
5. [Soulbound NFT Feature](#soulbound-nft-feature)
6. [NFT Authorization System](#nft-authorization-system)
7. [Managing NFT Metadata](#managing-nft-metadata)
8. [Use Cases & Examples](#use-cases--examples)
9. [NFT Management Scripts](#nft-management-scripts)
10. [Troubleshooting](#troubleshooting)

---

## 1. NFT Concept Overview

### 🎨 Apa itu NFT?

**NFT (Non-Fungible Token)** = Token yang **unik** dan **tidak bisa ditukar 1:1** dengan token lain.

**Bedanya dengan Token Biasa (ERC-20):**

```
ERC-20 (VotingToken):
🪙 Token A = Token B = Token C
- Semua sama, bisa ditukar
- Seperti uang: $1 = $1
- Fungible (bisa saling tukar)

ERC-721 (VoterBadgeNFT):
🎨 NFT #1 ≠ NFT #2 ≠ NFT #3
- Setiap NFT unik
- Seperti lukisan asli: Mona Lisa ≠ Starry Night
- Non-fungible (tidak bisa ditukar)
```

---

### 🏆 Kenapa Pakai NFT di Voting System?

**Purpose**: NFT sebagai **Proof of Participation** dan **Reward** untuk voters

**Benefits:**

1. **Unique Per Event**
   ```
   Presidential Election 2024 → Badge design A
   City Mayor Election 2024   → Badge design B
   School Board Election 2024 → Badge design C
   ```

2. **Permanent Record**
   - Tersimpan di blockchain selamanya
   - Tidak bisa dihapus atau diubah
   - Bukti kamu pernah voting

3. **Collectible**
   - Bisa di-display di wallet (MetaMask, OpenSea)
   - Menambah engagement
   - Gamification element

4. **Incentive**
   - Encourage people to vote
   - Bisa di-showcase di profile
   - Exclusive badge untuk early voters

---

## 2. How NFT Works in Our System

### 🔄 Complete NFT Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│ PHASE 1: Setup (Admin)                                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ 1. Admin deploys VoterBadgeNFT contract                      │
│    └─ Set isSoulBound: true/false                            │
│                                                               │
│ 2. Admin authorizes VotingSystem contract as minter          │
│    voterBadgeNFT.authorizeMinter(votingSystemAddress)        │
│                                                               │
│ 3. Admin sets metadata URI for event                         │
│    voterBadgeNFT.setEventBaseURI(1, "ipfs://QmXxx/")         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ PHASE 2: User Voting (Automatic NFT Minting)                 │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ User commits vote → User reveals vote                         │
│                            │                                  │
│                            ▼                                  │
│              VotingSystem.revealVote()                        │
│                            │                                  │
│                            ├─ Verify reveal                   │
│                            ├─ Count vote                      │
│                            └─ Call NFT contract:              │
│                                                               │
│              voterBadgeNFT.mintBadge(voter, eventId)          │
│                            │                                  │
│                            ▼                                  │
│              ┌───────────────────────┐                        │
│              │  NFT Contract Checks: │                        │
│              ├───────────────────────┤                        │
│              │ ✓ Caller authorized?  │                        │
│              │ ✓ User already have?  │                        │
│              │ ✓ Contract paused?    │                        │
│              └───────────────────────┘                        │
│                            │                                  │
│                            ▼                                  │
│              ✅ Mint NFT to voter                             │
│              ✅ Assign token ID (e.g., #42)                   │
│              ✅ Link: Token #42 → Event #1                    │
│              ✅ Link: Voter + Event #1 → Token #42            │
│              ✅ Set token URI (metadata)                      │
│              ✅ Emit BadgeMinted event                        │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────┐
│ PHASE 3: After Minting                                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ User can:                                                     │
│ ✅ View NFT in wallet (MetaMask)                             │
│ ✅ View on NFT marketplaces (OpenSea, etc.)                  │
│ ✅ Show off badge on social media                            │
│ ✅ Prove participation in event                              │
│                                                               │
│ If Soulbound = false:                                        │
│ ✅ Transfer NFT to other address                             │
│ ✅ Sell/trade NFT                                            │
│                                                               │
│ If Soulbound = true:                                         │
│ ❌ CANNOT transfer (permanent to voter)                      │
│ ✅ Can only burn (destroy) if wanted                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

### 📊 Data Structure Diagram

```
VoterBadgeNFT Contract
├─ State Variables:
│  ├─ _nextTokenId: 1, 2, 3, ... (counter)
│  ├─ tokenToEvent: { 1 → eventId 1, 2 → eventId 1, 3 → eventId 2, ... }
│  ├─ userEventToToken: {
│  │     "0xAlice" → { eventId 1 → tokenId 1, eventId 2 → tokenId 3 },
│  │     "0xBob"   → { eventId 1 → tokenId 2 }
│  │  }
│  ├─ eventBaseURIs: {
│  │     eventId 1 → "ipfs://QmAbc/",
│  │     eventId 2 → "ipfs://QmXyz/"
│  │  }
│  ├─ authorizedMinters: {
│  │     "0xVotingSystem" → true,
│  │     "0xOtherContract" → false
│  │  }
│  └─ isSoulBound: true/false
│
└─ Token Data:
   Token #1: { owner: "0xAlice", eventId: 1, URI: "ipfs://QmAbc/1" }
   Token #2: { owner: "0xBob",   eventId: 1, URI: "ipfs://QmAbc/2" }
   Token #3: { owner: "0xAlice", eventId: 2, URI: "ipfs://QmXyz/3" }
```

---

## 3. NFT Minting Flow

### 🎯 Scenario: User "Alice" Votes in Event #1

#### **Step 1: Preparation (Before Any Voting)**

```javascript
// Admin setup (one time per event)
const eventId = 1;
const metadataURI = "ipfs://QmPresidentialElection2024/";

// Set metadata URI for this event
await voterBadgeNFT.setEventBaseURI(eventId, metadataURI);
// Now all NFTs for event #1 will use this base URI
```

---

#### **Step 2: User Votes (Commit & Reveal)**

```javascript
// Alice commits vote
await votingSystem.connect(alice).commitVote(eventId, commitHash);

// After voting period ends, Alice reveals
await votingSystem.connect(alice).revealVote(eventId, candidateId, secret);
```

---

#### **Step 3: Automatic NFT Minting (Inside revealVote)**

Di dalam `VotingSystem.revealVote()`, setelah vote berhasil di-verify:

```solidity
// File: VotingSystem.sol (simplified)

function revealVote(uint256 eventId, uint256 candidateId, bytes32 secret) external {
    // ... verify reveal logic ...

    // Vote counted successfully
    candidates[eventId][candidateId].voteCount++;
    commits[msg.sender][eventId].revealed = true;
    events[eventId].totalVotes++;

    // 🎨 MINT NFT BADGE
    try voterBadgeNFT.mintBadge(msg.sender, eventId) returns (uint256 tokenId) {
        emit BadgeMinted(msg.sender, eventId, tokenId);
    } catch {
        // NFT mint failed, tapi vote tetap counted
        // (bisa jadi user sudah punya badge)
    }
}
```

---

#### **Step 4: Inside mintBadge Function**

File: [VoterBadgeNFT.sol:143-172](contracts/VoterBadgeNFT.sol:143-172)

```solidity
function mintBadge(address voter, uint256 eventId)
    external
    onlyAuthorizedMinter // ✓ Only VotingSystem can call
    whenNotPaused         // ✓ Contract not paused
    returns (uint256)
{
    // ✓ Check 1: Valid address
    require(voter != address(0), "Cannot mint to zero address");

    // ✓ Check 2: User belum punya badge untuk event ini
    require(
        userEventToToken[voter][eventId] == 0,
        "Voter already has badge for this event"
    );

    // Generate token ID baru
    uint256 tokenId = _nextTokenId++;  // e.g., 1, 2, 3, ...

    // Mint NFT ke voter
    _safeMint(voter, tokenId);

    // Set mappings
    tokenToEvent[tokenId] = eventId;              // Token #1 → Event #1
    userEventToToken[voter][eventId] = tokenId;   // Alice + Event #1 → Token #1

    // Set metadata URI
    if (bytes(eventBaseURIs[eventId]).length > 0) {
        // Construct full URI: "ipfs://QmAbc/" + "1" = "ipfs://QmAbc/1"
        string memory uri = string(
            abi.encodePacked(eventBaseURIs[eventId], tokenId.toString())
        );
        _setTokenURI(tokenId, uri);
    }

    // Emit event untuk off-chain tracking
    emit BadgeMinted(voter, tokenId, eventId);

    return tokenId;
}
```

---

#### **Step 5: Result**

```
✅ Alice now owns NFT Token #1
   - Token ID: 1
   - Event: Presidential Election 2024 (eventId: 1)
   - Owner: 0xAlice...
   - Metadata URI: ipfs://QmPresidentialElection2024/1
   - Soulbound: true (cannot transfer)

✅ Mappings Updated:
   - tokenToEvent[1] = 1 (Token #1 belongs to Event #1)
   - userEventToToken[0xAlice][1] = 1 (Alice has Token #1 for Event #1)

✅ Alice can now:
   - View NFT in MetaMask wallet
   - See metadata (image, name, description)
   - Prove she voted in this event
```

---

### 🔁 What if Alice Votes in Event #2?

```javascript
// Alice votes in another event
await votingSystem.connect(alice).revealVote(eventId2, candidateId, secret);

// New NFT minted:
✅ Alice now owns NFT Token #2
   - Token ID: 2
   - Event: City Mayor Election 2024 (eventId: 2)
   - Owner: 0xAlice...
   - Metadata URI: ipfs://QmCityMayor2024/2

✅ Alice's NFT Collection:
   - Token #1 (Event #1 - Presidential)
   - Token #2 (Event #2 - City Mayor)
```

---

### ⚠️ What if Alice Tries to Vote Again in Same Event?

```javascript
// Alice tries to reveal vote again in Event #1
await votingSystem.connect(alice).revealVote(eventId1, candidateId, secret);

// Result:
❌ Transaction REVERTS with error: "Already revealed"
   (Checked at VotingSystem level, before NFT minting)

// Even if it reaches NFT contract:
❌ mintBadge() would revert with: "Voter already has badge for this event"
   (Checked at line 151: userEventToToken[voter][eventId] == 0)
```

**Protection Mechanism**: One NFT per user per event!

---

## 4. NFT Metadata Structure

### 📄 What is Metadata?

**Metadata** = Data tentang NFT (gambar, nama, deskripsi, attributes)

**Storage Location:**
- ❌ **Not** stored on-chain (terlalu mahal!)
- ✅ **Stored** off-chain (IPFS, centralized server)
- ✅ **Link** stored on-chain (tokenURI)

---

### 🗂️ Metadata Flow

```
┌─────────────────────┐
│ Blockchain (Cheap)  │
│                     │
│ Token #1:           │
│   owner: 0xAlice    │
│   eventId: 1        │
│   tokenURI: "ipfs://QmAbc/1" ──────┐
│                     │               │
└─────────────────────┘               │
                                      │
                                      ▼
┌─────────────────────────────────────────────────┐
│ IPFS / Server (Metadata Storage)                │
│                                                  │
│ ipfs://QmAbc/1 → JSON file:                     │
│ {                                                │
│   "name": "Presidential Election 2024 Voter",   │
│   "description": "Proof of participation...",   │
│   "image": "ipfs://QmXyz/badge.png",            │
│   "attributes": [...]                           │
│ }                                                │
└─────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────┐
│ User's Wallet (Display)                          │
│                                                  │
│ ┌─────────────────┐                             │
│ │  🏆 Badge Image │                             │
│ │                 │                             │
│ │ Presidential    │                             │
│ │ Election 2024   │                             │
│ │                 │                             │
│ │ Token #1        │                             │
│ └─────────────────┘                             │
└─────────────────────────────────────────────────┘
```

---

### 📋 Metadata JSON Format (ERC-721 Standard)

File: `1.json` (for Token #1)

```json
{
  "name": "Presidential Election 2024 - Voter Badge",
  "description": "This NFT badge certifies that the holder participated in the Presidential Election 2024 voting event. This is a proof of civic engagement and democratic participation.",

  "image": "ipfs://QmPresidentialBadge2024/badge.png",

  "external_url": "https://yourproject.com/events/1",

  "attributes": [
    {
      "trait_type": "Event",
      "value": "Presidential Election 2024"
    },
    {
      "trait_type": "Event ID",
      "value": "1"
    },
    {
      "trait_type": "Event Date",
      "value": "2024-11-05"
    },
    {
      "trait_type": "Badge Type",
      "value": "Voter Participation"
    },
    {
      "trait_type": "Voting Method",
      "value": "Anonymous Commit-Reveal"
    },
    {
      "trait_type": "Network",
      "value": "Lisk Sepolia"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ],

  "properties": {
    "category": "Governance",
    "creator": "E-Voting System",
    "total_supply": "1000"
  }
}
```

---

### 🎨 Metadata Components Explained

#### **1. name** (Required)
```json
"name": "Presidential Election 2024 - Voter Badge"
```
- Nama NFT yang tampil di wallet/marketplace
- Format: `{Event Name} - {Badge Type}`

#### **2. description** (Required)
```json
"description": "This NFT badge certifies that..."
```
- Penjelasan lengkap tentang NFT
- Bisa berisi backstory, significance, dll

#### **3. image** (Required)
```json
"image": "ipfs://QmPresidentialBadge2024/badge.png"
```
- URL ke gambar NFT
- Bisa PNG, JPG, SVG, atau GIF
- Recommended: IPFS untuk permanence

**Image Examples:**
```
Option 1: IPFS
"image": "ipfs://QmXyz.../badge.png"

Option 2: Centralized Server
"image": "https://api.yourproject.com/images/event1/badge.png"

Option 3: On-chain SVG (expensive!)
"image": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0..."
```

#### **4. external_url** (Optional)
```json
"external_url": "https://yourproject.com/events/1"
```
- Link ke halaman detail event
- Users dapat learn more tentang event

#### **5. attributes** (Optional but Recommended)
```json
"attributes": [
  {
    "trait_type": "Event",
    "value": "Presidential Election 2024"
  },
  {
    "trait_type": "Badge Type",
    "value": "Voter Participation"
  }
]
```
- Metadata terstruktur untuk filtering/sorting
- Tampil di OpenSea sebagai "Properties"
- Bagus untuk analytics dan rarity

**Common Trait Types:**
- `Event`: Nama event
- `Event ID`: ID unik event
- `Event Date`: Tanggal voting
- `Badge Type`: Kategori badge
- `Rarity`: Common, Rare, Legendary, dll
- `Network`: Blockchain network

---

### 🌐 Setting Up Metadata

#### **Option 1: IPFS (Recommended - Decentralized)**

**Step 1: Prepare Files**
```
metadata/
├── 1.json
├── 2.json
├── 3.json
├── ...
└── images/
    ├── badge.png
    └── ...
```

**Step 2: Upload to IPFS**

Using [Pinata](https://pinata.cloud):
```bash
# 1. Sign up at pinata.cloud
# 2. Upload folder via web UI or API
# 3. Get CID: QmPresidentialElection2024

# Your base URI:
ipfs://QmPresidentialElection2024/
```

**Step 3: Set Base URI in Contract**
```javascript
const eventId = 1;
const baseURI = "ipfs://QmPresidentialElection2024/";

await voterBadgeNFT.setEventBaseURI(eventId, baseURI);
```

**Result:**
```
Token #1 → ipfs://QmPresidentialElection2024/1
Token #2 → ipfs://QmPresidentialElection2024/2
Token #3 → ipfs://QmPresidentialElection2024/3
```

---

#### **Option 2: Centralized Server (Easier but Less Decentralized)**

**Step 1: Setup API Endpoint**
```
https://api.yourproject.com/metadata/event1/1.json
https://api.yourproject.com/metadata/event1/2.json
https://api.yourproject.com/metadata/event1/3.json
```

**Step 2: Set Base URI**
```javascript
const baseURI = "https://api.yourproject.com/metadata/event1/";

await voterBadgeNFT.setEventBaseURI(eventId, baseURI);
```

**Pros:**
- ✅ Easy to update metadata
- ✅ Can add dynamic data
- ✅ No IPFS costs

**Cons:**
- ❌ Centralized (single point of failure)
- ❌ You must maintain server
- ❌ Less "permanent" than IPFS

---

#### **Option 3: Dynamic On-Chain (Advanced)**

Generate metadata on-chain using Solidity:

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    // Generate JSON on-chain
    string memory json = Base64.encode(
        bytes(
            string(
                abi.encodePacked(
                    '{"name": "Badge #', tokenId.toString(), '",',
                    '"description": "Voter badge",',
                    '"image": "data:image/svg+xml;base64,', _generateSVG(tokenId), '"}'
                )
            )
        )
    );

    return string(abi.encodePacked('data:application/json;base64,', json));
}
```

**Pros:**
- ✅ Fully on-chain (most decentralized)
- ✅ No external dependencies

**Cons:**
- ❌ Very expensive gas costs
- ❌ Limited complexity
- ❌ Hard to update

---

## 5. Soulbound NFT Feature

### 🔗 What is Soulbound?

**Soulbound NFT** = NFT yang **tidak bisa di-transfer** setelah di-mint

**Concept:** Badge yang "terikat" ke pemiliknya selamanya

---

### 🎯 Why Soulbound for Voting Badge?

**Problem Tanpa Soulbound:**
```
❌ User A votes → gets badge → sells badge to User B
   → User B claims "I voted" (padahal tidak)
   → Badge tidak lagi proof of participation yang valid
```

**Solution Dengan Soulbound:**
```
✅ User A votes → gets badge → CANNOT transfer
   → Badge tetap di User A selamanya
   → Badge adalah proof yang valid dan permanent
```

---

### ⚙️ How Soulbound Works

File: [VoterBadgeNFT.sol:267-281](contracts/VoterBadgeNFT.sol:267-281)

```solidity
function _update(address to, uint256 tokenId, address auth) internal override {
    address from = _ownerOf(tokenId);

    // Check if soulbound
    if (isSoulBound && from != address(0) && to != address(0)) {
        revert("NFT is soul-bound and cannot be transferred");
    }

    return super._update(to, tokenId, auth);
}
```

**Logic:**
```
from != address(0) && to != address(0)
  │                      │
  │                      └─ Not burning (to ≠ 0x0)
  └─ Not minting (from ≠ 0x0)

If both true + isSoulBound = true → REVERT (block transfer)
```

---

### 📊 Soulbound State Machine

```
┌──────────────────────────────────────────────────────┐
│ Allowed Operations:                                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ✅ MINT (from 0x0 → User)                            │
│    address(0) ──mint──→ 0xAlice                      │
│    Allowed: from = 0x0 (minting operation)           │
│                                                       │
│ ✅ BURN (User → 0x0)                                 │
│    0xAlice ──burn──→ address(0)                      │
│    Allowed: to = 0x0 (burning operation)             │
│                                                       │
│ ❌ TRANSFER (User → User) if isSoulBound = true      │
│    0xAlice ──transfer──→ 0xBob                       │
│    REVERTED: from ≠ 0x0 AND to ≠ 0x0                 │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### 🎛️ Toggling Soulbound

Owner dapat toggle soulbound status:

```javascript
// Check current status
const isSoulBound = await voterBadgeNFT.isSoulBound();
console.log("Soulbound:", isSoulBound); // true or false

// Toggle (if owner)
await voterBadgeNFT.toggleSoulBound();

// Result:
// true → false (NFTs now transferable)
// false → true (NFTs now locked)
```

**⚠️ Important:**
- Toggle affects **ALL** NFTs, not just new ones
- Existing holders will be affected
- Be careful when toggling after NFTs are minted

---

### 🤔 When to Use Soulbound?

| Use Case | Soulbound? | Reason |
|----------|-----------|--------|
| **Proof of Participation** | ✅ YES | Badge should stay with voter |
| **Achievement Badges** | ✅ YES | Personal achievement, tidak bisa di-trade |
| **Collectible/Art NFTs** | ❌ NO | Users mungkin ingin trade/sell |
| **Tickets** | ❌ NO | Users mungkin ingin transfer/resell |
| **Reputation Tokens** | ✅ YES | Reputation harus personal |

**Recommendation untuk Voting System:** ✅ **Soulbound = true**

---

## 6. NFT Authorization System

### 🔐 Why Authorization?

**Problem:**
```
❌ Anyone can call mintBadge() → spam NFTs → system broken
❌ Users can mint badges without voting → fraud
```

**Solution: Authorization System**
```
✅ Only VotingSystem contract can mint badges
✅ VotingSystem only mints after successful vote reveal
✅ Two-layer protection
```

---

### 🏗️ Authorization Architecture

```
┌────────────────────────────────────────┐
│         VoterBadgeNFT Contract         │
├────────────────────────────────────────┤
│                                         │
│  authorizedMinters mapping:             │
│  ├─ 0xVotingSystem → true ✅           │
│  ├─ 0xRandomUser → false ❌            │
│  └─ 0xOwner → special (always true) ✅  │
│                                         │
│  modifier onlyAuthorizedMinter {        │
│    require(                             │
│      authorizedMinters[msg.sender] ||   │
│      msg.sender == owner()              │
│    );                                   │
│  }                                      │
│                                         │
│  function mintBadge()                   │
│    onlyAuthorizedMinter ◄───────────┐  │
│  { ... }                             │  │
│                                      │  │
└──────────────────────────────────────┼──┘
                                       │
                                       │
┌──────────────────────────────────────┼──┐
│         VotingSystem Contract        │  │
├──────────────────────────────────────┼──┤
│                                      │  │
│  function revealVote() {             │  │
│    // ... verify vote ...            │  │
│                                      │  │
│    // Call NFT contract              │  │
│    voterBadgeNFT.mintBadge() ───────┘  │
│  }                                      │
│                                         │
└─────────────────────────────────────────┘
```

---

### 📝 Authorization Functions

#### **1. Authorize Minter**

File: [VoterBadgeNFT.sol:82-88](contracts/VoterBadgeNFT.sol:82-88)

```solidity
function authorizeMinter(address minter) external onlyOwner {
    require(minter != address(0), "Cannot authorize zero address");
    require(!authorizedMinters[minter], "Already authorized");

    authorizedMinters[minter] = true;
    emit MinterAuthorized(minter);
}
```

**Usage:**
```javascript
// After deploying VotingSystem, authorize it
const votingSystemAddress = "0x0e379D9E718b4F0E87DFA48b8c15bAF3440F0bfF";

await voterBadgeNFT.authorizeMinter(votingSystemAddress);
// Now VotingSystem can mint badges
```

---

#### **2. Revoke Minter**

```solidity
function revokeMinter(address minter) external onlyOwner {
    require(authorizedMinters[minter], "Not authorized");

    authorizedMinters[minter] = false;
    emit MinterRevoked(minter);
}
```

**Usage:**
```javascript
// Revoke authorization (e.g., if VotingSystem is upgraded)
await voterBadgeNFT.revokeMinter(oldVotingSystemAddress);
```

---

#### **3. Check Authorization**

```javascript
// Check if address is authorized
const isAuthorized = await voterBadgeNFT.authorizedMinters(votingSystemAddress);
console.log("Authorized:", isAuthorized); // true or false
```

---

### 🛡️ Security Implications

**Who Can Mint:**
1. ✅ **Owner** - Always can mint (backup/emergency)
2. ✅ **Authorized Minters** - VotingSystem contract
3. ❌ **Others** - Rejected

**Attack Scenarios:**

| Attack | Protection |
|--------|-----------|
| User calls mintBadge directly | ❌ Reverted: "Not authorized to mint" |
| Malicious contract calls mintBadge | ❌ Reverted: Not in authorizedMinters |
| User tries to mint without voting | ❌ Only VotingSystem can call, and it checks vote first |
| Owner abuse (mints fake badges) | ⚠️ Trust in owner (could implement timelock/multisig) |

---

## 7. Managing NFT Metadata

### 📝 Setting Base URI

```javascript
// Set base URI untuk event baru
const eventId = 1;
const baseURI = "ipfs://QmPresidentialElection2024/";

await voterBadgeNFT.setEventBaseURI(eventId, baseURI);
```

**Important:**
- Harus di-set **sebelum** NFT di-mint untuk event tersebut
- Bisa di-update kapan saja (owner only)
- Affects future mints dan existing tokens (jika using ERC721URIStorage)

---

### 🔄 Updating Metadata

#### **Option 1: Update Base URI (Affects All Tokens)**

```javascript
// Update base URI untuk event
await voterBadgeNFT.setEventBaseURI(1, "ipfs://QmNewMetadata/");

// All tokens for event 1 now point to new metadata
// Token #1: ipfs://QmNewMetadata/1
// Token #2: ipfs://QmNewMetadata/2
```

**Use Case:**
- Fix typo in metadata
- Upgrade image quality
- Add new attributes

**⚠️ Warning:** Changes affect existing tokens!

---

#### **Option 2: Per-Token URI (Advanced)**

Not implemented by default, but could add:

```solidity
// Add this function to VoterBadgeNFT
function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
    require(_ownerOf(tokenId) != address(0), "Token does not exist");
    _setTokenURI(tokenId, uri);
}
```

---

### 🖼️ Preparing Metadata Files

**Example: Presidential Election 2024**

```bash
# Directory structure
metadata/event1/
├── 1.json          # Token #1 metadata
├── 2.json          # Token #2 metadata
├── 3.json          # Token #3 metadata
├── ...
└── images/
    └── badge.png   # Shared badge image
```

**1.json:**
```json
{
  "name": "Presidential Election 2024 - Voter #1",
  "description": "Proof of participation in Presidential Election 2024",
  "image": "ipfs://QmImageCID/badge.png",
  "attributes": [
    {"trait_type": "Event", "value": "Presidential Election 2024"},
    {"trait_type": "Token ID", "value": "1"},
    {"trait_type": "Event ID", "value": "1"}
  ]
}
```

**2.json, 3.json, ...**: Same structure, different token IDs

---

### 📤 Upload Process

#### **Using Pinata (IPFS):**

```bash
# 1. Install Pinata CLI or use web UI
npm install -g @pinata/sdk

# 2. Upload folder
pinata upload metadata/event1/

# 3. Get CID
# Output: QmPresidentialElection2024

# 4. Set in contract
await voterBadgeNFT.setEventBaseURI(1, "ipfs://QmPresidentialElection2024/");
```

#### **Using NFT.Storage (Free IPFS):**

```bash
# 1. Sign up at nft.storage
# 2. Upload via web UI or API
# 3. Get IPFS URL
# 4. Set in contract
```

---

## 8. Use Cases & Examples

### 🎯 Use Case 1: Multiple Events with Different Badges

```javascript
// Event 1: Presidential Election
await voterBadgeNFT.setEventBaseURI(1, "ipfs://QmPresidential/");

// Event 2: City Mayor Election
await voterBadgeNFT.setEventBaseURI(2, "ipfs://QmCityMayor/");

// Event 3: School Board Election
await voterBadgeNFT.setEventBaseURI(3, "ipfs://QmSchoolBoard/");

// Each event has unique badge design!
// Token #1 (Event 1) looks different from Token #5 (Event 2)
```

---

### 🎯 Use Case 2: Rarity Tiers (Early Voter Bonus)

**Concept:** First 100 voters get "Legendary" badge

```json
// Metadata for tokens 1-100 (early voters)
{
  "name": "Presidential Election 2024 - Early Voter",
  "image": "ipfs://QmGoldenBadge.png",
  "attributes": [
    {"trait_type": "Rarity", "value": "Legendary"},
    {"trait_type": "Early Voter", "value": "Yes"}
  ]
}

// Metadata for tokens 101+ (regular voters)
{
  "name": "Presidential Election 2024 - Voter",
  "image": "ipfs://QmSilverBadge.png",
  "attributes": [
    {"trait_type": "Rarity", "value": "Common"}
  ]
}
```

**Implementation:** Generate different metadata files based on token ID

---

### 🎯 Use Case 3: Check if User Already Has Badge

```javascript
// Before showing "Vote Now" button, check if user already has badge

const eventId = 1;
const userAddress = await signer.getAddress();

const hasBadge = await voterBadgeNFT.hasBadgeForEvent(userAddress, eventId);

if (hasBadge) {
  // Show: "You already participated! View your badge"
  const tokenId = await voterBadgeNFT.getBadgeTokenId(userAddress, eventId);
  console.log(`User owns token #${tokenId}`);
} else {
  // Show: "Vote Now" button
}
```

---

### 🎯 Use Case 4: Display User's Badge Collection

```javascript
// Get all badges for a user (frontend code)

async function getUserBadges(userAddress) {
  const balance = await voterBadgeNFT.balanceOf(userAddress);
  const badges = [];

  for (let i = 0; i < balance; i++) {
    const tokenId = await voterBadgeNFT.tokenOfOwnerByIndex(userAddress, i);
    const eventId = await voterBadgeNFT.getEventId(tokenId);
    const tokenURI = await voterBadgeNFT.tokenURI(tokenId);

    // Fetch metadata from IPFS/server
    const response = await fetch(tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/'));
    const metadata = await response.json();

    badges.push({
      tokenId,
      eventId,
      name: metadata.name,
      image: metadata.image,
      attributes: metadata.attributes
    });
  }

  return badges;
}

// Usage
const badges = await getUserBadges("0xAlice...");
console.log(`Alice has ${badges.length} badges`);
badges.forEach(badge => {
  console.log(`- ${badge.name} (Token #${badge.tokenId})`);
});
```

---

### 🎯 Use Case 5: Batch Mint for Testing

```javascript
// Mint badges untuk multiple test users sekaligus

const voters = [
  "0xAlice...",
  "0xBob...",
  "0xCharlie..."
];

const eventIds = [1, 1, 1]; // All for event 1

// Must be authorized minter (owner or VotingSystem)
await voterBadgeNFT.batchMintBadges(voters, eventIds);

// Result: 3 NFTs minted in one transaction (gas efficient!)
```

---

## 9. NFT Management Scripts

### 📝 Script 1: Check NFT Balances

File: `scripts/check-nft-balances.js`

```javascript
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🎨 Checking NFT Balances...\n");

  const VOTER_BADGE_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS;

  const [signer] = await ethers.getSigners();
  const VoterBadgeNFT = await ethers.getContractFactory("VoterBadgeNFT");
  const voterBadgeNFT = VoterBadgeNFT.attach(VOTER_BADGE_NFT_ADDRESS);

  // Check signer's balance
  const balance = await voterBadgeNFT.balanceOf(signer.address);
  console.log(`📊 ${signer.address} owns ${balance} NFT(s)\n`);

  // Check specific event
  const eventId = 1;
  const hasBadge = await voterBadgeNFT.hasBadgeForEvent(signer.address, eventId);

  if (hasBadge) {
    const tokenId = await voterBadgeNFT.getBadgeTokenId(signer.address, eventId);
    const tokenURI = await voterBadgeNFT.tokenURI(tokenId);

    console.log(`✅ You have badge for Event #${eventId}`);
    console.log(`   Token ID: #${tokenId}`);
    console.log(`   Token URI: ${tokenURI}`);
  } else {
    console.log(`❌ You don't have badge for Event #${eventId}`);
  }

  // Check total supply
  const totalSupply = await voterBadgeNFT.totalSupply();
  console.log(`\n📈 Total NFTs minted: ${totalSupply}`);

  // Check soulbound status
  const isSoulBound = await voterBadgeNFT.isSoulBound();
  console.log(`🔗 Soulbound: ${isSoulBound ? 'Yes (cannot transfer)' : 'No (transferable)'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
```

---

### 📝 Script 2: Set Event Metadata

File: `scripts/set-event-metadata.js`

```javascript
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🎨 Setting Event Metadata...\n");

  const VOTER_BADGE_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS;

  const [signer] = await ethers.getSigners();
  const VoterBadgeNFT = await ethers.getContractFactory("VoterBadgeNFT");
  const voterBadgeNFT = VoterBadgeNFT.attach(VOTER_BADGE_NFT_ADDRESS);

  // Configure events
  const events = [
    {
      id: 1,
      name: "Presidential Election 2024",
      baseURI: "ipfs://QmPresidentialElection2024/"
    },
    {
      id: 2,
      name: "City Mayor Election 2024",
      baseURI: "ipfs://QmCityMayorElection2024/"
    },
    {
      id: 3,
      name: "School Board Election 2024",
      baseURI: "ipfs://QmSchoolBoardElection2024/"
    }
  ];

  // Set base URI for each event
  for (const event of events) {
    console.log(`📝 Setting metadata for Event #${event.id}: ${event.name}`);
    console.log(`   Base URI: ${event.baseURI}`);

    const tx = await voterBadgeNFT.setEventBaseURI(event.id, event.baseURI);
    await tx.wait();

    console.log(`   ✅ Transaction: ${tx.hash}\n`);
  }

  console.log("✅ All event metadata set successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
```

---

### 📝 Script 3: Authorize Minter

File: `scripts/authorize-minter.js`

```javascript
const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔐 Authorizing Minter...\n");

  const VOTER_BADGE_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_BADGE_NFT_ADDRESS;
  const VOTING_SYSTEM_ADDRESS = process.env.NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS;

  const VoterBadgeNFT = await ethers.getContractFactory("VoterBadgeNFT");
  const voterBadgeNFT = VoterBadgeNFT.attach(VOTER_BADGE_NFT_ADDRESS);

  // Check if already authorized
  const isAuthorized = await voterBadgeNFT.authorizedMinters(VOTING_SYSTEM_ADDRESS);

  if (isAuthorized) {
    console.log("✅ VotingSystem is already authorized");
    return;
  }

  // Authorize
  console.log(`📝 Authorizing: ${VOTING_SYSTEM_ADDRESS}`);
  const tx = await voterBadgeNFT.authorizeMinter(VOTING_SYSTEM_ADDRESS);
  console.log(`⏳ Transaction sent: ${tx.hash}`);

  await tx.wait();
  console.log("✅ VotingSystem authorized successfully!");

  // Verify
  const verified = await voterBadgeNFT.authorizedMinters(VOTING_SYSTEM_ADDRESS);
  console.log(`🔍 Verification: ${verified ? 'PASSED' : 'FAILED'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
```

---

## 10. Troubleshooting

### ❌ Error: "Not authorized to mint"

**Cause:** VotingSystem belum di-authorize sebagai minter

**Solution:**
```javascript
await voterBadgeNFT.authorizeMinter(votingSystemAddress);
```

---

### ❌ Error: "Voter already has badge for this event"

**Cause:** User sudah punya NFT untuk event ini

**Check:**
```javascript
const hasBadge = await voterBadgeNFT.hasBadgeForEvent(userAddress, eventId);
console.log("Has badge:", hasBadge);
```

**Solution:** This is expected behavior (one badge per user per event)

---

### ❌ Error: "NFT is soul-bound and cannot be transferred"

**Cause:** Trying to transfer soulbound NFT

**Solution:**
```javascript
// Option 1: Toggle soulbound (owner only)
await voterBadgeNFT.toggleSoulBound();

// Option 2: Burn instead of transfer
await voterBadgeNFT.burn(tokenId);
```

---

### ❌ NFT Image Not Showing in Wallet

**Possible Causes:**

1. **Metadata not uploaded to IPFS/server**
   - Check base URI is set
   - Verify files exist at that URI

2. **Wrong URI format**
   ```javascript
   // ❌ Wrong
   "https://ipfs.io/ipfs/QmXyz/1.json"  // Missing .json in base

   // ✅ Correct
   "ipfs://QmXyz/"  // Contract adds token ID automatically
   ```

3. **IPFS gateway slow**
   - Try different gateway: `https://gateway.pinata.cloud/ipfs/...`
   - Or use Cloudflare: `https://cloudflare-ipfs.com/ipfs/...`

4. **Wallet cache**
   - Wait 5-10 minutes
   - Or refresh metadata on OpenSea: "Refresh metadata" button

---

### ⚠️ Metadata Shows Wrong Information

**Solution:**

```javascript
// Update base URI
await voterBadgeNFT.setEventBaseURI(eventId, "ipfs://QmNewCID/");

// Wait 10-15 minutes for wallets/marketplaces to refresh
// Or manually refresh on OpenSea
```

---

## 📚 Summary

### Key Concepts:
1. **NFT = Unique digital badge** untuk setiap voter per event
2. **Auto-minted** saat user reveal vote
3. **Metadata** stored off-chain (IPFS recommended)
4. **Soulbound** = Cannot transfer (recommended for voting badges)
5. **Authorization** = Only VotingSystem can mint

### Important Functions:
- `mintBadge()` - Mint NFT to voter (called by VotingSystem)
- `setEventBaseURI()` - Set metadata URI for event
- `authorizeMinter()` - Allow contract to mint
- `hasBadgeForEvent()` - Check if user has badge
- `toggleSoulBound()` - Enable/disable transfers

### Best Practices:
- ✅ Set base URI before event starts
- ✅ Use IPFS for decentralization
- ✅ Enable soulbound for proof of participation
- ✅ Test metadata display before launch
- ✅ Keep metadata files organized

---

**Need More Help?**
- See [DEMO_DAY_PRESENTATION.md](DEMO_DAY_PRESENTATION.md) for overall system
- See [MINTING_BURNING_GUIDE.md](MINTING_BURNING_GUIDE.md) for token operations
- See [CONTRACTS_README.md](CONTRACTS_README.md) for full API reference

Happy NFT Building! 🎨🚀
