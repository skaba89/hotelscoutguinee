# ============================================================
# HotelScout Guinea — Deployment Guide
# Netlify + Neon PostgreSQL
# ============================================================

## Architecture

```
[User Browser] → [Netlify CDN/Edge] → [Next.js Serverless Functions]
                                              ↓
                                    [Neon PostgreSQL (Serverless)]
```

## Prerequisites

1. **Netlify account** — https://app.netlify.com
2. **Neon account** — https://console.neon.tech
3. **GitHub repository** with the HotelScout Guinea code

---

## Step 1: Create Neon Database

1. Go to https://console.neon.tech → **New Project**
2. Name: `hotelscout-guinea`
3. Region: Choose closest to Guinea (e.g., `eu-central-1` or `us-east-2`)
4. Click **Create Project**

You'll get two connection strings:
- **Pooled connection** (for app): `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
- **Direct connection** (for migrations): `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

Keep both — you'll need them.

## Step 2: Run Database Migrations

From your local machine:

```bash
# Set the Neon connection string
export DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Push schema to Neon
npx prisma db push

# Seed the database
bun run db:seed
```

## Step 3: Deploy to Netlify

### Option A: Netlify CLI (recommended for first deploy)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize (follow prompts)
netlify init

# Deploy to staging
netlify deploy

# Deploy to production
netlify deploy --prod
```

### Option B: Netlify UI (Git-based auto-deploy)

1. Go to https://app.netlify.com → **Add new site** → **Import an existing project**
2. Connect your GitHub repository
3. Configure build settings:
   - **Build command:** `npx prisma generate && next build`
   - **Publish directory:** `.next`
   - **Node version:** `22` (set in Environment → Environment variables)
4. Add environment variables:
   - `DATABASE_URL` = `postgresql://user:pass@ep-xxx-pooled.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - `DIRECT_URL` = `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - `CRON_SECRET` = (generate a random string)
   - `ALLOWED_ORIGIN` = `https://your-site.netlify.app`
5. Click **Deploy site**

## Step 4: Set Up Auto-Migrations (Optional but Recommended)

Add a Netlify build plugin to run Prisma migrations on each deploy:

The `netlify.toml` already includes `prisma generate` in the build command.
For schema changes, run `prisma db push` from your local machine with the
`DIRECT_URL` connection string.

## Step 5: Custom Domain (Optional)

1. In Netlify: **Site settings** → **Domain management** → **Add custom domain**
2. Update DNS records as instructed
3. Netlify auto-provisions SSL via Let's Encrypt

## Step 6: Set Up Scheduled Functions (Cron)

Netlify supports scheduled functions. To enable hotel data collection:

1. In `netlify.toml`, add:

```toml
[functions."api/cron/collect"]
  schedule = "0 6 * * 1"    # Every Monday at 6 AM UTC

[functions."api/cron/scheduled"]
  schedule = "0 9 * * *"     # Every day at 9 AM UTC
```

2. Set `CRON_SECRET` in environment variables to secure the endpoints.

---

## Local Development

```bash
# Option A: SQLite (no Neon needed)
cp .env.example .env
# Edit .env: DATABASE_URL=file:./dev.db
npx prisma db push
bun run db:seed
bun run dev

# Option B: Neon (cloud database)
cp .env.example .env
# Edit .env: DATABASE_URL=postgresql://...neon.tech...
npx prisma db push
bun run db:seed
bun run dev
```

---

## Troubleshooting

### "P1001: Can't reach database server"
- Check that `DATABASE_URL` is correct
- Ensure `?sslmode=require` is in the connection string
- Neon pauses inactive databases after 5 minutes — first query wakes it up (may take a few seconds)

### "Prisma Client could not be generated"
- Run `npx prisma generate` before `next build`
- The `netlify.toml` already includes this in the build command

### "Module not found: @neondatabase/serverless"
- Ensure `@neondatabase/serverless` and `@prisma/adapter-neon` are in `dependencies` (not `devDependencies`)
- Run `bun add @neondatabase/serverless @prisma/adapter-neon`

### Functions timeout on Netlify
- Netlify Functions have a 10-second timeout on free tier, 26 seconds on Pro
- Optimize slow queries or upgrade to Pro

### Database connection pooling
- Always use the **Pooled connection** (port 5432) for the app
- Use the **Direct connection** (port 5432 without `-pooler`) only for migrations

---

## Cost Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| Netlify | 100GB bandwidth, 300 build min/month | $19/mo |
| Neon | 0.5GB storage, 100 compute hours/month | $19/mo |
| **Total** | **$0/month** (for development) | **$38/month** (production) |
