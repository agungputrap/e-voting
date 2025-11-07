# Row Level Security (RLS) Configuration Guide

## Overview

Row Level Security (RLS) has been successfully enabled on your Supabase database for the e-voting application. This ensures that users can only access and modify data they are authorized to interact with.

---

## What is RLS?

RLS is a PostgreSQL security feature that allows you to control which rows users can access in database tables. With RLS enabled, you define policies that determine:

- **SELECT**: Which rows users can read
- **INSERT**: What data users can create
- **UPDATE**: Which rows users can modify
- **DELETE**: Which rows users can remove

---

## Security Implementation Summary

### 1. Helper Function: `current_user_wallet_id()`

This function extracts the wallet ID from the JWT token claims. It's used in all RLS policies to identify the authenticated user.

```sql
-- Returns the wallet ID from JWT claims
-- Example JWT: { "wallet_id": "0x123abc...", ... }
public.current_user_wallet_id()
```

**Security Features:**

- Uses `SECURITY DEFINER` to run with elevated privileges
- Has a secure `search_path` to prevent hijacking attacks
- Returns NULL if no valid wallet_id is found

---

## Table-by-Table Policies

### 📅 Event Table

**Purpose:** Store voting events created by users

**Policies:**

1. ✅ **SELECT (Read)**: Anyone can read all events
   - Public events should be visible to everyone
2. ✅ **INSERT (Create)**: Only authenticated users
   - Must have a valid wallet_id in JWT
3. ✅ **UPDATE (Modify)**: Only event creators
   - Can only update events where `createdBy` matches their wallet ID
4. ✅ **DELETE (Remove)**: Only event creators
   - Can only delete their own events

---

### 🎯 Candidate Table

**Purpose:** Store candidates for each voting event

**Policies:**

1. ✅ **SELECT (Read)**: Anyone can read all candidates
   - Candidate information is public
2. ✅ **INSERT (Create)**: Only event creators
   - Can only add candidates to events they created
3. ✅ **UPDATE (Modify)**: Only event creators
   - Can only modify candidates in their events
4. ✅ **DELETE (Remove)**: Only event creators
   - Can only delete candidates from their events

---

### 👤 Voter Table

**Purpose:** Store voter information and wallet addresses

**Policies:**

1. ✅ **SELECT (Read)**: Voters can only see their own data
   - Privacy protection for voter information
2. ✅ **INSERT (Create)**: Anyone can register
   - Open registration for new voters
3. ✅ **UPDATE (Modify)**: Voters can only update their own data
   - Can update name, last login, etc.
4. ❌ **DELETE (Remove)**: No one can delete voters
   - Maintains data integrity and voting history

---

### 🗳️ Vote Table

**Purpose:** Store cast votes (immutable for integrity)

**Policies:**

1. ✅ **SELECT (Read)**: Voters can only see their own votes
   - Privacy protection for vote history
2. ✅ **INSERT (Create)**: Voters can only vote for themselves
   - Must match authenticated wallet ID
   - One vote per event (enforced by unique constraint)
3. ❌ **UPDATE (Modify)**: Votes are immutable
   - Cannot change votes after casting
   - Ensures voting integrity
4. ❌ **DELETE (Remove)**: Votes are immutable
   - Cannot delete votes
   - Maintains audit trail

---

### 🔒 TokenBlacklist Table

**Purpose:** Store invalidated JWT tokens (logout/security)

**Policies:**

1. ❌ **All operations blocked for public users**
   - Only accessible via service role (your backend API)
   - Ensures token management remains secure

---

## How to Use RLS in Your Application

### 1. **JWT Token Structure**

Your authentication system must include the wallet ID in JWT claims:

```javascript
// Example JWT payload
{
  "wallet_id": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "sub": "voter_wallet_address",
  "iat": 1699123456,
  "exp": 1699209856
}
```

### 2. **Making Authenticated Requests**

When making requests to Supabase, include the JWT in the Authorization header:

```javascript
// Using Supabase client
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Set the JWT token
supabase.auth.setSession({
  access_token: yourJwtToken,
  refresh_token: yourRefreshToken,
});

// Now all queries respect RLS policies
const { data, error } = await supabase.from("Event").select("*");
```

### 3. **Service Role Bypass**

For backend operations that need to bypass RLS (like TokenBlacklist management):

```javascript
// Use service role key (NEVER expose this to frontend!)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Bypasses RLS
);

// This can access TokenBlacklist
await supabaseAdmin
  .from("TokenBlacklist")
  .insert({ token: invalidToken, userId: voterId, expiresAt: expiry });
```

---

## Testing RLS Policies

### Test 1: Reading Events (Should Work)

```javascript
// No authentication needed - public read
const { data } = await supabase.from("Event").select("*");
// ✅ Returns all events
```

### Test 2: Creating Event Without Auth (Should Fail)

```javascript
// No JWT token set
const { error } = await supabase.from("Event").insert({
  name: "Test Event",
  createdBy: "some_wallet",
});
// ❌ Error: Policy violation
```

### Test 3: Creating Event With Auth (Should Work)

```javascript
// JWT token with wallet_id set
supabase.auth.setSession({ access_token: validJwt });
const { data } = await supabase.from("Event").insert({
  name: "Test Event",
  createdBy: "wallet_from_jwt",
});
// ✅ Creates event
```

### Test 4: Updating Someone Else's Event (Should Fail)

```javascript
// JWT token for wallet A, trying to update wallet B's event
const { error } = await supabase
  .from("Event")
  .update({ name: "Hacked!" })
  .eq("id", someoneElsesEventId);
// ❌ Error: No rows returned (RLS blocks the update)
```

### Test 5: Voter Privacy (Should Work)

```javascript
// Voter A's JWT token
const { data } = await supabase.from("Voter").select("*");
// ✅ Returns only Voter A's data
```

### Test 6: Vote Immutability (Should Fail)

```javascript
// Try to change a vote after casting
const { error } = await supabase
  .from("Vote")
  .update({ candidateId: differentCandidate })
  .eq("id", voteId);
// ❌ Error: No update policy exists
```

---

## Security Best Practices

### ✅ DO:

1. **Always include wallet_id in JWT claims**
2. **Use service role key only in backend code**
3. **Validate JWT tokens before creating them**
4. **Test policies thoroughly before production**
5. **Monitor RLS policy violations in logs**

### ❌ DON'T:

1. **Never expose service role key to frontend**
2. **Don't disable RLS in production**
3. **Don't bypass RLS for convenience**
4. **Don't store sensitive data without encryption**
5. **Don't trust client-side validation alone**

---

## Troubleshooting

### Problem: "No rows returned" but data exists

**Cause:** RLS policy is blocking access
**Solution:** Check if JWT token is set correctly and contains wallet_id

### Problem: "Policy violation" on insert

**Cause:** WITH CHECK condition failed
**Solution:** Ensure the data you're inserting matches policy requirements

### Problem: TokenBlacklist operations fail

**Cause:** RLS blocks all public access
**Solution:** Use service role key for TokenBlacklist operations

### Problem: Cannot update votes

**Cause:** This is intentional - votes are immutable
**Solution:** Don't allow vote updates; design UI accordingly

---

## Monitoring and Maintenance

### Check Security Advisories

```bash
# Use Supabase dashboard or API
GET /v1/projects/{project_id}/advisors?type=security
```

### View Current Policies

```sql
-- List all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'Event';
```

### Test a Policy

```sql
-- Simulate a user with specific wallet_id
SET request.jwt.claims = '{"wallet_id": "0x123abc"}';
SELECT * FROM "Event";
```

---

## Migration History

The following migrations were applied to enable RLS:

1. ✅ `enable_rls_and_create_policies_v2`

   - Enabled RLS on all tables
   - Created helper function
   - Added policies for Event, Candidate, Voter, Vote tables

2. ✅ `fix_security_warnings_v2`
   - Fixed function search_path security
   - Added TokenBlacklist policies

---

## Next Steps

1. **Update your authentication system** to include `wallet_id` in JWT claims
2. **Test all operations** with authenticated users
3. **Update your API routes** to use service role for TokenBlacklist
4. **Monitor logs** for policy violations
5. **Document** any custom policies you add in the future

---

## Support

- **Supabase RLS Documentation**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS Documentation**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Security Best Practices**: https://supabase.com/docs/guides/database/database-linter

---

## Summary

✅ RLS is now **ENABLED** on all tables
✅ Security advisories are **CLEARED**
✅ Policies follow **principle of least privilege**
✅ Voter data is **PRIVATE**
✅ Votes are **IMMUTABLE**
✅ Events and candidates are **PUBLIC** for reading
✅ Only event creators can **MODIFY** their events

Your e-voting system now has robust row-level security! 🎉

