# E-Voting API Documentation

## Prerequisites
1. Make sure your Next.js server is running: `npm run dev`
2. Set environment variables in `.env.local`:
   ```
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   DATABASE_URL=your-database-connection-string
   ```

## 🔐 Authentication APIs

### 1. Register Voter
**Endpoint:** `POST /api/auth/register`

**Description:** Create a new voter account with wallet ID

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "0x742d35Cc6635C0532925a3b8D37C2dCF8C6f5F7E",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Voter registered successfully",
  "user": {
    "id": 1,
    "walletId": "0x742d35cc6635c0532925a3b8d37c2dcf8c6f5f7e",
    "name": "John Doe"
  }
}
```

---

### 2. Login (Simplified)
**Endpoint:** `POST /api/auth/login`

**Description:** Login with wallet ID only (simplified authentication)

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletId": "0x742d35Cc6635C0532925a3b8D37C2dCF8C6f5F7E"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "walletId": "0x742d35cc6635c0532925a3b8d37c2dcf8c6f5f7e",
    "name": "John Doe"
  }
}
```

---

### 3. Logout (Secure Token Invalidation)
**Endpoint:** `POST /api/auth/logout`

**Description:** Logout and invalidate JWT token on server-side

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully and token invalidated"
}
```

---

## 🗳️ Event Management APIs

### 1. Get All Events (Protected)
**Endpoint:** `GET /api/events`

**Description:** Get all events (requires authentication)

**Request:**
```bash
curl -X GET http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Presidential Election",
      "description": "National presidential election",
      "startTime": "2025-12-01T10:00:00.000Z",
      "endTime": "2025-12-01T18:00:00.000Z",
      "createdBy": "0x123456789",
      "blockAddress": null,
      "isActive": true,
      "createdAt": "2025-11-05T07:05:09.388Z",
      "updatedAt": "2025-11-05T08:02:44.256Z",
      "candidates": [],
      "votes": []
    }
  ],
  "user": {
    "id": 1,
    "walletId": "0x123456789"
  }
}
```

---

### 2. Get Event Details
**Endpoint:** `GET /api/events/[id]`

**Description:** Get specific event by ID (no authentication required)

**Request:**
```bash
curl -X GET http://localhost:3000/api/events/1 \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Presidential Election",
    "description": "National presidential election",
    "startTime": "2025-12-01T10:00:00.000Z",
    "endTime": "2025-12-01T18:00:00.000Z",
    "createdBy": "0x123456789",
    "blockAddress": null,
    "isActive": true,
    "createdAt": "2025-11-05T07:05:09.388Z",
    "updatedAt": "2025-11-05T08:02:44.256Z",
    "candidates": [],
    "votes": []
  }
}
```

---

### 3. Create New Event (Protected)
**Endpoint:** `POST /api/events`

**Description:** Create a new event (requires authentication, auto-assigns creator)

**Request:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Local Election 2025",
    "description": "Municipal election for mayor and council",
    "startTime": "2025-12-15T09:00:00Z",
    "endTime": "2025-12-15T18:00:00Z",
    "blockAddress": "0xabc123def456"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Local Election 2025",
    "description": "Municipal election for mayor and council",
    "startTime": "2025-12-15T09:00:00.000Z",
    "endTime": "2025-12-15T18:00:00.000Z",
    "createdBy": "0x123456789",
    "blockAddress": "0xabc123def456",
    "isActive": true,
    "createdAt": "2025-11-05T07:05:09.388Z",
    "updatedAt": "2025-11-05T07:05:09.388Z"
  },
  "createdBy": "0x123456789"
}
```

---

### 4. Update Event (Protected + Creator Only)
**Endpoint:** `PUT /api/events/[id]`

**Description:** Update event (requires authentication, only creator can update)

**Request:**
```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Updated Local Election 2025",
    "description": "Updated description",
    "isActive": true
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Updated Local Election 2025",
    "description": "Updated description",
    "startTime": "2025-12-15T09:00:00.000Z",
    "endTime": "2025-12-15T18:00:00.000Z",
    "createdBy": "0x123456789",
    "blockAddress": "0xabc123def456",
    "isActive": true,
    "createdAt": "2025-11-05T07:05:09.388Z",
    "updatedAt": "2025-11-05T08:30:15.123Z"
  }
}
```

---

### 5. Delete Event (Protected + Creator Only)
**Endpoint:** `DELETE /api/events/[id]`

**Description:** Delete event (requires authentication, only creator can delete)

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

## 🔒 Security Features

### Authentication Requirements
- **Protected endpoints**: GET/POST `/api/events`, PUT/DELETE `/api/events/[id]`
- **Public endpoints**: GET `/api/events/[id]`, POST `/api/auth/*`
- **JWT Token**: Required in `Authorization: Bearer TOKEN` header
- **Token Blacklisting**: Logout invalidates tokens server-side

### Authorization Rules
- **Event Creation**: Any authenticated user can create events
- **Event Updates**: Only the event creator can update their events
- **Event Deletion**: Only the event creator can delete their events
- **Creator Validation**: Based on `user.walletId` matching `event.createdBy`

---

## 📝 Complete Workflow Example

```bash
# 1. Register (if wallet doesn't exist)
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"walletId": "0x123456789", "name": "Alice"}'

# 2. Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletId": "0x123456789"}' | \
  jq -r '.token')

# 3. Create an event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Election",
    "description": "A test election",
    "startTime": "2025-12-01T10:00:00Z",
    "endTime": "2025-12-01T18:00:00Z"
  }'

# 4. Get all events (protected)
curl -X GET http://localhost:3000/api/events \
  -H "Authorization: Bearer $TOKEN"

# 5. Update the event (assuming ID is 3)
curl -X PUT http://localhost:3000/api/events/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "Updated Test Election"}'

# 6. Logout and invalidate token
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Error Responses

### Authentication Errors
```json
// Missing token
{
  "success": false,
  "error": "Access token required"
}

// Invalid/expired token
{
  "success": false,
  "error": "Invalid or expired token"
}

// Token blacklisted after logout
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### Authorization Errors
```json
// Not the event creator
{
  "success": false,
  "error": "Only the event creator can update this event"
}

// Event not found
{
  "success": false,
  "error": "Event not found"
}
```

### Validation Errors
```json
// Missing required fields
{
  "success": false,
  "error": "Missing required fields: name, description, startTime, endTime"
}

// Invalid datetime
{
  "success": false,
  "error": "Invalid datetime format for startTime"
}

// End time before start time
{
  "success": false,
  "error": "endTime must be after startTime"
}
```

---

## 🛠️ Frontend Integration

### Basic Authentication Flow
```javascript
// Store token after login
localStorage.setItem('authToken', loginResponse.token);

// Make authenticated requests
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('authToken');
  
  return fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
}

// Usage examples
const events = await apiCall('/events');
const newEvent = await apiCall('/events', {
  method: 'POST',
  body: JSON.stringify({
    name: 'My Election',
    description: 'Test election',
    startTime: '2025-12-01T10:00:00Z',
    endTime: '2025-12-01T18:00:00Z'
  })
});
```

---

## 📊 HTTP Status Codes

- **200**: Success
- **201**: Created (new event)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (not authorized, e.g., not event creator)
- **404**: Not Found (event doesn't exist)
- **409**: Conflict (wallet already registered)
- **500**: Internal Server Error

---

**Note**: Replace `YOUR_JWT_TOKEN_HERE` with actual tokens from login responses.

---

## Frontend JavaScript Examples

### Complete Authentication Flow
```javascript
// 1. Connect to MetaMask and get wallet address
async function connectWallet() {
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    return accounts[0];
  }
  throw new Error('MetaMask not found');
}

// 2. Get nonce from server
async function getNonce(walletAddress) {
  const response = await fetch('/api/auth/nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress })
  });
  
  const data = await response.json();
  return data.nonce;
}

// 3. Sign message with MetaMask
async function signMessage(walletAddress, nonce) {
  const message = `Welcome to E-Voting System!

Wallet: ${walletAddress}
Nonce: ${nonce}

This request will not trigger a blockchain transaction or cost any gas fees.`;

  const signature = await window.ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress]
  });
  
  return signature;
}

// 4. Login with signature
async function login(walletAddress, signature) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress, signature })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store token in localStorage
    localStorage.setItem('authToken', data.token);
    return data;
  }
  
  throw new Error(data.error || 'Login failed');
}

// 5. Complete authentication flow
async function authenticateUser() {
  try {
    // Step 1: Connect wallet
    const walletAddress = await connectWallet();
    console.log('Connected wallet:', walletAddress);
    
    // Step 2: Get nonce
    const nonce = await getNonce(walletAddress);
    console.log('Received nonce:', nonce);
    
    // Step 3: Sign message
    const signature = await signMessage(walletAddress, nonce);
    console.log('Message signed');
    
    // Step 4: Login
    const result = await login(walletAddress, signature);
    console.log('Login successful:', result);
    
    return result;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

// 6. Make authenticated API calls
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('authToken');
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

// Example usage:
// authenticateUser().then(() => {
//   console.log('User authenticated successfully');
// });
```

---

## Testing with Postman

### Collection Setup
1. Create a new Postman collection called "E-Voting Auth API"
2. Add environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `walletAddress`: `0x742d35Cc6635C0532925a3b8D37C2dCF8C6f5F7E`
   - `authToken`: (will be set after login)

### Request Sequence
1. **Get Nonce**
   - Method: POST
   - URL: `{{baseUrl}}/api/auth/nonce`
   - Body: `{"walletAddress": "{{walletAddress}}"}`

2. **Login** (requires actual signature from MetaMask)
   - Method: POST
   - URL: `{{baseUrl}}/api/auth/login`
   - Body: `{"walletAddress": "{{walletAddress}}", "signature": "ACTUAL_SIGNATURE"}`

3. **Test Protected Route**
   - Method: POST
   - URL: `{{baseUrl}}/api/events`
   - Headers: `Authorization: Bearer {{authToken}}`

---

## Error Responses

### Common Error Cases
```json
// Missing wallet address
{
  "error": "Wallet address is required"
}

// Invalid signature
{
  "error": "Invalid signature"
}

// Missing authentication
{
  "success": false,
  "error": "Access token required"
}

// Expired token
{
  "success": false,
  "error": "Invalid or expired token"
}
```

---

## Notes
- Replace `YOUR_JWT_TOKEN_HERE` with the actual token received from login
- The signature in the login example needs to be generated by MetaMask
- Make sure your database is running and accessible
- For testing without MetaMask, you'll need to generate valid signatures using ethers.js