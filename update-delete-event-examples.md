# Update and Delete Event API Examples

## Prerequisites
1. Make sure your Next.js server is running: `npm run dev`
2. You need a valid JWT token from login
3. You can only update/delete events that you created

## Step-by-Step Examples

### Step 1: Login to get a JWT token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletId": "0x123456789"}'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "walletId": "0x123456789",
    "name": "John Doe"
  }
}
```

Copy the token for use in subsequent requests.

---

## UPDATE Event API

### Example 1: Update Event Name Only

```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Updated Election Name"
  }'
```

### Example 2: Update Multiple Fields

```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Presidential Election 2025",
    "description": "Updated description for the presidential election",
    "startTime": "2025-12-15T09:00:00Z",
    "endTime": "2025-12-15T18:00:00Z",
    "isActive": true
  }'
```

### Example 3: Update with Blockchain Address

```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "name": "Blockchain Election",
    "blockAddress": "0xabc123def456",
    "isActive": true
  }'
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "Presidential Election 2025",
    "description": "Updated description for the presidential election",
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

## DELETE Event API

### Example 1: Delete Event

```bash
curl -X DELETE http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Success Response:**
```json
{
  "success": true,
  "message": "Event deleted successfully"
}
```

---

## Error Examples

### 1. Update without authentication

```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -d '{"name": "Unauthorized Update"}'
```

**Error Response:**
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 2. Update event created by different user

```bash
curl -X PUT http://localhost:3000/api/events/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"name": "Trying to update someone else event"}'
```

**Error Response:**
```json
{
  "success": false,
  "error": "Only the event creator can update this event"
}
```

### 3. Update non-existent event

```bash
curl -X PUT http://localhost:3000/api/events/999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{"name": "Update non-existent event"}'
```

**Error Response:**
```json
{
  "success": false,
  "error": "Event not found"
}
```

### 4. Invalid datetime format

```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "startTime": "invalid-date",
    "endTime": "2025-12-15T18:00:00Z"
  }'
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid datetime format for startTime"
}
```

### 5. End time before start time

```bash
curl -X PUT http://localhost:3000/api/events/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -d '{
    "startTime": "2025-12-15T18:00:00Z",
    "endTime": "2025-12-15T09:00:00Z"
  }'
```

**Error Response:**
```json
{
  "success": false,
  "error": "endTime must be after startTime"
}
```

---

## JavaScript/Frontend Examples

### Update Event Function

```javascript
async function updateEvent(eventId, updateData, token) {
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Event updated successfully:', result.data);
      return result.data;
    } else {
      console.error('Update failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
}

// Example usage:
// const token = localStorage.getItem('authToken');
// await updateEvent(2, {
//   name: 'Updated Election',
//   description: 'New description'
// }, token);
```

### Delete Event Function

```javascript
async function deleteEvent(eventId, token) {
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('Event deleted successfully');
      return true;
    } else {
      console.error('Delete failed:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
}

// Example usage:
// const token = localStorage.getItem('authToken');
// await deleteEvent(2, token);
```

---

## Complete Workflow Example

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"walletId": "0x123456789"}' | \
  jq -r '.token')

echo "Token: $TOKEN"

# 2. Create an event first
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Election",
    "description": "Test description",
    "startTime": "2025-12-01T10:00:00Z",
    "endTime": "2025-12-01T18:00:00Z"
  }'

# 3. Update the event (assuming it got ID 3)
curl -X PUT http://localhost:3000/api/events/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Updated Test Election",
    "description": "Updated description"
  }'

# 4. Delete the event
curl -X DELETE http://localhost:3000/api/events/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Important Notes

1. **Authentication Required**: Both UPDATE and DELETE require valid JWT token
2. **Creator Only**: You can only modify events you created
3. **Partial Updates**: UPDATE supports partial updates - only send fields you want to change
4. **Validation**: Start time must be before end time
5. **Status Codes**:
   - 200: Success
   - 400: Bad request (invalid data)
   - 401: Unauthorized (no/invalid token)
   - 403: Forbidden (not the creator)
   - 404: Not found (event doesn't exist)
   - 500: Server error

Replace `YOUR_JWT_TOKEN_HERE` with the actual token received from login.