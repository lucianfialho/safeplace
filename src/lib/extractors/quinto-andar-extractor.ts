import { PropertyType, BusinessContext } from '@prisma/client';
import { QuintoAndarUrlParser } from './url-parser';
import { PropertyData, ExtractionError, ExtractionErrorCode } from './types';

/**
 * Extracts property data from Quinto Andar listings
 * Primary strategy: Extract from __NEXT_DATA__ script tag
 */
export class QuintoAndarExtractor {
  private readonly urlParser: QuintoAndarUrlParser;
  private lastRequestTime = 0;
  private readonly minIntervalMs = 1000; // 1 second between requests

  constructor() {
    this.urlParser = new QuintoAndarUrlParser();
  }

  /**
   * Extract complete property data from URL
   */
  async extractFromUrl(url: string): Promise<PropertyData> {
    // Parse and validate URL
    const listingId = this.urlParser.extractListingId(url);
    if (!listingId) {
      throw new ExtractionError('Invalid Quinto Andar URL', ExtractionErrorCode.INVALID_URL);
    }

    // Rate limiting
    await this.throttle();

    // Scrape property page
    const normalizedUrl = this.urlParser.normalizeUrl(url)!;
    const html = await this.fetchPage(normalizedUrl);

    // Extract data from __NEXT_DATA__
    const propertyData = this.extractFromNextData(html, listingId, normalizedUrl);

    if (!propertyData) {
      throw new ExtractionError(
        'Failed to extract property data from page',
        ExtractionErrorCode.PARSE_FAILED
      );
    }

    // Validate required fields
    if (!propertyData.latitude || !propertyData.longitude) {
      throw new ExtractionError(
        'Missing coordinates in property data',
        ExtractionErrorCode.MISSING_COORDINATES
      );
    }

    if (!propertyData.neighborhood || !propertyData.municipality) {
      throw new ExtractionError(
        'Missing location information',
        ExtractionErrorCode.PARSE_FAILED
      );
    }

    return propertyData;
  }

  /**
   * Fetch property page HTML
   */
  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      if (!response.ok) {
        throw new ExtractionError(
          `HTTP ${response.status}: ${response.statusText}`,
          ExtractionErrorCode.FETCH_FAILED,
          { status: response.status }
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof ExtractionError) throw error;

      throw new ExtractionError(
        'Failed to fetch property page',
        ExtractionErrorCode.FETCH_FAILED,
        { originalError: error }
      );
    }
  }

  /**
   * Extract from Next.js __NEXT_DATA__ script
   * This contains the full API response data
   */
  private extractFromNextData(
    html: string,
    listingId: string,
    url: string
  ): PropertyData | null {
    try {
      const match = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (!match) {
        console.error('__NEXT_DATA__ script not found');
        return null;
      }

      const nextData = JSON.parse(match[1]);

      // Navigate through Next.js data structure to find listing
      const listing = this.findListingInNextData(nextData);

      if (!listing) {
        console.error('Listing data not found in __NEXT_DATA__');
        return null;
      }

      // Map to PropertyData
      return {
        qaListingId: listingId,
        qaUrl: url,
        latitude: listing.latitude,
        longitude: listing.longitude,
        address: listing.address,
        neighborhood: listing.neighborhood || listing.regionName,
        municipality: listing.city,
        state: listing.state,
        price: listing.rent ? this.toCents(listing.rent) : undefined,
        condominiumFee: listing.condo ? this.toCents(listing.condo) : undefined,
        iptu: listing.iptu ? this.toCents(listing.iptu) : undefined,
        totalArea: listing.area,
        bedroomCount: listing.bedrooms,
        bathroomCount: listing.bathrooms,
        suiteCount: listing.suites,
        parkingSlots: listing.parkingSpaces,
        isFurnished: listing.furnished,
        propertyType: this.mapPropertyType(listing.type),
        businessContext: this.mapBusinessContext(listing.rent, listing.salePrice),
      };
    } catch (error) {
      console.error('Failed to parse __NEXT_DATA__:', error);
      return null;
    }
  }

  /**
   * Recursively search for listing data in Next.js data
   */
  private findListingInNextData(obj: any, depth = 0): any {
    if (!obj || typeof obj !== 'object' || depth > 10) return null;

    // Check if current object looks like a listing
    if (this.isListingObject(obj)) {
      return obj;
    }

    // Search in common keys first
    const priorityKeys = ['listing', 'property', 'house', 'apartment', 'pageProps', 'initialData'];
    for (const key of priorityKeys) {
      if (obj[key]) {
        const result = this.findListingInNextData(obj[key], depth + 1);
        if (result) return result;
      }
    }

    // Recursively search all other keys
    for (const key of Object.keys(obj)) {
      if (!priorityKeys.includes(key)) {
        const result = this.findListingInNextData(obj[key], depth + 1);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Check if object looks like a property listing
   */
  private isListingObject(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.latitude === 'number' &&
      typeof obj.longitude === 'number' &&
      (obj.neighborhood || obj.regionName || obj.city)
    );
  }

  /**
   * Convert value to cents
   */
  private toCents(value: number): number {
    return Math.round(value * 100);
  }

  /**
   * Map property type from Quinto Andar format
   */
  private mapPropertyType(type: string | undefined): PropertyType | undefined {
    if (!type) return undefined;

    const normalized = type.toLowerCase();

    if (normalized.includes('apartamento') || normalized.includes('apartment'))
      return PropertyType.APARTMENT;
    if (normalized.includes('casa') || normalized.includes('house')) return PropertyType.HOUSE;
    if (normalized.includes('studio') || normalized.includes('estúdio'))
      return PropertyType.STUDIO;
    if (normalized.includes('kitnet')) return PropertyType.KITCHENETTE;
    if (normalized.includes('loft')) return PropertyType.LOFT;
    if (normalized.includes('cobertura') || normalized.includes('penthouse'))
      return PropertyType.PENTHOUSE;

    return PropertyType.APARTMENT; // Default
  }

  /**
   * Map business context based on available price fields
   */
  private mapBusinessContext(
    rent: number | undefined,
    salePrice: number | undefined
  ): BusinessContext | undefined {
    if (rent && rent > 0) return BusinessContext.RENT;
    if (salePrice && salePrice > 0) return BusinessContext.SALE;
    return undefined;
  }

  /**
   * Rate limiter to avoid overwhelming servers
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
    }

    this.lastRequestTime = Date.now();
  }
}
