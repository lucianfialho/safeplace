# OTT Scraper Specification

## Overview
Automated scraper that fetches incident data from OTT's reportview.php page every minute and stores it in PostgreSQL with geospatial indexing.

## Source Data

### Target URL
```
https://ondetemtiroteio.com/reportview.php
```

### Expected HTML Structure
```html
<table style="border: 1px solid black; border-collapse: collapse">
  <thead>
    <tr>
      <th>Data</th>
      <th>Ocorrência</th>
      <th>Bairro</th>
      <th>Município</th>
      <th>Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>03/11/25 14:30</td>
      <td>Tiroteio</td>
      <td>Copacabana</td>
      <td>Rio de Janeiro</td>
      <td>RJ</td>
    </tr>
    <!-- more rows -->
  </tbody>
</table>
```

### Data Fields
- **Data**: Date and time in format `DD/MM/YY HH:MM`
- **Ocorrência**: Incident type (Tiroteio, Disparos ouvidos, Incêndio, Utilidade Pública)
- **Bairro**: Neighborhood name
- **Município**: City name
- **Estado**: State abbreviation (RJ, SP, CE)

## Implementation

### Technology Stack
- **Scraper**: Cheerio (HTML parsing) or Playwright (if JS rendering needed)
- **HTTP Client**: node-fetch or axios
- **Scheduler**: node-cron or Next.js Vercel Cron
- **Logging**: Winston or Pino

### File Structure
```
/src
  /lib
    /scraper
      ott-scraper.ts        # Main scraper logic
      parser.ts             # HTML parsing
      geocoder.ts           # Lat/long resolution
      deduplicator.ts       # Duplicate detection
      types.ts              # TypeScript types
  /services
    incident-service.ts     # Database operations
  /jobs
    scrape-ott-cron.ts      # Cron job entry point
```

## Core Components

### 1. OTT Scraper (ott-scraper.ts)

```typescript
/**
 * Main scraper class that orchestrates the scraping process
 */
export class OttScraper {
  private readonly url = 'https://ondetemtiroteio.com/reportview.php';
  private readonly parser: OttParser;
  private readonly geocoder: Geocoder;
  private readonly incidentService: IncidentService;

  constructor() {
    this.parser = new OttParser();
    this.geocoder = new Geocoder();
    this.incidentService = new IncidentService();
  }

  /**
   * Execute a full scraping cycle
   * @returns Summary of scraping results
   */
  async scrape(): Promise<ScrapingResult> {
    const logId = await this.createScraperLog();
    const startTime = Date.now();

    try {
      // 1. Fetch HTML
      const html = await this.fetchPage();

      // 2. Parse incidents from HTML
      const rawIncidents = await this.parser.parse(html);

      // 3. Geocode locations (add lat/long)
      const geocodedIncidents = await this.geocoder.batchGeocode(rawIncidents);

      // 4. Filter duplicates
      const newIncidents = await this.deduplicator.filter(geocodedIncidents);

      // 5. Save to database
      const savedCount = await this.incidentService.bulkInsert(newIncidents);

      // 6. Update log
      const duration = Date.now() - startTime;
      await this.updateScraperLog(logId, {
        status: 'SUCCESS',
        recordsFound: rawIncidents.length,
        recordsNew: savedCount,
        recordsDuplicate: rawIncidents.length - savedCount,
        durationMs: duration,
      });

      return {
        success: true,
        recordsFound: rawIncidents.length,
        recordsNew: savedCount,
        durationMs: duration,
      };
    } catch (error) {
      await this.handleError(logId, error);
      throw error;
    }
  }

  private async fetchPage(): Promise<string> {
    const response = await fetch(this.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SafePlaceBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }
}

export interface ScrapingResult {
  success: boolean;
  recordsFound: number;
  recordsNew: number;
  recordsDuplicate?: number;
  recordsFailed?: number;
  durationMs: number;
  error?: string;
}
```

### 2. HTML Parser (parser.ts)

```typescript
import * as cheerio from 'cheerio';

/**
 * Parses OTT HTML table into structured incident data
 */
export class OttParser {
  /**
   * Parse HTML and extract incidents
   */
  parse(html: string): RawIncident[] {
    const $ = cheerio.load(html);
    const incidents: RawIncident[] = [];

    // Find the main table
    $('table').each((_, table) => {
      // Skip if not the main incidents table
      const headers = $(table).find('th').map((_, el) => $(el).text().trim()).get();
      if (!headers.includes('Ocorrência')) return;

      // Parse each row
      $(table).find('tbody tr').each((_, row) => {
        try {
          const cells = $(row).find('td').map((_, el) => $(el).text().trim()).get();

          if (cells.length >= 5) {
            const incident = this.parseRow(cells);
            if (incident) {
              incidents.push(incident);
            }
          }
        } catch (error) {
          console.error('Error parsing row:', error);
          // Continue with next row
        }
      });
    });

    return incidents;
  }

  /**
   * Parse a single table row into an incident
   */
  private parseRow(cells: string[]): RawIncident | null {
    try {
      const [dateStr, occurrenceStr, neighborhood, municipality, state] = cells;

      // Parse date: "03/11/25 14:30" -> Date object
      const occurredAt = this.parseDate(dateStr);
      if (!occurredAt) return null;

      // Parse incident type
      const incidentType = this.parseIncidentType(occurrenceStr);
      if (!incidentType) return null;

      return {
        occurredAt,
        incidentType,
        neighborhood: neighborhood.trim(),
        municipality: municipality.trim(),
        state: state.trim(),
        source: 'OTT',
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse row:', cells, error);
      return null;
    }
  }

  /**
   * Parse date string "DD/MM/YY HH:MM" to Date object
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Format: "03/11/25 14:30"
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);

      // Assume 2000s for year
      const fullYear = year + 2000;

      const date = new Date(fullYear, month - 1, day, hour, minute);

      // Validate
      if (isNaN(date.getTime())) return null;

      return date;
    } catch {
      return null;
    }
  }

  /**
   * Map occurrence string to IncidentType enum
   */
  private parseIncidentType(occurrenceStr: string): IncidentType | null {
    const normalized = occurrenceStr.toLowerCase().trim();

    const mapping: Record<string, IncidentType> = {
      'tiroteio': IncidentType.TIROTEIO,
      'disparos ouvidos': IncidentType.DISPAROS_OUVIDOS,
      'incêndio': IncidentType.INCENDIO,
      'incendio': IncidentType.INCENDIO,
      'utilidade pública': IncidentType.UTILIDADE_PUBLICA,
      'utilidade publica': IncidentType.UTILIDADE_PUBLICA,
    };

    return mapping[normalized] || null;
  }
}

export interface RawIncident {
  occurredAt: Date;
  incidentType: IncidentType;
  neighborhood: string;
  municipality: string;
  state: string;
  source: string;
  scrapedAt: Date;
}

export enum IncidentType {
  TIROTEIO = 'TIROTEIO',
  DISPAROS_OUVIDOS = 'DISPAROS_OUVIDOS',
  INCENDIO = 'INCENDIO',
  UTILIDADE_PUBLICA = 'UTILIDADE_PUBLICA',
}
```

### 3. Geocoder (geocoder.ts)

```typescript
/**
 * Resolves neighborhood + municipality + state to lat/long coordinates
 * Uses caching to avoid repeated geocoding of same locations
 */
export class Geocoder {
  private cache: Map<string, GeocodedLocation> = new Map();
  private readonly provider: GeocodingProvider;

  constructor() {
    // Use OpenStreetMap Nominatim (free) or Google Maps API (paid)
    this.provider = new NominatimProvider();
  }

  /**
   * Geocode multiple incidents in batch
   */
  async batchGeocode(incidents: RawIncident[]): Promise<GeocodedIncident[]> {
    const results: GeocodedIncident[] = [];

    for (const incident of incidents) {
      const location = await this.geocode(
        incident.neighborhood,
        incident.municipality,
        incident.state
      );

      results.push({
        ...incident,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
    }

    return results;
  }

  /**
   * Geocode a single location
   */
  async geocode(
    neighborhood: string,
    municipality: string,
    state: string
  ): Promise<GeocodedLocation | null> {
    const cacheKey = `${neighborhood}|${municipality}|${state}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Build query string
      const query = `${neighborhood}, ${municipality}, ${state}, Brazil`;

      // Call geocoding provider
      const result = await this.provider.geocode(query);

      if (result) {
        this.cache.set(cacheKey, result);
        return result;
      }

      return null;
    } catch (error) {
      console.error(`Geocoding failed for ${cacheKey}:`, error);
      return null;
    }
  }
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  confidence?: number; // 0-1
}

export interface GeocodedIncident extends RawIncident {
  latitude?: number;
  longitude?: number;
}

/**
 * Nominatim provider (OpenStreetMap - free but rate limited)
 */
class NominatimProvider {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests

  async geocode(query: string): Promise<GeocodedLocation | null> {
    // Respect rate limiting
    await this.throttle();

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SafePlace/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        confidence: parseFloat(data[0].importance || 0.5),
      };
    }

    return null;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }
}
```

### 4. Deduplicator (deduplicator.ts)

```typescript
/**
 * Prevents duplicate incidents from being inserted
 * Uses source + composite key for deduplication
 */
export class Deduplicator {
  constructor(private incidentService: IncidentService) {}

  /**
   * Filter out incidents that already exist in database
   */
  async filter(incidents: GeocodedIncident[]): Promise<GeocodedIncident[]> {
    const newIncidents: GeocodedIncident[] = [];

    for (const incident of incidents) {
      const exists = await this.exists(incident);
      if (!exists) {
        newIncidents.push(incident);
      }
    }

    return newIncidents;
  }

  /**
   * Check if incident already exists in database
   */
  private async exists(incident: GeocodedIncident): Promise<boolean> {
    // Generate unique identifier from incident data
    const sourceId = this.generateSourceId(incident);

    // Check database
    const existing = await this.incidentService.findBySourceId('OTT', sourceId);

    return !!existing;
  }

  /**
   * Generate unique source ID from incident data
   * Format: {occurred_at}_{municipality}_{neighborhood}_{type}
   */
  private generateSourceId(incident: GeocodedIncident): string {
    const timestamp = incident.occurredAt.toISOString();
    const parts = [
      timestamp,
      incident.municipality,
      incident.neighborhood,
      incident.incidentType,
    ];

    return parts.join('_').toLowerCase().replace(/\s+/g, '-');
  }
}
```

### 5. Incident Service (incident-service.ts)

```typescript
import { PrismaClient } from '@prisma/client';

/**
 * Database operations for incidents
 */
export class IncidentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Bulk insert incidents with PostGIS geography
   */
  async bulkInsert(incidents: GeocodedIncident[]): Promise<number> {
    let insertedCount = 0;

    for (const incident of incidents) {
      try {
        // Calculate severity score
        const severityScore = this.calculateSeverityScore(incident.incidentType);

        // Generate source ID
        const sourceId = this.generateSourceId(incident);

        // Insert with PostGIS point
        await this.prisma.$executeRaw`
          INSERT INTO incidents (
            id,
            occurred_at,
            scraped_at,
            neighborhood,
            municipality,
            state,
            latitude,
            longitude,
            location,
            incident_type,
            severity_score,
            source,
            source_id,
            verified
          ) VALUES (
            gen_random_uuid(),
            ${incident.occurredAt},
            ${incident.scrapedAt},
            ${incident.neighborhood},
            ${incident.municipality},
            ${incident.state},
            ${incident.latitude},
            ${incident.longitude},
            ST_SetSRID(ST_MakePoint(${incident.longitude}, ${incident.latitude}), 4326)::geography,
            ${incident.incidentType}::incident_type,
            ${severityScore},
            ${incident.source},
            ${sourceId},
            false
          )
          ON CONFLICT (source, source_id) DO NOTHING
        `;

        insertedCount++;
      } catch (error) {
        console.error('Failed to insert incident:', error);
        // Continue with next incident
      }
    }

    return insertedCount;
  }

  /**
   * Find incident by source and source_id
   */
  async findBySourceId(source: string, sourceId: string) {
    return this.prisma.incident.findUnique({
      where: {
        source_source_id: {
          source,
          source_id: sourceId,
        },
      },
    });
  }

  /**
   * Calculate severity score based on incident type
   */
  private calculateSeverityScore(type: IncidentType): number {
    const scores: Record<IncidentType, number> = {
      [IncidentType.TIROTEIO]: 10,
      [IncidentType.DISPAROS_OUVIDOS]: 5,
      [IncidentType.INCENDIO]: 6,
      [IncidentType.UTILIDADE_PUBLICA]: 2,
    };

    return scores[type] || 5;
  }

  private generateSourceId(incident: GeocodedIncident): string {
    const timestamp = incident.occurredAt.toISOString();
    return `${timestamp}_${incident.municipality}_${incident.neighborhood}_${incident.incidentType}`
      .toLowerCase()
      .replace(/\s+/g, '-');
  }
}
```

## Cron Job Implementation

### Using Vercel Cron (Recommended for Production)

```typescript
// /app/api/cron/scrape-ott/route.ts

import { NextResponse } from 'next/server';
import { OttScraper } from '@/lib/scraper/ott-scraper';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

/**
 * Vercel Cron endpoint
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/scrape-ott",
 *     "schedule": "* * * * *"  // Every minute
 *   }]
 * }
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const scraper = new OttScraper();
    const result = await scraper.scrape();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Scraper cron job failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

### Using node-cron (for Local Development)

```typescript
// /src/jobs/scrape-ott-cron.ts

import cron from 'node-cron';
import { OttScraper } from '@/lib/scraper/ott-scraper';

/**
 * Start cron job for local development
 * Run every minute: "* * * * *"
 */
export function startScraperCron() {
  const scraper = new OttScraper();

  // Every minute
  cron.schedule('* * * * *', async () => {
    console.log('Starting OTT scraper cron job...');

    try {
      const result = await scraper.scrape();
      console.log('Scraper completed:', result);
    } catch (error) {
      console.error('Scraper failed:', error);
    }
  });

  console.log('OTT scraper cron job started (every 1 minute)');
}
```

## Error Handling

### Retry Strategy
```typescript
class RetryableScraper {
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000; // 5 seconds

  async scrapeWithRetry(): Promise<ScrapingResult> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.scrape();
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }

        console.log(`Attempt ${attempt} failed, retrying in ${this.retryDelayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
      }
    }

    throw new Error('All retry attempts failed');
  }
}
```

### Error Types
- **NetworkError**: Failed to fetch page (timeout, DNS, etc)
- **ParseError**: HTML structure changed
- **GeocodingError**: Failed to geocode location
- **DatabaseError**: Failed to insert records

### Monitoring & Alerts
- Alert if scraper fails 3+ times in a row
- Alert if no new records for 10+ minutes
- Alert if parsing success rate < 90%
- Daily summary report via email/Slack

## Performance Optimization

### Batch Processing
- Insert incidents in batches of 100
- Use database transactions for atomicity

### Caching
- Cache geocoded locations indefinitely (neighborhoods don't move)
- Use Redis for distributed caching in production

### Rate Limiting
- Respect OTT server: max 1 request per minute
- Add User-Agent header to identify bot
- Implement exponential backoff on errors

## Testing

### Unit Tests
```typescript
describe('OttParser', () => {
  it('should parse date string correctly', () => {
    const parser = new OttParser();
    const date = parser['parseDate']('03/11/25 14:30');
    expect(date).toEqual(new Date(2025, 10, 3, 14, 30));
  });

  it('should map occurrence types', () => {
    const parser = new OttParser();
    expect(parser['parseIncidentType']('Tiroteio')).toBe(IncidentType.TIROTEIO);
    expect(parser['parseIncidentType']('Disparos ouvidos')).toBe(IncidentType.DISPAROS_OUVIDOS);
  });
});
```

### Integration Tests
```typescript
describe('OttScraper', () => {
  it('should scrape and insert incidents', async () => {
    const scraper = new OttScraper();
    const result = await scraper.scrape();

    expect(result.success).toBe(true);
    expect(result.recordsFound).toBeGreaterThan(0);
  });
});
```

## Deployment Checklist

- [ ] Configure `CRON_SECRET` environment variable
- [ ] Set up database connection with PostGIS
- [ ] Configure vercel.json with cron schedule
- [ ] Set up error monitoring (Sentry)
- [ ] Configure log aggregation
- [ ] Test cron endpoint manually
- [ ] Monitor first 24 hours of data collection
- [ ] Set up alerting for failures
