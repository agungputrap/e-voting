# Supabase Migration Guide

## Current Setup

Your e-voting app uses **Supabase PostgreSQL** with a connection pooler.

### Connection Configuration

```env
# For app queries - Uses connection pooler (fast, works with Next.js)
DATABASE_URL="postgresql://postgres.jkshsgjkzugkfkybsguw:bg0ZnVIhXiH30xGU@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

# For migrations - Direct connection (blocked by your network)
DIRECT_URL="postgresql://postgres:bg0ZnVIhXiH30xGU@db.jkshsgjkzugkfkybsguw.supabase.co:5432/postgres"
```

## Why Two URLs?

- **DATABASE_URL (Pooler)**: Fast, handles many connections, perfect for Next.js
- **DIRECT_URL (Direct)**: Required for schema migrations (blocked by your network)

## Making Schema Changes

Since direct connection is blocked, use this workflow:

### Step 1: Update Schema

Edit `prisma/schema.prisma` with your changes

### Step 2: Generate Migration SQL

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

Or generate from current state:

```bash
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script
```

### Step 3: Apply via Supabase MCP

Ask the AI assistant to apply the migration using:

```
mcp_supabase_apply_migration with the generated SQL
```

### Step 4: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 5: Restart Next.js

```bash
npm run dev
```

## Viewing Your Database

**Supabase Dashboard:**
https://supabase.com/dashboard/project/jkshsgjkzugkfkybsguw

**View Tables:**

- Event
- Candidate
- Voter
- Vote
- TokenBlacklist

## Security Note

⚠️ **Row Level Security (RLS)** is currently disabled on all tables.

For production, enable RLS policies: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

## Seeding Database

To reseed the database:

```bash
node prisma/seed.js
```

## Quick Commands

```bash
# Check what tables exist
# Ask AI: "Check tables in Supabase"

# View table data
# Ask AI: "Show me data from Event table"

# Generate Prisma Client
npx prisma generate

# Check schema status
npx prisma validate
```

## Troubleshooting

**Q: Next.js can't connect to database?**

- Stop dev server (Ctrl+C)
- Run `npx prisma generate`
- Delete `.next` folder
- Restart: `npm run dev`

**Q: Migration fails with connection error?**

- Use the Supabase MCP tools workflow above
- Direct connection is blocked by your network

**Q: Need to reset database?**

- Ask AI to drop and recreate all tables via MCP tools
- Then reseed: `node prisma/seed.js`

