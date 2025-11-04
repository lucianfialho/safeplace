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

      // Navigate to the correct path: props.pageProps.initialState.house.houseInfo
      const houseInfo = nextData?.props?.pageProps?.initialState?.house?.houseInfo;

      if (!houseInfo) {
        console.error('houseInfo not found in expected path');
        return null;
      }

      // Map to PropertyData using the correct structure
      return {
        qaListingId: listingId,
        qaUrl: url,
        latitude: houseInfo.address?.lat,
        longitude: houseInfo.address?.lng,
        address: houseInfo.address?.street,
        neighborhood: houseInfo.address?.neighborhood,
        municipality: houseInfo.address?.city,
        state: houseInfo.address?.stateAcronym,
        price: houseInfo.rentPrice ? this.toCents(houseInfo.rentPrice) : undefined,
        condominiumFee: houseInfo.condoPrice ? this.toCents(houseInfo.condoPrice) : undefined,
        iptu: houseInfo.iptuPrice ? this.toCents(houseInfo.iptuPrice) : undefined,
        totalArea: houseInfo.area,
        bedroomCount: houseInfo.bedrooms,
        bathroomCount: houseInfo.bathrooms,
        suiteCount: houseInfo.suites,
        parkingSlots: houseInfo.parkingSpaces,
        isFurnished: houseInfo.furnished || false,
        propertyType: this.mapPropertyType(houseInfo.type),
        businessContext: this.mapBusinessContext(houseInfo.rentPrice, houseInfo.salePrice),
        placesNearby: houseInfo.placesNearby || undefined,
      };
    } catch (error) {
      console.error('Failed to parse __NEXT_DATA__:', error);
      return null;
    }
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
