# API Routes Specification

## Overview
Next.js 15 App Router API routes that power the SafePlace application. RESTful endpoints for property analysis, incident queries, and score retrieval.

## Base URL
```
Development: http://localhost:3000/api
Production: https://safeplace.com/api
```

## Authentication
MVP will be **public/unauthenticated**. Future versions may add API keys for rate limiting and premium features.

## Rate Limiting
- **Free tier**: 60 requests per hour per IP
- **Implementation**: Use `upstash/ratelimit` or similar
- **Headers**: Return `X-RateLimit-*` headers

## File Structure
```
/app
  /api
    /analyze
      route.ts                  # POST /api/analyze
    /score
      route.ts                  # GET /api/score
    /incidents
      route.ts                  # GET /api/incidents
      /nearby
        route.ts                # GET /api/incidents/nearby
    /property
      /[listingId]
        route.ts                # GET /api/property/:listingId
    /stats
      route.ts                  # GET /api/stats
    /health
      route.ts                  # GET /api/health
    /cron
      /scrape-ott
        route.ts                # GET /api/cron/scrape-ott (internal)
```

## Endpoints

### 1. POST /api/analyze

**Primary endpoint**: Analyzes a Quinto Andar property URL and returns complete safety report.

#### Request
```typescript
POST /api/analyze
Content-Type: application/json

{
  "url": "https://www.quintoandar.com.br/imovel/893321695"
}
```

#### Response (200 OK)
```typescript
{
  "success": true,
  "data": {
    // Property details
    "property": {
      "id": "cuid_abc123",
      "qaListingId": "893321695",
      "qaUrl": "https://www.quintoandar.com.br/imovel/893321695",
      "address": "Rua Example, 123",
      "neighborhood": "Copacabana",
      "municipality": "Rio de Janeiro",
      "state": "RJ",
      "latitude": -22.9327433,
      "longitude": -43.3525182,
      "price": 133000,  // in cents
      "condominiumFee": 69000,
      "bedroomCount": 2,
      "bathroomCount": 1,
      "totalArea": 55,
      "propertyType": "APARTMENT",
      "businessContext": "RENT"
    },

    // Safety score
    "score": {
      "overallScore": 78,
      "score500m": 82,
      "score1km": 78,
      "score2km": 75,
      "badge": {
        "label": "Good",
        "color": "lightgreen",
        "description": "Below average incident rate"
      }
    },

    // Incident counts
    "incidents": {
      "incidents500m30d": 2,
      "incidents500m90d": 5,
      "incidents500m365d": 18,
      "incidents1km30d": 5,
      "incidents1km90d": 12,
      "incidents1km365d": 45,
      "incidents2km30d": 12,
      "incidents2km90d": 28,
      "incidents2km365d": 95,
      "byType": {
        "tiroteios": 1,
        "disparos": 3,
        "incendios": 1,
        "outros": 0
      }
    },

    // Trend analysis
    "trend": {
      "direction": "IMPROVING",
      "percentage": 15.5,
      "confidence": 0.7,
      "recent30DayCount": 5,
      "previous30DayCount": 6
    },

    // Comparative metrics
    "comparison": {
      "neighborhoodAvgScore": 72,
      "cityAvgScore": 68,
      "percentileRank": 65,
      "betterThanNeighborhood": true,
      "betterThanCity": true
    },

    // Metadata
    "calculatedAt": "2025-11-03T14:30:00Z",
    "cacheHit": false
  }
}
```

#### Error Responses
```typescript
// Invalid URL
{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "URL is not a valid Quinto Andar property listing",
    "details": {
      "url": "https://example.com"
    }
  }
}

// Extraction failed
{
  "success": false,
  "error": {
    "code": "EXTRACTION_FAILED",
    "message": "Could not extract property data from URL",
    "details": {
      "listingId": "893321695",
      "reason": "Missing coordinates"
    }
  }
}

// Rate limit exceeded
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 60 minutes.",
    "retryAfter": 3600
  }
}
```

#### Implementation
```typescript
// /app/api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { QuintoAndarExtractor } from '@/lib/extractors/quinto-andar-extractor';
import { SafetyScoreEngine } from '@/lib/scoring/safety-score-engine';
import { PropertyService } from '@/services/property-service';
import { PropertyAnalysisService } from '@/services/property-analysis-service';
import { ratelimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.ip ?? 'anonymous';
    const { success, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: 3600,
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': remaining.toString(),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing or invalid "url" field',
          },
        },
        { status: 400 }
      );
    }

    // Extract property data
    const propertyService = new PropertyService(prisma);
    const extractor = new QuintoAndarExtractor(propertyService);

    const propertyData = await extractor.extractFromUrl(url);

    if (!propertyData) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EXTRACTION_FAILED',
            message: 'Could not extract property data from URL',
          },
        },
        { status: 400 }
      );
    }

    // Calculate safety score
    const scoreEngine = new SafetyScoreEngine();
    const score = await scoreEngine.calculateScore(
      propertyData.latitude,
      propertyData.longitude,
      propertyData.neighborhood,
      propertyData.municipality
    );

    // Save analysis to database
    const analysisService = new PropertyAnalysisService(prisma);
    await analysisService.save({
      propertyId: propertyData.id,
      ...score,
      requestSource: 'web',
      userAgent: request.headers.get('user-agent'),
    });

    // Format response
    return NextResponse.json({
      success: true,
      data: {
        property: propertyData,
        score: {
          overallScore: score.overallScore,
          score500m: score.score500m,
          score1km: score.score1km,
          score2km: score.score2km,
          badge: getScoreBadge(score.overallScore),
        },
        incidents: score.incidents,
        trend: score.trend,
        comparison: score.comparison,
        calculatedAt: score.calculatedAt,
        cacheHit: false,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
```

---

### 2. GET /api/score

**Quick endpoint**: Get cached score for a property by listing ID (fast, no extraction).

#### Request
```
GET /api/score?listingId=893321695
```

#### Query Parameters
- `listingId` (required): Quinto Andar listing ID

#### Response (200 OK)
```typescript
{
  "success": true,
  "data": {
    "overallScore": 78,
    "score500m": 82,
    "score1km": 78,
    "score2km": 75,
    "calculatedAt": "2025-11-03T14:30:00Z",
    "cacheAge": 120  // seconds
  }
}
```

#### Response (404 Not Found)
```typescript
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No cached score found for this property. Use /api/analyze to generate one."
  }
}
```

---

### 3. GET /api/incidents/nearby

**Geospatial query**: Get incidents near a location.

#### Request
```
GET /api/incidents/nearby?lat=-22.9327433&lng=-43.3525182&radius=1000&days=30
```

#### Query Parameters
- `lat` (required): Latitude
- `lng` (required): Longitude
- `radius` (optional): Radius in meters (default: 1000, max: 5000)
- `days` (optional): Days to look back (default: 30, max: 365)
- `limit` (optional): Max results (default: 100, max: 500)

#### Response (200 OK)
```typescript
{
  "success": true,
  "data": {
    "incidents": [
      {
        "id": "cuid_xyz789",
        "occurredAt": "2025-11-01T18:45:00Z",
        "incidentType": "TIROTEIO",
        "neighborhood": "Copacabana",
        "municipality": "Rio de Janeiro",
        "state": "RJ",
        "latitude": -22.9330000,
        "longitude": -43.3520000,
        "distanceMeters": 450,
        "severityScore": 10
      },
      // ... more incidents
    ],
    "total": 5,
    "query": {
      "latitude": -22.9327433,
      "longitude": -43.3525182,
      "radiusMeters": 1000,
      "days": 30
    }
  }
}
```

#### Implementation
```typescript
// /app/api/incidents/nearby/route.ts

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const radius = Math.min(parseInt(searchParams.get('radius') || '1000'), 5000);
  const days = Math.min(parseInt(searchParams.get('days') || '30'), 365);
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_COORDINATES' } },
      { status: 400 }
    );
  }

  const incidents = await prisma.$queryRaw`
    SELECT
      id,
      occurred_at as "occurredAt",
      incident_type as "incidentType",
      neighborhood,
      municipality,
      state,
      latitude,
      longitude,
      severity_score as "severityScore",
      ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) as distance_meters
    FROM incidents
    WHERE
      ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${radius}
      )
      AND occurred_at >= NOW() - INTERVAL '${days} days'
    ORDER BY occurred_at DESC
    LIMIT ${limit}
  `;

  return NextResponse.json({
    success: true,
    data: {
      incidents,
      total: incidents.length,
      query: { latitude: lat, longitude: lng, radiusMeters: radius, days },
    },
  });
}
```

---

### 4. GET /api/property/:listingId

**Property details**: Get cached property information.

#### Request
```
GET /api/property/893321695
```

#### Response (200 OK)
```typescript
{
  "success": true,
  "data": {
    "id": "cuid_abc123",
    "qaListingId": "893321695",
    "qaUrl": "https://www.quintoandar.com.br/imovel/893321695",
    "neighborhood": "Copacabana",
    "municipality": "Rio de Janeiro",
    "state": "RJ",
    "latitude": -22.9327433,
    "longitude": -43.3525182,
    "price": 133000,
    "bedroomCount": 2,
    "bathroomCount": 1,
    "firstAnalyzedAt": "2025-10-15T10:00:00Z",
    "lastAnalyzedAt": "2025-11-03T14:30:00Z",
    "analysisCount": 12
  }
}
```

---

### 5. GET /api/stats

**Platform statistics**: Overall statistics about the platform.

#### Request
```
GET /api/stats
```

#### Response (200 OK)
```typescript
{
  "success": true,
  "data": {
    "incidents": {
      "total": 125043,
      "last24Hours": 243,
      "last7Days": 1689,
      "last30Days": 7234
    },
    "properties": {
      "analyzed": 3421,
      "unique": 2876,
      "lastAnalyzedAt": "2025-11-03T14:30:00Z"
    },
    "coverage": {
      "cities": ["Rio de Janeiro", "São Paulo"],
      "neighborhoods": 156,
      "states": ["RJ", "SP"]
    },
    "scraper": {
      "lastRun": "2025-11-03T14:29:00Z",
      "status": "SUCCESS",
      "uptimePercent": 99.2
    }
  }
}
```

---

### 6. GET /api/health

**Health check**: For monitoring and uptime services.

#### Request
```
GET /api/health
```

#### Response (200 OK)
```typescript
{
  "status": "healthy",
  "timestamp": "2025-11-03T14:30:00Z",
  "services": {
    "database": "up",
    "scraper": "up"
  },
  "version": "1.0.0"
}
```

#### Response (503 Service Unavailable)
```typescript
{
  "status": "unhealthy",
  "timestamp": "2025-11-03T14:30:00Z",
  "services": {
    "database": "down",
    "scraper": "up"
  },
  "version": "1.0.0"
}
```

---

### 7. GET /api/cron/scrape-ott (Internal)

**Cron endpoint**: Triggered by Vercel Cron every minute.

#### Request
```
GET /api/cron/scrape-ott
Authorization: Bearer {CRON_SECRET}
```

#### Response (200 OK)
```typescript
{
  "success": true,
  "recordsFound": 150,
  "recordsNew": 12,
  "recordsDuplicate": 138,
  "durationMs": 4523
}
```

See `02-ott-scraper.md` for detailed implementation.

---

## Error Handling

### Standard Error Response Format
```typescript
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional context
    }
  }
}
```

### Error Codes
- `INVALID_REQUEST`: Malformed request body/params
- `INVALID_URL`: Not a valid Quinto Andar URL
- `EXTRACTION_FAILED`: Could not extract property data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Unexpected server error

---

## Rate Limiting Implementation

```typescript
// /lib/ratelimit.ts

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create rate limiter
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 h'), // 60 requests per hour
  analytics: true,
  prefix: 'safeplace',
});
```

---

## CORS Configuration

```typescript
// /middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // CORS headers
  const response = NextResponse.next();

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## Testing

### Unit Tests
```typescript
describe('POST /api/analyze', () => {
  it('should analyze a valid property URL', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://www.quintoandar.com.br/imovel/893321695',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.score.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('should reject invalid URL', async () => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://google.com' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe('INVALID_URL');
  });
});
```

---

## Documentation

Generate OpenAPI/Swagger docs using:
- `@asteasolutions/zod-to-openapi`
- Expose at `/api/docs`

## Monitoring

- Use Vercel Analytics for request tracking
- Log errors to Sentry
- Track API performance metrics
- Alert on error rate spikes
