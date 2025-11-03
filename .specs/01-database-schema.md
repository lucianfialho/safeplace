# Database Schema Specification

## Overview
PostgreSQL 16+ with PostGIS extension for geospatial queries. Using Prisma as ORM for type-safe database access.

## Required Extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

## Tables

### 1. incidents

Stores all security incidents scraped from OTT.

```typescript
model Incident {
  id                String   @id @default(cuid())

  // Temporal data
  occurred_at       DateTime // When the incident happened
  scraped_at        DateTime @default(now()) // When we scraped it

  // Location data
  neighborhood      String   // Bairro
  municipality      String   // Município (Rio de Janeiro, São Paulo, etc)
  state             String   // Estado (RJ, SP, CE, etc)
  latitude          Decimal? @db.Decimal(10, 8) // -22.9327433
  longitude         Decimal? @db.Decimal(11, 8) // -43.3525182
  location          Unsupported("geography(Point, 4326)")? // PostGIS geography point

  // Incident details
  incident_type     IncidentType // TIROTEIO, DISPAROS_OUVIDOS, INCENDIO, UTILIDADE_PUBLICA
  severity_score    Int      // 1-10, calculated based on type
  description       String?  // Additional details if available

  // Metadata
  source            String   @default("OTT") // Source of data
  source_id         String?  // Original ID from source if available
  verified          Boolean  @default(false) // If manually verified

  // Indexes
  @@index([occurred_at])
  @@index([municipality, neighborhood])
  @@index([incident_type])
  @@index([state, occurred_at])
  @@unique([source, source_id])
  @@map("incidents")
}

enum IncidentType {
  TIROTEIO              // Shooting/gunfire - highest severity
  DISPAROS_OUVIDOS      // Shots heard - medium severity
  INCENDIO              // Fire - medium severity
  UTILIDADE_PUBLICA     // Public utility/other - low severity
  ARRASTAO              // Robbery spree - high severity (if we add later)
  OPERACAO_POLICIAL     // Police operation - medium severity (if we add later)
}
```

**PostGIS Geography Column:**
- Stores lat/long as geography type for accurate distance calculations
- Automatically indexed with GIST for fast spatial queries
- Supports distance queries in meters: `ST_DWithin(location, point, radius_in_meters)`

**Severity Scoring:**
- TIROTEIO: 10
- ARRASTAO: 9
- OPERACAO_POLICIAL: 7
- DISPAROS_OUVIDOS: 5
- INCENDIO: 6
- UTILIDADE_PUBLICA: 2

### 2. properties

Cache of analyzed properties from Quinto Andar to avoid re-scraping.

```typescript
model Property {
  id                String   @id @default(cuid())

  // Quinto Andar data
  qa_listing_id     String   @unique // 893321695
  qa_url            String   // Original URL

  // Location
  address           String?
  neighborhood      String
  municipality      String
  state             String
  latitude          Decimal  @db.Decimal(10, 8)
  longitude         Decimal  @db.Decimal(11, 8)
  location          Unsupported("geography(Point, 4326)")

  // Property details
  property_type     PropertyType // APARTMENT, HOUSE, STUDIO, etc
  business_context  BusinessContext // RENT or SALE
  price             Int      // Monthly rent or sale price in BRL cents
  condominium_fee   Int?     // Monthly condo fee in BRL cents
  iptu              Int?     // Monthly IPTU in BRL cents
  total_area        Int?     // Area in m²

  // Features (for display)
  bedroom_count     Int?
  bathroom_count    Int?
  suite_count       Int?
  parking_slots     Int?
  is_furnished      Boolean  @default(false)

  // Metadata
  first_analyzed_at DateTime @default(now())
  last_analyzed_at  DateTime @updatedAt
  analysis_count    Int      @default(1)

  // Relations
  analyses          PropertyAnalysis[]

  @@index([qa_listing_id])
  @@index([neighborhood, municipality])
  @@map("properties")
}

enum PropertyType {
  APARTMENT
  HOUSE
  STUDIO
  KITCHENETTE
  LOFT
  PENTHOUSE
}

enum BusinessContext {
  RENT
  SALE
}
```

### 3. property_analyses

Stores historical safety score calculations for properties.

```typescript
model PropertyAnalysis {
  id                String   @id @default(cuid())
  property_id       String
  property          Property @relation(fields: [property_id], references: [id], onDelete: Cascade)

  // Score data
  calculated_at     DateTime @default(now())
  overall_score     Int      // 0-100

  // Radius-based scores
  score_500m        Int      // Score for 500m radius
  score_1km         Int      // Score for 1km radius
  score_2km         Int      // Score for 2km radius

  // Incident counts by radius and timeframe
  incidents_500m_30d   Int
  incidents_500m_90d   Int
  incidents_500m_365d  Int
  incidents_1km_30d    Int
  incidents_1km_90d    Int
  incidents_1km_365d   Int
  incidents_2km_30d    Int
  incidents_2km_90d    Int
  incidents_2km_365d   Int

  // Incident breakdown by type (30 days, 1km)
  tiroteios_count      Int
  disparos_count       Int
  incendios_count      Int
  outros_count         Int

  // Trend analysis
  trend_direction      TrendDirection // IMPROVING, STABLE, WORSENING
  trend_percentage     Decimal? @db.Decimal(5, 2) // +15.5% or -23.2%

  // Comparative data
  neighborhood_avg_score Int? // Average score for the neighborhood
  city_avg_score         Int? // Average score for the city
  percentile_rank        Int? // 0-100, where property ranks vs others

  // Metadata
  request_source    String?  // web, api, extension
  user_agent        String?

  @@index([property_id, calculated_at])
  @@index([calculated_at])
  @@map("property_analyses")
}

enum TrendDirection {
  IMPROVING   // Fewer incidents recently
  STABLE      // Similar incident rate
  WORSENING   // More incidents recently
}
```

### 4. scraper_logs

Tracks scraper execution for monitoring and debugging.

```typescript
model ScraperLog {
  id                String   @id @default(cuid())

  // Execution data
  started_at        DateTime @default(now())
  completed_at      DateTime?
  duration_ms       Int?
  status            ScraperStatus

  // Results
  records_found     Int      @default(0)
  records_new       Int      @default(0)
  records_duplicate Int      @default(0)
  records_failed    Int      @default(0)

  // Error handling
  error_message     String?
  error_stack       String?  @db.Text

  // Metadata
  scraper_version   String   @default("1.0.0")
  environment       String   // production, development

  @@index([started_at])
  @@index([status])
  @@map("scraper_logs")
}

enum ScraperStatus {
  RUNNING
  SUCCESS
  PARTIAL_SUCCESS
  FAILED
}
```

### 5. api_analytics (Optional - for tracking usage)

```typescript
model ApiAnalytics {
  id                String   @id @default(cuid())

  // Request data
  endpoint          String   // /api/analyze, /api/score, etc
  method            String   // GET, POST
  requested_at      DateTime @default(now())

  // Request details
  qa_listing_id     String?
  user_ip           String?
  user_agent        String?
  referer           String?

  // Response data
  status_code       Int
  response_time_ms  Int
  success           Boolean

  // Error tracking
  error_type        String?
  error_message     String?

  @@index([requested_at])
  @@index([endpoint])
  @@index([qa_listing_id])
  @@map("api_analytics")
}
```

## Indexes

### Geospatial Indexes (PostGIS)

```sql
-- GIST index on geography columns for fast spatial queries
CREATE INDEX incidents_location_gist_idx
ON incidents USING GIST (location);

CREATE INDEX properties_location_gist_idx
ON properties USING GIST (location);
```

### Performance Indexes

```sql
-- Composite index for common query patterns
CREATE INDEX incidents_location_time_idx
ON incidents (municipality, occurred_at DESC, incident_type);

-- Index for recent incidents queries
CREATE INDEX incidents_recent_idx
ON incidents (occurred_at DESC)
WHERE occurred_at > NOW() - INTERVAL '1 year';
```

## Common Queries

### 1. Find incidents within radius of a point (last 30 days)

```sql
SELECT
  id,
  incident_type,
  occurred_at,
  neighborhood,
  ST_Distance(location, ST_SetSRID(ST_MakePoint(-43.3525182, -22.9327433), 4326)::geography) as distance_meters
FROM incidents
WHERE
  ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint(-43.3525182, -22.9327433), 4326)::geography,
    1000  -- 1km in meters
  )
  AND occurred_at >= NOW() - INTERVAL '30 days'
ORDER BY occurred_at DESC;
```

### 2. Count incidents by type and radius

```sql
SELECT
  incident_type,
  COUNT(*) as count
FROM incidents
WHERE
  ST_DWithin(
    location,
    ST_SetSRID(ST_MakePoint($longitude, $latitude), 4326)::geography,
    $radius_meters
  )
  AND occurred_at >= NOW() - INTERVAL '30 days'
GROUP BY incident_type;
```

### 3. Get neighborhood statistics

```sql
SELECT
  neighborhood,
  municipality,
  COUNT(*) as incident_count,
  AVG(severity_score) as avg_severity
FROM incidents
WHERE
  municipality = 'Rio de Janeiro'
  AND occurred_at >= NOW() - INTERVAL '90 days'
GROUP BY neighborhood, municipality
ORDER BY incident_count DESC;
```

## Data Retention Policy

### Hot Data (Fast Access)
- **Last 1 year**: Full indexes, optimized for queries
- **Purpose**: Real-time safety scores and analysis

### Warm Data (Archived)
- **1-3 years**: Compressed, limited indexes
- **Purpose**: Historical trends and research

### Cold Data (Long-term Storage)
- **3+ years**: Compressed, minimal indexes
- **Purpose**: Long-term analysis, compliance

### Implementation
```sql
-- Partition table by year for efficient archiving
CREATE TABLE incidents (
  -- columns
) PARTITION BY RANGE (occurred_at);

CREATE TABLE incidents_2024 PARTITION OF incidents
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE incidents_2025 PARTITION OF incidents
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## Migration Strategy

### Initial Setup
1. Create extensions (PostGIS)
2. Run Prisma migrations for base schema
3. Add PostGIS-specific columns via raw SQL
4. Create indexes
5. Seed with test data

### Data Backfilling
Once scraper is running:
1. Let scraper run for 7 days to build initial dataset
2. Optionally backfill historical data if available
3. Calculate baseline statistics for neighborhoods

## Backup Strategy

### Daily Backups
- Full PostgreSQL dump
- Store in S3 or similar
- Retention: 30 days

### Point-in-Time Recovery
- Enable WAL archiving
- Allows restore to any point in last 7 days

## Performance Targets

- Incident insertion: < 10ms per record
- Geospatial query (1km radius): < 50ms
- Score calculation: < 200ms
- Property lookup: < 20ms

## Connection Pooling

```typescript
// Recommended Prisma config
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL") // For migrations
}

// Connection pool settings
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=30"
```

## Monitoring

### Key Metrics to Track
1. **Database size growth**: Monitor incidents table size
2. **Query performance**: Track slow queries (> 100ms)
3. **Connection pool utilization**: Ensure no connection exhaustion
4. **Index hit rate**: Should be > 99%
5. **Scraper throughput**: Records inserted per minute

### Alerts
- Scraper fails > 3 times in 1 hour
- Database size growth > 10% in 1 day (unexpected)
- Query time p95 > 500ms
- Connection pool exhaustion
