#!/usr/bin/env tsx

/**
 * Import incidents from Instagram captions
 *
 * Usage:
 * 1. Manual: Create a file with captions (one per line or separated by ----)
 *    npm run import:instagram -- captions.txt
 *
 * 2. Or paste captions when prompted
 */

import { InstagramParser } from '@/lib/scraper/instagram-parser';
import { Geocoder } from '@/lib/scraper/geocoder';
import { IncidentService } from '@/services/incident-service';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as readline from 'readline';

async function importFromFile(filePath: string) {
  console.log(`📖 Reading captions from: ${filePath}\n`);

  const content = fs.readFileSync(filePath, 'utf-8');

  // Split by separator or double newlines
  const captions = content
    .split(/\n\s*----\s*\n|\n\s*\n\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  console.log(`Found ${captions.length} captions\n`);

  await processCaptions(captions);
}

async function importInteractive() {
  console.log('📝 Paste Instagram captions below.');
  console.log('   Separate multiple captions with a line containing only "----"');
  console.log('   Press Ctrl+D (Unix) or Ctrl+Z (Windows) when done.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const lines: string[] = [];

  for await (const line of rl) {
    lines.push(line);
  }

  const content = lines.join('\n');
  const captions = content
    .split(/\n\s*----\s*\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  console.log(`\nFound ${captions.length} captions\n`);

  await processCaptions(captions);
}

async function processCaptions(captions: string[]) {
  const parser = new InstagramParser();
  const geocoder = new Geocoder();
  const incidentService = new IncidentService(prisma);

  console.log('🔍 Parsing captions...');
  const rawIncidents = parser.parseBatch(captions);
  console.log(`   Parsed: ${rawIncidents.length}/${captions.length} captions`);

  if (rawIncidents.length === 0) {
    console.log('❌ No valid incidents found');
    return;
  }

  console.log('\n🗺️  Geocoding locations...');
  const geocodedIncidents = await geocoder.batchGeocode(rawIncidents);
  const withCoords = geocodedIncidents.filter((i) => i.latitude && i.longitude);
  console.log(`   Geocoded: ${withCoords.length}/${rawIncidents.length} incidents`);

  console.log('\n💾 Saving to database...');
  const saved = await incidentService.bulkInsert(withCoords);
  console.log(`   Saved: ${saved} new incidents`);

  // Show summary
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
    console.log(`\n📅 Date Range:`);
    console.log(`   Oldest: ${oldest.occurredAt.toISOString()}`);
    console.log(`   Newest: ${newest.occurredAt.toISOString()}`);
    const days = Math.ceil(
      (newest.occurredAt.getTime() - oldest.occurredAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    console.log(`   Span: ${days} days`);
  }
}

async function main() {
  console.log('🚀 Instagram Caption Importer\n');

  const args = process.argv.slice(2);

  if (args.length > 0) {
    // File mode
    const filePath = args[0];
    await importFromFile(filePath);
  } else {
    // Interactive mode
    await importInteractive();
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
