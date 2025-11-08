# Vote API Documentation

## Base URL
`http://localhost:3000/api`

## Authentication
**POST** operations require JWT authentication from registered voters.
Include the token in the Authorization header: `Authorization: Bearer YOUR_JWT_TOKEN`

---

## 🗳️ Vote Endpoints

### 1. Cast a Vote
**Endpoint:** `POST /api/votes`

**Description:** Cast a vote for a candidate in a specific event (one vote per voter per event)

**Authentication:** Required (registered voters only)

**Request Body:**
```json
{
  "eventId": 1,
  "candidateId": 2
}
```

**Business Rules:**
- ✅ **One Vote Per Event:** Each voter can only vote once per event
- ✅ **Voter Registration:** User must be registered as a voter
- ✅ **Event Active:** Event must be active and within voting period
- ✅ **Candidate Validation:** Candidate must exist and belong to the event
- ✅ **Blockchain Address:** Returns hardcoded blockAddress (placeholder for NFT minting)

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/votes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventId": 1,
    "candidateId": 2
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "voterId": 3,
    "eventId": 1,
    "candidateId": 2,
    "blockAddress": "0xa1b2c3d4e5f6789012345678901234567890abcd",
    "createdAt": "2025-11-05T15:30:00.000Z",
    "updatedAt": "2025-11-05T15:30:00.000Z",
    "voter": {
      "id": 3,
      "name": "Alice Johnson",
      "walletId": "0xabc123def456"
    },
    "candidate": {
      "id": 2,
      "name": "Jane Doe"
    },
    "event": {
      "id": 1,
      "name": "Presidential Election"
    }
  },
  "message": "Vote cast successfully",
  "blockAddress": "0xa1b2c3d4e5f6789012345678901234567890abcd"
}
```

---

### 2. Get Votes by Event
**Endpoint:** `GET /api/votes?eventId={eventId}`

**Description:** Retrieve all votes for a specific event with vote summary

**Authentication:** Not required

**Query Parameters:**
- `eventId` (required): The ID of the event

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/votes?eventId=1" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "voterId": 3,
      "eventId": 1,
      "candidateId": 2,
      "blockAddress": "0xa1b2c3d4e5f6789012345678901234567890abcd",
      "createdAt": "2025-11-05T15:30:00.000Z",
      "updatedAt": "2025-11-05T15:30:00.000Z",
      "voter": {
        "id": 3,
        "name": "Alice Johnson",
        "walletId": "0xabc123def456"
      },
      "candidate": {
        "id": 2,
        "name": "Jane Doe"
      },
      "event": {
        "id": 1,
        "name": "Presidential Election"
      }
    },
    {
      "id": 2,
      "voterId": 4,
      "eventId": 1,
      "candidateId": 1,
      "blockAddress": "0xfed456cba987654321098765432109876543210e",
      "createdAt": "2025-11-05T15:45:00.000Z",
      "updatedAt": "2025-11-05T15:45:00.000Z",
      "voter": {
        "id": 4,
        "name": "Bob Smith",
        "walletId": "0xdef789ghi012"
      },
      "candidate": {
        "id": 1,
        "name": "John Smith"
      },
      "event": {
        "id": 1,
        "name": "Presidential Election"
      }
    }
  ],
  "meta": {
    "eventId": 1,
    "eventName": "Presidential Election",
    "totalVotes": 2,
    "voteSummary": [
      {
        "candidateId": 1,
        "candidateName": "John Smith",
        "voteCount": 1
      },
      {
        "candidateId": 2,
        "candidateName": "Jane Doe",
        "voteCount": 1
      }
    ]
  }
}
```

---

### 3. Get Vote by ID
**Endpoint:** `GET /api/votes/{id}`

**Description:** Retrieve detailed information about a specific vote

**Authentication:** Not required

**Path Parameters:**
- `id` (required): The ID of the vote

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/votes/1" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "voterId": 3,
    "eventId": 1,
    "candidateId": 2,
    "blockAddress": "0xa1b2c3d4e5f6789012345678901234567890abcd",
    "createdAt": "2025-11-05T15:30:00.000Z",
    "updatedAt": "2025-11-05T15:30:00.000Z",
    "voter": {
      "id": 3,
      "name": "Alice Johnson",
      "walletId": "0xabc123def456",
      "createdAt": "2025-11-03T10:00:00.000Z"
    },
    "candidate": {
      "id": 2,
      "name": "Jane Doe",
      "createdAt": "2025-11-04T12:00:00.000Z"
    },
    "event": {
      "id": 1,
      "name": "Presidential Election",
      "description": "Annual presidential election",
      "startTime": "2025-11-05T08:00:00.000Z",
      "endTime": "2025-11-05T20:00:00.000Z",
      "createdBy": "0x123456789",
      "isActive": true
    }
  }
}
```

---

## 🔒 Security & Business Logic

### Voting Rules:
1. **Voter Registration Required**: Only registered voters can cast votes
2. **One Vote Per Event**: Each voter can vote only once per event (enforced by unique constraint)
3. **Event Timing**: Votes can only be cast during active voting period
4. **Candidate Validation**: Candidate must exist and belong to the specified event
5. **Blockchain Integration**: Each vote generates a hardcoded blockAddress (placeholder for NFT)

### Authentication Requirements:
- **Cast Vote**: JWT token required from registered voter
- **View Votes**: Public access (no authentication needed)
- **Token Format**: `Authorization: Bearer <jwt_token>`

### Voting Period Validation:
- **Before Start**: "Voting has not started yet"
- **After End**: "Voting has ended"
- **Inactive Event**: "This event is not active"

---

## ❌ Error Responses

### Authentication Errors
```json
{
  "success": false,
  "error": "Authentication required"
}

{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Authorization Errors
```json
{
  "success": false,
  "error": "You must be a registered voter to cast a vote"
}
```

### Validation Errors
```json
{
  "success": false,
  "error": "Missing required fields: eventId, candidateId"
}

{
  "success": false,
  "error": "You have already voted in this event"
}

{
  "success": false,
  "error": "Voting has not started yet"
}

{
  "success": false,
  "error": "Voting has ended"
}

{
  "success": false,
  "error": "This event is not active"
}
```

### Not Found Errors
```json
{
  "success": false,
  "error": "Event not found"
}

{
  "success": false,
  "error": "Candidate not found in this event"
}

{
  "success": false,
  "error": "Vote not found"
}
```

---

## 🛠️ Complete Voting Workflow Example

```bash
# 1. Register as a voter first (if not already registered)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "walletId": "0xabc123def456"
  }'

# 2. Login to get authentication token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletId": "0xabc123def456"}' | \
  jq -r '.token')

# 3. Check available events
curl -X GET http://localhost:3000/api/events \
  -H "Content-Type: application/json"

# 4. Check candidates for an event (eventId = 1)
curl -X GET "http://localhost:3000/api/candidates?eventId=1" \
  -H "Content-Type: application/json"

# 5. Cast your vote
curl -X POST http://localhost:3000/api/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "eventId": 1,
    "candidateId": 2
  }'

# 6. Check voting results
curl -X GET "http://localhost:3000/api/votes?eventId=1" \
  -H "Content-Type: application/json"

# 7. Get your specific vote details (voteId = 1)
curl -X GET http://localhost:3000/api/votes/1 \
  -H "Content-Type: application/json"

# 8. Try to vote again (should fail with "already voted" error)
curl -X POST http://localhost:3000/api/votes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "eventId": 1,
    "candidateId": 1
  }'
```

---

## 📊 HTTP Status Codes

- **200**: Success (GET operations)
- **201**: Vote Created (POST)
- **400**: Bad Request (validation errors, voting period issues)
- **401**: Unauthorized (authentication required/invalid)
- **403**: Forbidden (not a registered voter)
- **404**: Not Found (event/candidate/vote doesn't exist)
- **409**: Conflict (already voted in this event)
- **500**: Internal Server Error

---

## 🔮 Future NFT Integration Notes

### Current Implementation:
- **Hardcoded blockAddress**: Random 40-character hex string
- **Format**: `0x` + 40 hex characters
- **Purpose**: Placeholder for future blockchain transaction hash

### Planned NFT Integration:
```javascript
// Future implementation will replace hardcoded address with:
const nftMintResult = await mintVoteNFT({
  voter: voter.walletId,
  eventId: eventId,
  candidateId: candidateId,
  metadata: {
    eventName: event.name,
    candidateName: candidate.name,
    timestamp: new Date().toISOString()
  }
});

const blockAddress = nftMintResult.transactionHash;
```

### NFT Metadata Structure:
```json
{
  "name": "Vote NFT - Presidential Election",
  "description": "Vote cast for Jane Doe in Presidential Election",
  "image": "ipfs://vote-nft-image-hash",
  "attributes": [
    {
      "trait_type": "Event",
      "value": "Presidential Election"
    },
    {
      "trait_type": "Candidate",
      "value": "Jane Doe"
    },
    {
      "trait_type": "Vote Date",
      "value": "2025-11-05"
    },
    {
      "trait_type": "Voter Wallet",
      "value": "0xabc123def456"
    }
  ]
}
```

---

## 💡 Frontend Integration Tips

### React/Next.js Example:
```javascript
const API_BASE = '/api';

// Cast a vote
const castVote = async (eventId, candidateId, token) => {
  try {
    const response = await fetch(`${API_BASE}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ eventId, candidateId })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Vote successful - show success message with blockAddress
      console.log('Vote cast! Block address:', result.blockAddress);
      return result;
    } else {
      // Handle voting errors
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Voting failed:', error.message);
    throw error;
  }
};

// Get voting results
const getVotingResults = async (eventId) => {
  const response = await fetch(`${API_BASE}/votes?eventId=${eventId}`);
  const result = await response.json();
  
  if (result.success) {
    return {
      votes: result.data,
      summary: result.meta.voteSummary,
      totalVotes: result.meta.totalVotes
    };
  }
  
  throw new Error(result.error);
};

// Check if user has already voted
const checkIfVoted = async (eventId, userWalletId) => {
  const results = await getVotingResults(eventId);
  return results.votes.some(vote => vote.voter.walletId === userWalletId);
};
```

### Web3 Integration Example:
```javascript
// Future Web3 integration for NFT verification
const verifyVoteNFT = async (blockAddress, userWallet) => {
  try {
    // Connect to blockchain
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_ABI, provider);
    
    // Verify NFT ownership
    const owner = await contract.ownerOf(blockAddress);
    return owner.toLowerCase() === userWallet.toLowerCase();
  } catch (error) {
    console.error('NFT verification failed:', error);
    return false;
  }
};
```