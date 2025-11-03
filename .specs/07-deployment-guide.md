# Deployment Guide

## Overview
Complete guide for deploying SafePlace to production using Vercel and managed PostgreSQL.

## Tech Stack Summary
- **Hosting**: Vercel (recommended) or Railway/Fly.io
- **Database**: Neon, Supabase, or Railway PostgreSQL
- **Cron Jobs**: Vercel Cron
- **Monitoring**: Vercel Analytics + Sentry
- **Maps**: Mapbox (free tier)

## Prerequisites

### 1. Accounts Needed
- [ ] Vercel account (free tier works)
- [ ] Neon/Supabase account (PostgreSQL hosting)
- [ ] Mapbox account (for maps)
- [ ] Upstash account (for rate limiting - optional)
- [ ] Sentry account (for error tracking - optional)

### 2. Domain (Optional)
- Register domain (e.g., safeplace.com.br)
- Configure DNS to point to Vercel

## Database Setup

### Option 1: Neon (Recommended)
```bash
# 1. Create account at neon.tech
# 2. Create new project
# 3. Enable PostGIS extension
# 4. Copy connection string
```

**Connection Strings:**
```env
# Pooled connection (for API routes)
DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require&pgbouncer=true"

# Direct connection (for migrations)
DIRECT_DATABASE_URL="postgresql://user:pass@host.neon.tech/db?sslmode=require"
```

**Enable PostGIS:**
```sql
-- Run in Neon SQL Editor
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### Option 2: Supabase
```bash
# 1. Create project at supabase.com
# 2. PostGIS is enabled by default
# 3. Get connection strings from Settings > Database
```

### Option 3: Railway
```bash
# 1. Create project at railway.app
# 2. Add PostgreSQL service
# 3. Enable PostGIS via plugin or SQL
```

## Environment Variables

### Development (.env.local)
```env
# Database
DATABASE_URL="postgresql://localhost:5432/safeplace_dev"
DIRECT_DATABASE_URL="postgresql://localhost:5432/safeplace_dev"

# Next.js
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN="pk.your_mapbox_token"

# Cron Secret (for securing cron endpoints)
CRON_SECRET="your-random-secret-key"

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Error Tracking (Sentry - optional)
SENTRY_DSN="https://your-sentry-dsn"
NEXT_PUBLIC_SENTRY_DSN="https://your-sentry-dsn"
```

### Production (Vercel)
All variables above should be added in Vercel dashboard:
`Settings > Environment Variables`

**Important**: Mark `CRON_SECRET` and database credentials as sensitive.

## Initial Setup

### 1. Clone & Install
```bash
git clone <your-repo>
cd ott
npm install
```

### 2. Database Migrations
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or if starting fresh
npx prisma migrate dev --name init
```

### 3. Seed Data (Optional)
```bash
# Run scraper manually to collect initial data
npm run scrape

# Or wait for cron job to populate data
```

### 4. Local Development
```bash
npm run dev
# Open http://localhost:3000
```

## Vercel Deployment

### 1. Connect Repository
```bash
# Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# Import in Vercel
# 1. Go to vercel.com/new
# 2. Import your GitHub repository
# 3. Configure environment variables
# 4. Deploy
```

### 2. Configure Vercel Settings

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-ott",
      "schedule": "* * * * *"
    }
  ],
  "regions": ["gru1"],
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
```

**Environment Variables:**
Add all variables from `.env.local` to Vercel dashboard.

### 3. Custom Domain (Optional)
```bash
# In Vercel dashboard:
# 1. Go to Settings > Domains
# 2. Add your domain (e.g., safeplace.com.br)
# 3. Configure DNS records as instructed
```

## Cron Job Configuration

### Vercel Cron (Recommended for Production)
Already configured in `vercel.json`. Vercel will automatically call:
```
GET /api/cron/scrape-ott
```
every minute.

**Security**: Endpoint checks for `CRON_SECRET` header:
```typescript
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Alternative: External Cron Service
If not using Vercel Cron, use a service like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **UptimeRobot** (free monitoring with cron)

Configure to call:
```
curl -X GET https://your-domain.com/api/cron/scrape-ott \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Monitoring & Observability

### 1. Vercel Analytics
```bash
# Install package
npm install @vercel/analytics

# Add to layout
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Sentry Error Tracking
```bash
# Install
npm install @sentry/nextjs

# Run wizard
npx @sentry/wizard@latest -i nextjs

# Configure in sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### 3. Database Monitoring
**Neon Dashboard:**
- Monitor connection pool usage
- Track query performance
- Set up alerts for high CPU/memory

**Key Metrics to Track:**
- Database size growth
- Connection pool utilization
- Query execution time (p95, p99)
- Scraper success rate
- API response times

### 4. Uptime Monitoring
Use **UptimeRobot** (free):
- Monitor homepage: `https://your-domain.com`
- Monitor API health: `https://your-domain.com/api/health`
- Monitor cron job execution

## Performance Optimization

### 1. Database Indexes
Ensure these indexes exist (from schema spec):
```sql
CREATE INDEX incidents_location_gist_idx ON incidents USING GIST (location);
CREATE INDEX incidents_occurred_at_idx ON incidents (occurred_at DESC);
CREATE INDEX incidents_location_time_idx ON incidents (municipality, occurred_at DESC, incident_type);
```

### 2. Connection Pooling
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 3. CDN Configuration
Vercel automatically handles this, but ensure:
- Static assets are optimized
- Images use Next.js Image component
- API routes use appropriate `cache-control` headers

### 4. Rate Limiting
Use Upstash Redis for distributed rate limiting:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 h'),
});
```

## Security Checklist

- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set `CRON_SECRET` for cron endpoints
- [ ] Use environment variables for all secrets
- [ ] Enable CORS only for trusted domains
- [ ] Implement rate limiting
- [ ] Sanitize user inputs (URL validation)
- [ ] Enable Vercel's DDoS protection
- [ ] Review and comply with OTT's terms of service
- [ ] Add security headers via `next.config.js`:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
```

## Backup Strategy

### Database Backups
**Neon:**
- Automatic daily backups (free tier: 7 days retention)
- Manual backups via Neon dashboard
- Point-in-time recovery available on paid plans

**Manual Backup:**
```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Store in S3 or similar
aws s3 cp backup_*.sql s3://your-backup-bucket/
```

### Code Backups
- Use GitHub/GitLab (already version controlled)
- Tag releases: `git tag v1.0.0 && git push --tags`

## Scaling Considerations

### Current Limits (Free Tiers)
- **Vercel**: 100GB bandwidth, unlimited requests
- **Neon**: 10GB storage, 100 hours compute time
- **Mapbox**: 50,000 map loads/month

### When to Scale

**Database:**
- Upgrade to paid Neon plan when:
  - Storage > 10GB
  - Compute time > 100 hours/month
  - Need more connection pooling

**Hosting:**
- Upgrade Vercel when:
  - Bandwidth > 100GB/month
  - Need more team members
  - Need advanced features

**Caching:**
- Add Redis caching layer when:
  - API response time > 500ms
  - Database queries become bottleneck
  - High read traffic

## Troubleshooting

### Cron Job Not Running
1. Check Vercel logs: `Deployments > [Latest] > Functions > Logs`
2. Verify `vercel.json` is committed
3. Check cron secret matches environment variable
4. Test manually: `curl https://your-domain.com/api/cron/scrape-ott -H "Authorization: Bearer YOUR_SECRET"`

### Database Connection Issues
1. Verify connection strings in environment variables
2. Check IP allowlist (Neon/Supabase)
3. Monitor connection pool usage
4. Use `DIRECT_DATABASE_URL` for migrations

### High API Latency
1. Check database query performance
2. Add missing indexes
3. Enable caching for frequently accessed data
4. Use Vercel Edge Functions for static responses

### Out of Memory (OOM)
1. Optimize Prisma queries (use `select` to limit fields)
2. Batch process large datasets
3. Increase Vercel function memory limit (paid plans)

## Launch Checklist

**Pre-Launch:**
- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] PostGIS extension enabled
- [ ] Scraper running and collecting data (7+ days)
- [ ] All pages tested on mobile/desktop
- [ ] SEO meta tags configured
- [ ] Analytics and error tracking enabled
- [ ] Performance tested (Lighthouse score > 90)
- [ ] Security review completed

**Launch Day:**
- [ ] Deploy to production
- [ ] Verify cron job is running
- [ ] Monitor error rates
- [ ] Test key user flows
- [ ] Set up uptime monitoring

**Post-Launch:**
- [ ] Monitor performance for 48 hours
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Plan iterative improvements

## Cost Estimates

**MVP (Free Tier):**
- Vercel: $0
- Neon: $0
- Mapbox: $0 (up to 50k loads)
- **Total: $0/month**

**Growing (Paid):**
- Vercel Pro: $20/month
- Neon Scale: $19/month (50GB storage)
- Upstash: $10/month (rate limiting)
- Mapbox: $5/month (extra loads)
- Sentry: $26/month (error tracking)
- **Total: ~$80/month**

**Scale (Production):**
- Vercel Enterprise: $500/month
- Neon Business: $69/month (200GB storage)
- Upstash Pro: $40/month
- Mapbox: $50/month
- **Total: ~$660/month**

## Support & Maintenance

### Weekly Tasks
- [ ] Review error logs
- [ ] Check scraper health
- [ ] Monitor database growth
- [ ] Review user feedback

### Monthly Tasks
- [ ] Database backup verification
- [ ] Performance audit
- [ ] Security updates (npm audit)
- [ ] Cost review

### Quarterly Tasks
- [ ] Feature planning
- [ ] User survey
- [ ] Competitor analysis
- [ ] Infrastructure review

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **PostGIS Docs**: https://postgis.net/documentation
- **Mapbox Docs**: https://docs.mapbox.com
