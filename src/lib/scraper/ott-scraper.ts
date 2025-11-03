import { OttParser } from './parser';
import { Geocoder } from './geocoder';
import { IncidentService } from '@/services/incident-service';
import { ScrapingResult } from './types';
import { prisma } from '@/lib/prisma';

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
    this.incidentService = new IncidentService(prisma);
  }

  /**
   * Execute a full scraping cycle
   * @returns Summary of scraping results
   */
  async scrape(): Promise<ScrapingResult> {
    const startTime = Date.now();
    const logId = await this.createScraperLog();

    try {
      console.log('🕷️  Starting OTT scraper...');

      // 1. Fetch HTML
      console.log('📥 Fetching page...');
      const html = await this.fetchPage();

      // 2. Parse incidents from HTML
      console.log('🔍 Parsing incidents...');
      const rawIncidents = this.parser.parse(html);
      console.log(`   Found ${rawIncidents.length} incidents`);

      if (rawIncidents.length === 0) {
        throw new Error('No incidents found in page - HTML structure may have changed');
      }

      // 3. Geocode locations (add lat/long)
      console.log('🗺️  Geocoding locations...');
      const geocodedIncidents = await this.geocoder.batchGeocode(rawIncidents);

      const withCoords = geocodedIncidents.filter(i => i.latitude && i.longitude);
      console.log(`   Geocoded ${withCoords.length}/${rawIncidents.length} incidents`);

      // 4. Save to database
      console.log('💾 Saving to database...');
      const savedCount = await this.incidentService.bulkInsert(geocodedIncidents);
      console.log(`   Saved ${savedCount} new incidents`);

      // 5. Update log
      const duration = Date.now() - startTime;
      await this.updateScraperLog(logId, {
        status: 'SUCCESS',
        recordsFound: rawIncidents.length,
        recordsNew: savedCount,
        recordsDuplicate: rawIncidents.length - savedCount,
        durationMs: duration,
      });

      console.log(`✅ Scraping completed in ${duration}ms`);

      // Show geocoder cache stats
      const cacheStats = this.geocoder.getCacheStats();
      console.log(`📊 Geocoder cache: ${cacheStats.size} locations`);

      return {
        success: true,
        recordsFound: rawIncidents.length,
        recordsNew: savedCount,
        recordsDuplicate: rawIncidents.length - savedCount,
        durationMs: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.handleError(logId, error, duration);

      return {
        success: false,
        recordsFound: 0,
        recordsNew: 0,
        durationMs: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch the OTT page HTML
   */
  private async fetchPage(): Promise<string> {
    const response = await fetch(this.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SafePlaceBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Create a scraper log entry
   */
  private async createScraperLog(): Promise<string> {
    const log = await prisma.scraperLog.create({
      data: {
        status: 'RUNNING',
        environment: process.env.NODE_ENV || 'development',
      },
    });

    return log.id;
  }

  /**
   * Update scraper log with results
   */
  private async updateScraperLog(
    logId: string,
    data: {
      status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
      recordsFound: number;
      recordsNew: number;
      recordsDuplicate: number;
      durationMs: number;
    }
  ) {
    await prisma.scraperLog.update({
      where: { id: logId },
      data: {
        ...data,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Handle scraping errors
   */
  private async handleError(logId: string, error: unknown, durationMs: number) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('❌ Scraping failed:', errorMessage);

    await prisma.scraperLog.update({
      where: { id: logId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        durationMs,
        errorMessage,
        errorStack,
        recordsFound: 0,
        recordsNew: 0,
      },
    });
  }
}
