import { NextRequest, NextResponse } from 'next/server';
import { OttScraper } from '@/lib/scraper/ott-scraper';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

/**
 * Vercel Cron endpoint
 * Runs every hour to scrape OTT data
 *
 * Schedule (in vercel.json):
 * "0 * * * *" = Every hour at minute 0
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 Cron job triggered - Starting OTT scraper...');

    // Run scraper
    const scraper = new OttScraper();
    const result = await scraper.scrape();

    // Return results
    return NextResponse.json({
      success: result.success,
      recordsFound: result.recordsFound,
      recordsNew: result.recordsNew,
      recordsDuplicate: result.recordsDuplicate,
      durationMs: result.durationMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
