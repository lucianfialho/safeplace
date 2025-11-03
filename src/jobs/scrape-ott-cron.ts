#!/usr/bin/env tsx

/**
 * Manual scraper execution for local development
 * Run with: npm run scrape
 */

import { OttScraper } from '@/lib/scraper/ott-scraper';
import { prisma } from '@/lib/prisma';

async function main() {
  console.log('🚀 Starting manual OTT scraper execution...\n');

  try {
    const scraper = new OttScraper();
    const result = await scraper.scrape();

    console.log('\n✅ Scraper execution completed!');
    console.log('─'.repeat(50));
    console.log(`📊 Results:`);
    console.log(`   - Records Found: ${result.recordsFound}`);
    console.log(`   - Records New: ${result.recordsNew}`);
    console.log(`   - Records Duplicate: ${result.recordsDuplicate || 0}`);
    console.log(`   - Duration: ${(result.durationMs / 1000).toFixed(2)}s`);

    if (result.error) {
      console.log(`   ⚠️  Error: ${result.error}`);
    }

    // Show total in database
    const total = await prisma.incident.count();
    console.log(`\n📈 Total incidents in database: ${total}`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
