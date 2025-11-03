# E-Voting System

A modern electronic voting system built with Next.js, Prisma, and PostgreSQL.

## Project Structure

```
e-voting/
├── app/
│   ├── api/
│   │   └── events/
│   │       ├── route.ts          # GET /api/events, POST /api/events
│   │       └── [id]/
│   │           └── route.ts      # GET, PUT, DELETE /api/events/[id]
│   ├── generated/
│   │   └── prisma/              # Generated Prisma client
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── prisma/
│   ├── migrations/              # Database migrations
│   └── schema.prisma           # Database schema
└── package.json
```

## How to Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your PostgreSQL database URL.

3. **Setup database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open application**
   Visit [http://localhost:3000](http://localhost:3000)
