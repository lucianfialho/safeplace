#!/usr/bin/env tsx

/**
 * Import validated Instagram incidents from JSON to database
 *
 * Reads: scrapy/validated-incidents.json
 * Parses captions using InstagramParser
 * Geocodes locations with caching
 * Saves to database with deduplication
 */

import { InstagramParser } from '@/lib/scraper/instagram-parser';
import { Geocoder } from '@/lib/scraper/geocoder';
import { IncidentService } from '@/services/incident-service';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

interface ValidatedIncident {
  url: string;
  publishedAt: string;
  caption: string;
}

const INPUT_JSON = path.join(process.cwd(), 'scrapy', 'validated-incidents.json');
const BATCH_SIZE = 50;

async function main() {
  console.log('🚀 Importing validated incidents from JSON\n');

  // Check if JSON exists
  if (!fs.existsSync(INPUT_JSON)) {
    console.error(`❌ File not found: ${INPUT_JSON}`);
    console.log('\n💡 Run validation first: npm run validate:scraped\n');
    process.exit(1);
  }

  // Read JSON
  const content = fs.readFileSync(INPUT_JSON, 'utf-8');
  const incidents: ValidatedIncident[] = JSON.parse(content);

  console.log(`📖 Loaded ${incidents.length} validated incidents from JSON\n`);

  if (incidents.length === 0) {
    console.log('✅ No incidents to import\n');
    process.exit(0);
  }

  const parser = new InstagramParser();
  const geocoder = new Geocoder();
  const incidentService = new IncidentService(prisma);

  console.log('🔍 Parsing captions...');

  // Parse all captions
  const rawIncidents = incidents
    .map((item) => {
      const parsed = parser.parse(item.caption);
      if (parsed) {
        // Add source_id from URL (Instagram post ID)
        const postId = item.url.split('/p/')[1]?.replace('/', '');
        return {
          ...parsed,
          source: 'OTT_INSTAGRAM' as const,
          // Use Instagram post ID as unique identifier
          sourceId: postId || undefined,
        };
      }
      return null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`   Parsed: ${rawIncidents.length}/${incidents.length} captions`);

  if (rawIncidents.length === 0) {
    console.log('❌ No valid incidents found after parsing\n');
    process.exit(0);
  }

  console.log('\n🗺️  Geocoding locations...');

  // Process in batches to avoid overloading geocoder
  let totalGeocoded = 0;
  let totalSaved = 0;

  for (let i = 0; i < rawIncidents.length; i += BATCH_SIZE) {
    const batch = rawIncidents.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(rawIncidents.length / BATCH_SIZE);

    console.log(`\n   Batch ${batchNum}/${totalBatches} (${batch.length} incidents)`);

    // Geocode batch
    const geocodedBatch = await geocoder.batchGeocode(batch);
    const withCoords = geocodedBatch.filter((inc) => inc.latitude && inc.longitude);

    totalGeocoded += withCoords.length;
    console.log(`   ✅ Geocoded: ${withCoords.length}/${batch.length}`);

    // Save to database
    if (withCoords.length > 0) {
      const saved = await incidentService.bulkInsert(withCoords);
      totalSaved += saved;
      console.log(`   💾 Saved: ${saved} new incidents`);
    }

    // Small delay between batches to be nice to geocoding API
    if (i + BATCH_SIZE < rawIncidents.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Show final summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n📥 Loaded from JSON: ${incidents.length}`);
  console.log(`🔍 Successfully parsed: ${rawIncidents.length}`);
  console.log(`🗺️  Successfully geocoded: ${totalGeocoded}`);
  console.log(`💾 Saved to database: ${totalSaved} new incidents`);

  if (totalSaved < totalGeocoded) {
    console.log(
      `\n⚠️  Note: ${totalGeocoded - totalSaved} incidents were duplicates (already in database)`
    );
  }

  // Show database stats
  const total = await prisma.incident.count();
  console.log(`\n📈 Total incidents in database: ${total}`);

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
    console.log(`\n📅 Date Range in Database:`);
    console.log(`   Oldest: ${oldest.occurredAt.toISOString().split('T')[0]}`);
    console.log(`   Newest: ${newest.occurredAt.toISOString().split('T')[0]}`);
    const days = Math.ceil(
      (newest.occurredAt.getTime() - oldest.occurredAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`   Span: ${days} days`);
  }

  console.log('\n✅ Import complete!\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
