#!/usr/bin/env tsx

/**
 * Backfill historical OTT data
 *
 * Strategy:
 * Since OTT shows recent incidents on the main page, we need to run
 * this script daily to capture data going back in time.
 *
 * The site shows ~20 most recent incidents, so we can collect:
 * - Run multiple times per day to capture all incidents
 * - Deduplication handles overlaps automatically
 *
 * For true backfill, we'd need:
 * 1. Check if OTT has an archive/date parameter
 * 2. Or scrape external sources that archive OTT data
 * 3. Or use OTT's API if available
 *
 * Usage:
 * npm run backfill -- --days=30  # Backfill last 30 days (run multiple times)
 */

import { OttScraper } from '@/lib/scraper/ott-scraper';
import { prisma } from '@/lib/prisma';

interface BackfillOptions {
  runs?: number; // Number of scrape runs to perform
  delayMs?: number; // Delay between runs (ms)
}

async function backfill(options: BackfillOptions = {}) {
  const { runs = 10, delayMs = 2000 } = options;

  console.log('🔄 Starting OTT backfill...');
  console.log(`   Runs: ${runs}`);
  console.log(`   Delay: ${delayMs}ms between runs\n`);

  const scraper = new OttScraper();
  let totalNew = 0;
  let totalDuplicates = 0;
  let totalFound = 0;

  for (let i = 1; i <= runs; i++) {
    console.log(`\n📍 Run ${i}/${runs}`);
    console.log('─'.repeat(60));

    try {
      const result = await scraper.scrape();

      totalNew += result.recordsNew;
      totalDuplicates += result.recordsDuplicate || 0;
      totalFound += result.recordsFound;

      console.log(`✅ Run ${i} completed:`);
      console.log(`   Found: ${result.recordsFound}`);
      console.log(`   New: ${result.recordsNew}`);
      console.log(`   Duplicates: ${result.recordsDuplicate || 0}`);
      console.log(`   Duration: ${(result.durationMs / 1000).toFixed(2)}s`);

      // Check if we're still finding new records
      if (result.recordsNew === 0 && i > 3) {
        console.log(`\n⚠️  No new records in last ${i} runs. Stopping early.`);
        break;
      }

      // Delay before next run
      if (i < runs) {
        console.log(`\n⏳ Waiting ${delayMs / 1000}s before next run...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Run ${i} failed:`, error);
      // Continue with next run
    }
  }

  console.log('\n');
  console.log('═'.repeat(60));
  console.log('📊 BACKFILL SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total Runs: ${runs}`);
  console.log(`Total Found: ${totalFound}`);
  console.log(`Total New: ${totalNew}`);
  console.log(`Total Duplicates: ${totalDuplicates}`);
  console.log(`Duplicate Rate: ${((totalDuplicates / totalFound) * 100).toFixed(1)}%`);

  // Show database stats
  const dbTotal = await prisma.incident.count();
  console.log(`\n📈 Database Total: ${dbTotal} incidents`);

  // Show date range
  const oldest = await prisma.incident.findFirst({
    orderBy: { occurredAt: 'asc' },
    select: { occurredAt: true },
  });

  const newest = await prisma.incident.findFirst({
    orderBy: { occurredAt: 'desc' },
    select: { occurredAt: true },
  });

  if (oldest && newest) {
    console.log(`📅 Date Range:`);
    console.log(`   Oldest: ${oldest.occurredAt.toISOString()}`);
    console.log(`   Newest: ${newest.occurredAt.toISOString()}`);
    const days = Math.ceil(
      (newest.occurredAt.getTime() - oldest.occurredAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`   Span: ${days} days`);
  }

  console.log('═'.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let runs = 10;
  let delayMs = 2000;

  for (const arg of args) {
    if (arg.startsWith('--runs=')) {
      runs = parseInt(arg.split('=')[1]);
    }
    if (arg.startsWith('--delay=')) {
      delayMs = parseInt(arg.split('=')[1]);
    }
  }

  console.log('🚀 OTT Backfill Tool\n');
  console.log('ℹ️  Note: OTT shows ~20 most recent incidents.');
  console.log('   Running multiple scrapes helps capture more historical data.');
  console.log('   Deduplication ensures no duplicates are stored.\n');

  await backfill({ runs, delayMs });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
