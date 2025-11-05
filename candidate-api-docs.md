# Candidate API Documentation

## Base URL
`http://localhost:3000/api`

## Authentication
All write operations (POST, PUT, DELETE) require JWT authentication.
Include the token in the Authorization header: `Authorization: Bearer YOUR_JWT_TOKEN`

---

## 📋 Candidate Endpoints

### 1. Get All Candidates by Event ID
**Endpoint:** `GET /api/candidates?eventId={eventId}`

**Description:** Retrieve all candidates for a specific event

**Authentication:** Not required

**Query Parameters:**
- `eventId` (required): The ID of the event

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/candidates?eventId=1" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Smith",
      "eventId": 1,
      "createdAt": "2025-11-05T10:00:00.000Z",
      "updatedAt": "2025-11-05T10:00:00.000Z",
      "event": {
        "id": 1,
        "name": "Presidential Election",
        "isActive": true
      },
      "votes": [
        {
          "id": 1,
          "voterId": 2,
          "createdAt": "2025-11-05T11:00:00.000Z"
        }
      ]
    },
    {
      "id": 2,
      "name": "Jane Doe",
      "eventId": 1,
      "createdAt": "2025-11-05T10:05:00.000Z",
      "updatedAt": "2025-11-05T10:05:00.000Z",
      "event": {
        "id": 1,
        "name": "Presidential Election",
        "isActive": true
      },
      "votes": []
    }
  ],
  "meta": {
    "eventId": 1,
    "eventName": "Presidential Election",
    "totalCandidates": 2
  }
}
```

---

### 2. Get Candidate by ID
**Endpoint:** `GET /api/candidates/{id}`

**Description:** Retrieve a specific candidate by ID

**Authentication:** Not required

**Path Parameters:**
- `id` (required): The ID of the candidate

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/candidates/1" \
  -H "Content-Type: application/json"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Smith",
    "eventId": 1,
    "createdAt": "2025-11-05T10:00:00.000Z",
    "updatedAt": "2025-11-05T10:00:00.000Z",
    "event": {
      "id": 1,
      "name": "Presidential Election",
      "isActive": true,
      "createdBy": "0x123456789"
    },
    "votes": [
      {
        "id": 1,
        "voterId": 2,
        "eventId": 1,
        "candidateId": 1,
        "createdAt": "2025-11-05T11:00:00.000Z",
        "voter": {
          "id": 2,
          "name": "Alice Johnson",
          "walletId": "0xabc123def456"
        }
      }
    ]
  }
}
```

---

### 3. Create New Candidate
**Endpoint:** `POST /api/candidates`

**Description:** Create a new candidate for an event

**Authentication:** Required (only event creator can add candidates)

**Request Body:**
```json
{
  "name": "Candidate Name",
  "eventId": 1
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:3000/api/candidates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Alice Johnson",
    "eventId": 1
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Alice Johnson",
    "eventId": 1,
    "createdAt": "2025-11-05T12:00:00.000Z",
    "updatedAt": "2025-11-05T12:00:00.000Z",
    "event": {
      "id": 1,
      "name": "Presidential Election",
      "createdBy": "0x123456789"
    }
  },
  "message": "Candidate created successfully"
}
```

---

### 4. Update Candidate
**Endpoint:** `PUT /api/candidates/{id}`

**Description:** Update an existing candidate

**Authentication:** Required (only event creator can update candidates)

**Path Parameters:**
- `id` (required): The ID of the candidate to update

**Request Body:**
```json
{
  "name": "Updated Candidate Name"
}
```

**Example Request:**
```bash
curl -X PUT "http://localhost:3000/api/candidates/3" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Alice Johnson Smith"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "name": "Alice Johnson Smith",
    "eventId": 1,
    "createdAt": "2025-11-05T12:00:00.000Z",
    "updatedAt": "2025-11-05T12:30:00.000Z",
    "event": {
      "id": 1,
      "name": "Presidential Election",
      "createdBy": "0x123456789"
    }
  },
  "message": "Candidate updated successfully"
}
```

---

### 5. Delete Candidate
**Endpoint:** `DELETE /api/candidates/{id}`

**Description:** Delete a candidate (only if no votes exist)

**Authentication:** Required (only event creator can delete candidates)

**Path Parameters:**
- `id` (required): The ID of the candidate to delete

**Example Request:**
```bash
curl -X DELETE "http://localhost:3000/api/candidates/3" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Candidate deleted successfully"
}
```

---

## 🔒 Security & Authorization

### Access Control Rules:
1. **Read Operations (GET)**: Public - no authentication required
2. **Create Candidate**: Only event creators can add candidates to their events
3. **Update Candidate**: Only event creators can modify candidates in their events
4. **Delete Candidate**: Only event creators can delete candidates from their events
5. **Vote Protection**: Candidates with existing votes cannot be deleted

### Validation Rules:
1. **Unique Names**: Candidate names must be unique within each event
2. **Event Validation**: Event must exist before adding candidates
3. **Creator Verification**: User must be the event creator for write operations
4. **Vote Integrity**: Candidates with votes cannot be deleted

---

## ❌ Error Responses

### Authentication Errors
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### Authorization Errors
```json
{
  "success": false,
  "error": "Only the event creator can add candidates"
}
```

### Validation Errors
```json
{
  "success": false,
  "error": "Missing required fields: name, eventId"
}

{
  "success": false,
  "error": "Candidate with this name already exists in this event"
}

{
  "success": false,
  "error": "Cannot delete candidate with existing votes"
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
  "error": "Candidate not found"
}
```

---

## 🛠️ Complete Workflow Example

```bash
# 1. Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletId": "0x123456789"}' | \
  jq -r '.token')

# 2. Create an event first (if needed)
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Local Election",
    "description": "City mayor election",
    "startTime": "2025-12-01T10:00:00Z",
    "endTime": "2025-12-01T18:00:00Z"
  }'

# 3. Add candidates to the event (assuming event ID is 1)
curl -X POST http://localhost:3000/api/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Smith",
    "eventId": 1
  }'

curl -X POST http://localhost:3000/api/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Jane Doe",
    "eventId": 1
  }'

# 4. Get all candidates for the event
curl -X GET "http://localhost:3000/api/candidates?eventId=1" \
  -H "Content-Type: application/json"

# 5. Update a candidate (assuming candidate ID is 1)
curl -X PUT http://localhost:3000/api/candidates/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "John Smith Jr."
  }'

# 6. Get specific candidate details
curl -X GET http://localhost:3000/api/candidates/1 \
  -H "Content-Type: application/json"

# 7. Delete a candidate (only if no votes)
curl -X DELETE http://localhost:3000/api/candidates/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 HTTP Status Codes

- **200**: Success (GET, PUT)
- **201**: Created (POST)
- **400**: Bad Request (validation errors, missing parameters)
- **401**: Unauthorized (authentication required)
- **403**: Forbidden (not authorized - not event creator)
- **404**: Not Found (candidate/event doesn't exist)
- **409**: Conflict (duplicate name, candidate has votes)
- **500**: Internal Server Error

---

## 💡 Frontend Integration Tips

### React Example:
```javascript
const API_BASE = '/api';

// Get candidates for an event
const getCandidates = async (eventId) => {
  const response = await fetch(`${API_BASE}/candidates?eventId=${eventId}`);
  return response.json();
};

// Create new candidate
const createCandidate = async (candidateData, token) => {
  const response = await fetch(`${API_BASE}/candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(candidateData)
  });
  return response.json();
};

// Update candidate
const updateCandidate = async (candidateId, updateData, token) => {
  const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updateData)
  });
  return response.json();
};

// Delete candidate
const deleteCandidate = async (candidateId, token) => {
  const response = await fetch(`${API_BASE}/candidates/${candidateId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};
```