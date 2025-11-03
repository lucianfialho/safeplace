# Quinto Andar Extractor Specification

## Overview
Service that extracts property data from Quinto Andar URLs, including listing ID, location coordinates, and property details needed for safety score calculation.

## Supported URL Formats

### Property Listing URLs
```
https://www.quintoandar.com.br/imovel/893321695
https://www.quintoandar.com.br/imovel/893321695/detalhes
https://www.quintoandar.com.br/aluguel/imovel/893321695
https://quintoandar.com.br/imovel/893321695
```

### URL Pattern Extraction
```typescript
const LISTING_ID_PATTERN = /\/imovel\/(\d+)/;
```

## Implementation Strategy

### Approach 1: Client-Side Extraction (Recommended for MVP)
When user inputs a Quinto Andar URL, we scrape the public page to extract data.

**Pros:**
- No authentication needed
- Works immediately
- Access to all public data

**Cons:**
- Slower (requires page load)
- May break if HTML changes
- Rate limiting concerns

### Approach 2: API Endpoint Usage (Future Enhancement)
Use the Quinto Andar internal APIs (from your curl examples).

**Pros:**
- Faster
- Structured JSON responses
- More reliable

**Cons:**
- Requires authentication/cookies
- May detect automated access
- Could violate ToS

**MVP Decision: Use Approach 1 (scraping) for proof of concept, migrate to Approach 2 if we can establish legitimate API access**

## File Structure

```
/src
  /lib
    /extractors
      quinto-andar-extractor.ts    # Main extractor
      url-parser.ts                 # URL parsing utilities
      types.ts                      # TypeScript types
  /services
    property-service.ts             # Database operations
```

## Core Components

### 1. URL Parser (url-parser.ts)

```typescript
/**
 * Parses and validates Quinto Andar URLs
 */
export class QuintoAndarUrlParser {
  private readonly VALID_DOMAINS = [
    'quintoandar.com.br',
    'www.quintoandar.com.br',
  ];

  private readonly LISTING_ID_PATTERN = /\/imovel\/(\d+)/;

  /**
   * Extract listing ID from URL
   */
  extractListingId(url: string): string | null {
    try {
      const parsedUrl = new URL(url);

      // Validate domain
      if (!this.VALID_DOMAINS.includes(parsedUrl.hostname)) {
        return null;
      }

      // Extract ID from path
      const match = parsedUrl.pathname.match(this.LISTING_ID_PATTERN);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Validate if URL is a Quinto Andar property listing
   */
  isValidPropertyUrl(url: string): boolean {
    return this.extractListingId(url) !== null;
  }

  /**
   * Normalize URL to standard format
   */
  normalizeUrl(url: string): string | null {
    const listingId = this.extractListingId(url);
    if (!listingId) return null;

    return `https://www.quintoandar.com.br/imovel/${listingId}`;
  }
}
```

### 2. Quinto Andar Extractor (quinto-andar-extractor.ts)

```typescript
import * as cheerio from 'cheerio';
import { PropertyService } from '@/services/property-service';

/**
 * Extracts property data from Quinto Andar listings
 */
export class QuintoAndarExtractor {
  private readonly urlParser: QuintoAndarUrlParser;
  private readonly propertyService: PropertyService;

  constructor(propertyService: PropertyService) {
    this.urlParser = new QuintoAndarUrlParser();
    this.propertyService = propertyService;
  }

  /**
   * Extract complete property data from URL
   * Uses caching to avoid repeated scraping
   */
  async extractFromUrl(url: string): Promise<PropertyData | null> {
    // Parse and validate URL
    const listingId = this.urlParser.extractListingId(url);
    if (!listingId) {
      throw new Error('Invalid Quinto Andar URL');
    }

    // Check cache first
    const cached = await this.propertyService.findByListingId(listingId);
    if (cached && this.isCacheValid(cached)) {
      return this.mapToPropertyData(cached);
    }

    // Scrape property page
    const normalizedUrl = this.urlParser.normalizeUrl(url)!;
    const html = await this.fetchPage(normalizedUrl);

    // Extract data using multiple strategies
    const propertyData = await this.extractFromHtml(html, listingId, normalizedUrl);

    if (!propertyData) {
      throw new Error('Failed to extract property data');
    }

    // Save to cache
    await this.propertyService.upsert(propertyData);

    return propertyData;
  }

  /**
   * Fetch property page HTML
   */
  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Extract property data from HTML
   * Uses multiple strategies to maximize extraction success
   */
  private async extractFromHtml(
    html: string,
    listingId: string,
    url: string
  ): Promise<PropertyData | null> {
    const $ = cheerio.load(html);

    // Strategy 1: Extract from structured data (JSON-LD)
    let data = this.extractFromJsonLd($);

    // Strategy 2: Extract from meta tags
    if (!data?.latitude || !data?.longitude) {
      const metaData = this.extractFromMetaTags($);
      data = { ...data, ...metaData };
    }

    // Strategy 3: Extract from page content
    if (!data?.latitude || !data?.longitude) {
      const contentData = this.extractFromContent($);
      data = { ...data, ...contentData };
    }

    // Strategy 4: Extract from Next.js data (window.__NEXT_DATA__)
    if (!data?.latitude || !data?.longitude) {
      const nextData = this.extractFromNextData(html);
      data = { ...data, ...nextData };
    }

    // Validate required fields
    if (!data?.latitude || !data?.longitude) {
      throw new Error('Could not extract coordinates from property page');
    }

    return {
      qaListingId: listingId,
      qaUrl: url,
      ...data,
    };
  }

  /**
   * Extract from JSON-LD structured data
   */
  private extractFromJsonLd($: cheerio.CheerioAPI): Partial<PropertyData> {
    const jsonLdScript = $('script[type="application/ld+json"]').first().html();
    if (!jsonLdScript) return {};

    try {
      const jsonLd = JSON.parse(jsonLdScript);

      // Look for Place or RealEstateListing schema
      if (jsonLd['@type'] === 'Place' && jsonLd.geo) {
        return {
          latitude: parseFloat(jsonLd.geo.latitude),
          longitude: parseFloat(jsonLd.geo.longitude),
          address: jsonLd.address?.streetAddress,
          neighborhood: jsonLd.address?.addressLocality,
          municipality: jsonLd.address?.addressRegion,
        };
      }

      if (jsonLd['@type'] === 'RealEstateListing') {
        return {
          price: this.parsePriceFromString(jsonLd.offers?.price),
          propertyType: this.parsePropertyType(jsonLd.name || jsonLd.description),
        };
      }
    } catch (error) {
      console.error('Failed to parse JSON-LD:', error);
    }

    return {};
  }

  /**
   * Extract from meta tags
   */
  private extractFromMetaTags($: cheerio.CheerioAPI): Partial<PropertyData> {
    const data: Partial<PropertyData> = {};

    // OpenGraph tags
    const ogType = $('meta[property="og:type"]').attr('content');
    if (ogType === 'place') {
      data.latitude = parseFloat($('meta[property="place:location:latitude"]').attr('content') || '');
      data.longitude = parseFloat($('meta[property="place:location:longitude"]').attr('content') || '');
    }

    // Description
    const description = $('meta[name="description"]').attr('content');
    if (description) {
      // Try to extract price from description
      const priceMatch = description.match(/R\$\s*([\d.,]+)/);
      if (priceMatch) {
        data.price = this.parsePriceFromString(priceMatch[1]);
      }
    }

    return data;
  }

  /**
   * Extract from page content
   */
  private extractFromContent($: cheerio.CheerioAPI): Partial<PropertyData> {
    const data: Partial<PropertyData> = {};

    // Look for price in common class names
    const priceElement = $(
      '[class*="price"], [class*="valor"], [class*="Price"], [data-testid*="price"]'
    ).first();

    if (priceElement.length) {
      const priceText = priceElement.text();
      data.price = this.parsePriceFromString(priceText);
    }

    // Look for address/neighborhood
    const addressElement = $(
      '[class*="address"], [class*="endereco"], [class*="Address"]'
    ).first();

    if (addressElement.length) {
      const addressText = addressElement.text();
      // Parse "Copacabana, Rio de Janeiro - RJ"
      const parts = addressText.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        data.neighborhood = parts[0];
        const cityState = parts[1].split('-').map(s => s.trim());
        if (cityState.length >= 2) {
          data.municipality = cityState[0];
          data.state = cityState[1];
        }
      }
    }

    // Look for bedrooms/bathrooms
    const bedroomMatch = $.text().match(/(\d+)\s*quarto/i);
    if (bedroomMatch) {
      data.bedroomCount = parseInt(bedroomMatch[1]);
    }

    const bathroomMatch = $.text().match(/(\d+)\s*banheiro/i);
    if (bathroomMatch) {
      data.bathroomCount = parseInt(bathroomMatch[1]);
    }

    return data;
  }

  /**
   * Extract from Next.js __NEXT_DATA__ script
   * This often contains the full API response data
   */
  private extractFromNextData(html: string): Partial<PropertyData> {
    try {
      const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
      if (!match) return {};

      const nextData = JSON.parse(match[1]);

      // Navigate through Next.js data structure
      // Structure may be: nextData.props.pageProps.initialData.listing
      const listing = this.findListingInNextData(nextData);

      if (listing) {
        return {
          latitude: listing.latitude,
          longitude: listing.longitude,
          address: listing.address,
          neighborhood: listing.neighborhood || listing.regionName,
          municipality: listing.city,
          state: listing.state,
          price: listing.rent || listing.price,
          condominiumFee: listing.condo,
          iptu: listing.iptu,
          totalArea: listing.area,
          bedroomCount: listing.bedrooms,
          bathroomCount: listing.bathrooms,
          suiteCount: listing.suites,
          parkingSlots: listing.parkingSpaces,
          isFurnished: listing.furnished,
          propertyType: listing.type,
          businessContext: listing.businessContext,
        };
      }
    } catch (error) {
      console.error('Failed to parse __NEXT_DATA__:', error);
    }

    return {};
  }

  /**
   * Recursively search for listing data in Next.js data
   */
  private findListingInNextData(obj: any): any {
    if (!obj || typeof obj !== 'object') return null;

    // Check if current object is the listing
    if (obj.latitude && obj.longitude && (obj.address || obj.neighborhood)) {
      return obj;
    }

    // Recursively search
    for (const key of Object.keys(obj)) {
      if (key === 'listing' || key === 'property' || key === 'house') {
        const result = this.findListingInNextData(obj[key]);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Parse price string to cents
   * "R$ 1.330,00" -> 133000
   */
  private parsePriceFromString(priceStr: string): number {
    if (!priceStr) return 0;

    // Remove non-numeric except comma and period
    const cleaned = priceStr.replace(/[^\d.,]/g, '');

    // Handle Brazilian format: 1.330,00
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');

    const value = parseFloat(normalized);
    return isNaN(value) ? 0 : Math.round(value * 100); // Convert to cents
  }

  /**
   * Parse property type from text
   */
  private parsePropertyType(text: string): PropertyType {
    const normalized = text.toLowerCase();

    if (normalized.includes('apartamento')) return PropertyType.APARTMENT;
    if (normalized.includes('casa')) return PropertyType.HOUSE;
    if (normalized.includes('studio') || normalized.includes('estúdio')) return PropertyType.STUDIO;
    if (normalized.includes('kitnet')) return PropertyType.KITCHENETTE;
    if (normalized.includes('loft')) return PropertyType.LOFT;
    if (normalized.includes('cobertura')) return PropertyType.PENTHOUSE;

    return PropertyType.APARTMENT; // Default
  }

  /**
   * Check if cached property data is still valid
   * Cache for 7 days since property data rarely changes
   */
  private isCacheValid(cached: any): boolean {
    const cacheAgeMs = Date.now() - cached.lastAnalyzedAt.getTime();
    const maxCacheAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    return cacheAgeMs < maxCacheAgeMs;
  }
}

export interface PropertyData {
  qaListingId: string;
  qaUrl: string;

  // Location
  address?: string;
  neighborhood: string;
  municipality: string;
  state: string;
  latitude: number;
  longitude: number;

  // Property details
  propertyType?: PropertyType;
  businessContext?: BusinessContext;
  price?: number; // in cents
  condominiumFee?: number;
  iptu?: number;
  totalArea?: number;

  // Features
  bedroomCount?: number;
  bathroomCount?: number;
  suiteCount?: number;
  parkingSlots?: number;
  isFurnished?: boolean;
}

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  STUDIO = 'STUDIO',
  KITCHENETTE = 'KITCHENETTE',
  LOFT = 'LOFT',
  PENTHOUSE = 'PENTHOUSE',
}

export enum BusinessContext {
  RENT = 'RENT',
  SALE = 'SALE',
}
```

### 3. Property Service (property-service.ts)

```typescript
import { PrismaClient } from '@prisma/client';
import { PropertyData } from '@/lib/extractors/quinto-andar-extractor';

/**
 * Database operations for properties
 */
export class PropertyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find property by Quinto Andar listing ID
   */
  async findByListingId(listingId: string) {
    return this.prisma.property.findUnique({
      where: {
        qa_listing_id: listingId,
      },
    });
  }

  /**
   * Upsert property data
   */
  async upsert(data: PropertyData) {
    return this.prisma.$executeRaw`
      INSERT INTO properties (
        id,
        qa_listing_id,
        qa_url,
        address,
        neighborhood,
        municipality,
        state,
        latitude,
        longitude,
        location,
        property_type,
        business_context,
        price,
        condominium_fee,
        iptu,
        total_area,
        bedroom_count,
        bathroom_count,
        suite_count,
        parking_slots,
        is_furnished,
        first_analyzed_at,
        last_analyzed_at,
        analysis_count
      ) VALUES (
        gen_random_uuid(),
        ${data.qaListingId},
        ${data.qaUrl},
        ${data.address},
        ${data.neighborhood},
        ${data.municipality},
        ${data.state},
        ${data.latitude},
        ${data.longitude},
        ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography,
        ${data.propertyType}::property_type,
        ${data.businessContext}::business_context,
        ${data.price},
        ${data.condominiumFee},
        ${data.iptu},
        ${data.totalArea},
        ${data.bedroomCount},
        ${data.bathroomCount},
        ${data.suiteCount},
        ${data.parkingSlots},
        ${data.isFurnished},
        NOW(),
        NOW(),
        1
      )
      ON CONFLICT (qa_listing_id) DO UPDATE SET
        last_analyzed_at = NOW(),
        analysis_count = properties.analysis_count + 1,
        price = EXCLUDED.price,
        condominium_fee = EXCLUDED.condominium_fee
    `;
  }
}
```

## Alternative: Direct API Usage (Future)

If we can reliably use Quinto Andar's internal APIs:

```typescript
/**
 * Use Quinto Andar's internal API endpoints
 * Requires proper authentication and respecting ToS
 */
export class QuintoAndarApiClient {
  private readonly baseUrl = 'https://apigw.prod.quintoandar.com.br';

  /**
   * Get property details via internal API
   */
  async getPropertyDetails(listingId: string): Promise<PropertyData> {
    // Price suggestion endpoint (from your curl example)
    const response = await fetch(
      `${this.baseUrl}/customer-facing-bff-api/pricing-reports/v1/price-suggestion`,
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          id: listingId,
          // ... other required fields
        }),
      }
    );

    const data = await response.json();

    return {
      qaListingId: listingId,
      latitude: data.latitude,
      longitude: data.longitude,
      neighborhood: data.neighborhood,
      municipality: data.city,
      state: data.state,
      price: data.price * 100, // Convert to cents
      // ... map other fields
    };
  }
}
```

## Error Handling

### Extraction Errors
```typescript
export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: ExtractionErrorCode,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

export enum ExtractionErrorCode {
  INVALID_URL = 'INVALID_URL',
  FETCH_FAILED = 'FETCH_FAILED',
  MISSING_COORDINATES = 'MISSING_COORDINATES',
  PARSE_FAILED = 'PARSE_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
}
```

### Fallback Strategy
```typescript
// If extraction fails, try multiple strategies
async extractWithFallback(url: string): Promise<PropertyData> {
  const errors: Error[] = [];

  // Try strategy 1: Web scraping
  try {
    return await this.extractFromWeb(url);
  } catch (error) {
    errors.push(error as Error);
  }

  // Try strategy 2: API endpoint (if available)
  try {
    return await this.extractFromApi(url);
  } catch (error) {
    errors.push(error as Error);
  }

  // All strategies failed
  throw new ExtractionError(
    'All extraction strategies failed',
    ExtractionErrorCode.PARSE_FAILED,
    { errors }
  );
}
```

## Rate Limiting

```typescript
/**
 * Rate limiter to avoid overwhelming Quinto Andar servers
 */
export class RateLimiter {
  private lastRequestTime = 0;
  private readonly minIntervalMs = 1000; // 1 second between requests

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minIntervalMs - elapsed)
      );
    }

    this.lastRequestTime = Date.now();
  }
}
```

## Testing

### Unit Tests
```typescript
describe('QuintoAndarUrlParser', () => {
  const parser = new QuintoAndarUrlParser();

  it('should extract listing ID from URL', () => {
    const url = 'https://www.quintoandar.com.br/imovel/893321695';
    expect(parser.extractListingId(url)).toBe('893321695');
  });

  it('should return null for invalid URL', () => {
    expect(parser.extractListingId('https://google.com')).toBeNull();
  });

  it('should normalize URL', () => {
    const url = 'https://quintoandar.com.br/aluguel/imovel/123/detalhes';
    expect(parser.normalizeUrl(url)).toBe(
      'https://www.quintoandar.com.br/imovel/123'
    );
  });
});
```

### Integration Tests
```typescript
describe('QuintoAndarExtractor', () => {
  it('should extract property data from real URL', async () => {
    const extractor = new QuintoAndarExtractor(propertyService);
    const url = 'https://www.quintoandar.com.br/imovel/893321695';

    const data = await extractor.extractFromUrl(url);

    expect(data).toBeDefined();
    expect(data?.latitude).toBeDefined();
    expect(data?.longitude).toBeDefined();
    expect(data?.neighborhood).toBeDefined();
  });
});
```

## Deployment Considerations

### Legal/Ethical
- **Respect robots.txt**: Check Quinto Andar's robots.txt
- **Rate limiting**: Don't overwhelm their servers
- **User-Agent**: Identify our bot clearly
- **Caching**: Cache aggressively to minimize requests
- **Terms of Service**: Review and comply with ToS

### Performance
- **Cache property data for 7 days**
- **Use database connection pooling**
- **Implement circuit breaker for repeated failures**
- **Monitor extraction success rate**

### Monitoring
- Track extraction success rate (target: > 95%)
- Alert if extraction fails repeatedly
- Monitor response times from Quinto Andar
- Log all extraction attempts for debugging
