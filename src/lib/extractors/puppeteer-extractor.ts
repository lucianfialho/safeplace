import { PropertyType, BusinessContext } from '@prisma/client';
import { QuintoAndarUrlParser } from './url-parser';
import { PropertyData, ExtractionError, ExtractionErrorCode } from './types';

/**
 * Extracts property data from Quinto Andar using Puppeteer (headless browser)
 * This is needed because Quinto Andar uses client-side rendering
 */
export class PuppeteerExtractor {
  private readonly urlParser: QuintoAndarUrlParser;
  private lastRequestTime = 0;
  private readonly minIntervalMs = 2000; // 2 seconds between requests

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

    const normalizedUrl = this.urlParser.normalizeUrl(url)!;

    let browser;
    try {
      // Dynamic import to avoid loading Puppeteer in all environments
      const puppeteer = await import('puppeteer-core');
      const chromium = await import('@sparticuz/chromium');

      // Launch browser
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });

      const page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to page
      await page.goto(normalizedUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content to load
      await page.waitForSelector('body', { timeout: 10000 });

      // Extract __NEXT_DATA__ from the page
      const nextDataScript = await page.evaluate(() => {
        const script = document.querySelector('#__NEXT_DATA__');
        return script ? script.textContent : null;
      });

      if (!nextDataScript) {
        throw new ExtractionError(
          '__NEXT_DATA__ script not found',
          ExtractionErrorCode.PARSE_FAILED
        );
      }

      // Parse and extract property data
      const nextData = JSON.parse(nextDataScript);
      const listing = this.findListingInNextData(nextData);

      if (!listing) {
        throw new ExtractionError(
          'Listing data not found in __NEXT_DATA__',
          ExtractionErrorCode.PARSE_FAILED
        );
      }

      // Map to PropertyData
      const propertyData: PropertyData = {
        qaListingId: listingId,
        qaUrl: normalizedUrl,
        latitude: listing.latitude || listing.lat || listing.location?.latitude,
        longitude: listing.longitude || listing.lng || listing.location?.longitude,
        address: listing.address || listing.street || listing.location?.address,
        neighborhood: listing.neighborhood || listing.regionName || listing.location?.neighborhood,
        municipality: listing.city || listing.location?.city || 'Rio de Janeiro',
        state: listing.state || listing.location?.state || 'RJ',
        price: listing.rent ? this.toCents(listing.rent) : undefined,
        condominiumFee: listing.condo ? this.toCents(listing.condo) : undefined,
        iptu: listing.iptu ? this.toCents(listing.iptu) : undefined,
        totalArea: listing.area || listing.usableAreas,
        bedroomCount: listing.bedrooms || listing.rooms,
        bathroomCount: listing.bathrooms,
        suiteCount: listing.suites,
        parkingSlots: listing.parkingSpaces || listing.garageSpaces,
        isFurnished: listing.furnished,
        propertyType: this.mapPropertyType(listing.type || listing.propertyType),
        businessContext: this.mapBusinessContext(listing.rent, listing.salePrice),
      };

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
    } catch (error) {
      if (error instanceof ExtractionError) throw error;

      throw new ExtractionError(
        'Failed to extract property data',
        ExtractionErrorCode.PARSE_FAILED,
        { originalError: error }
      );
    } finally {
      if (browser) {
        await browser.close();
      }
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
    const priorityKeys = [
      'listing',
      'property',
      'house',
      'apartment',
      'pageProps',
      'initialData',
      'props',
      'data',
    ];
    for (const key of priorityKeys) {
      if (obj[key]) {
        const result = this.findListingInNextData(obj[key], depth + 1);
        if (result) return result;
      }
    }

    // Recursively search all other keys
    for (const key of Object.keys(obj)) {
      if (!priorityKeys.includes(key) && typeof obj[key] === 'object') {
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
    const hasCoordinates =
      (typeof obj.latitude === 'number' && typeof obj.longitude === 'number') ||
      (typeof obj.lat === 'number' && typeof obj.lng === 'number') ||
      (obj.location && typeof obj.location.latitude === 'number');

    const hasLocation =
      obj.neighborhood || obj.regionName || obj.city || (obj.location && obj.location.city);

    return obj && typeof obj === 'object' && hasCoordinates && hasLocation;
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
