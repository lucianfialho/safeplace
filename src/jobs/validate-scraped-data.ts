#!/usr/bin/env tsx

/**
 * Validate scraped Instagram data and convert to JSON
 *
 * Reads all .txt files from scrapy/instagram_scrapes/
 * Filters only valid OTT incident posts (excludes "Resumo OTT360 AI" and other formats)
 * Outputs: scrapy/validated-incidents.json
 * Logs: scrapy/validation-report.txt
 */

import * as fs from 'fs';
import * as path from 'path';

interface ScrapedPost {
  url: string;
  data: string;
  legenda: string;
}

interface ValidatedIncident {
  url: string;
  publishedAt: string;
  caption: string;
}

interface ValidationReport {
  totalFiles: number;
  validIncidents: number;
  invalidPosts: number;
  discardedFiles: Array<{
    filename: string;
    url: string;
    reason: string;
  }>;
}

const SCRAPES_DIR = path.join(process.cwd(), 'scrapy', 'instagram_scrapes');
const OUTPUT_JSON = path.join(process.cwd(), 'scrapy', 'validated-incidents.json');
const REPORT_FILE = path.join(process.cwd(), 'scrapy', 'validation-report.txt');

function parseScrapedFile(filePath: string): ScrapedPost | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let url = '';
    let data = '';
    let legenda = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('URL: ')) {
        url = line.substring(5).trim();
      } else if (line.startsWith('Data: ')) {
        data = line.substring(6).trim();
      } else if (line.startsWith('Legenda: ')) {
        // Captura legenda (pode ser multi-linha)
        legenda = lines.slice(i).join('\n').substring('Legenda: '.length).trim();
        break;
      }
    }

    if (!url || !data || !legenda) {
      return null;
    }

    return { url, data, legenda };
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return null;
  }
}

function isValidOTTIncident(post: ScrapedPost): { valid: boolean; reason?: string } {
  // Check if caption is empty
  if (!post.legenda || post.legenda.length === 0) {
    return { valid: false, reason: 'Empty caption' };
  }

  // Discard "Resumo OTT360 AI" posts
  if (post.legenda.includes('Resumo OTT360 AI')) {
    return { valid: false, reason: 'Summary post (Resumo OTT360 AI)' };
  }

  // Must have "OTT 360 INFORMA:"
  if (!post.legenda.includes('OTT 360 INFORMA:')) {
    return { valid: false, reason: 'Missing "OTT 360 INFORMA:"' };
  }

  // Must have date pattern "DD/MM/YY HH:MM"
  const datePattern = /\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/;
  if (!datePattern.test(post.legenda)) {
    return { valid: false, reason: 'Missing date pattern (DD/MM/YY HH:MM)' };
  }

  // Must have location pattern "Bairro - Município UF"
  // Looking for pattern: word/phrase - word/phrase UPPERCASE_2_LETTERS
  const locationPattern = /.+\s*-\s*.+\s+[A-Z]{2}/;
  if (!locationPattern.test(post.legenda)) {
    return { valid: false, reason: 'Missing location pattern (Bairro - Município UF)' };
  }

  return { valid: true };
}

async function main() {
  console.log('🔍 Validating scraped Instagram data\n');

  // Check if directory exists
  if (!fs.existsSync(SCRAPES_DIR)) {
    console.error(`❌ Directory not found: ${SCRAPES_DIR}`);
    process.exit(1);
  }

  // Read all .txt files
  const files = fs
    .readdirSync(SCRAPES_DIR)
    .filter((f) => f.endsWith('.txt'))
    .map((f) => path.join(SCRAPES_DIR, f));

  console.log(`📂 Found ${files.length} .txt files`);

  const validatedIncidents: ValidatedIncident[] = [];
  const report: ValidationReport = {
    totalFiles: files.length,
    validIncidents: 0,
    invalidPosts: 0,
    discardedFiles: [],
  };

  // Process each file
  for (const filePath of files) {
    const filename = path.basename(filePath);
    const post = parseScrapedFile(filePath);

    if (!post) {
      report.invalidPosts++;
      report.discardedFiles.push({
        filename,
        url: 'N/A',
        reason: 'Failed to parse file',
      });
      continue;
    }

    const validation = isValidOTTIncident(post);

    if (!validation.valid) {
      report.invalidPosts++;
      report.discardedFiles.push({
        filename,
        url: post.url,
        reason: validation.reason || 'Unknown',
      });
      continue;
    }

    // Valid incident - add to output
    validatedIncidents.push({
      url: post.url,
      publishedAt: post.data,
      caption: post.legenda,
    });
    report.validIncidents++;
  }

  // Sort by date (oldest first)
  validatedIncidents.sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  );

  // Write JSON output
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(validatedIncidents, null, 2));

  // Write validation report
  const reportText = [
    '='.repeat(80),
    'VALIDATION REPORT',
    '='.repeat(80),
    '',
    `Total files processed: ${report.totalFiles}`,
    `✅ Valid incidents: ${report.validIncidents} (${((report.validIncidents / report.totalFiles) * 100).toFixed(1)}%)`,
    `❌ Invalid/Discarded: ${report.invalidPosts} (${((report.invalidPosts / report.totalFiles) * 100).toFixed(1)}%)`,
    '',
    '='.repeat(80),
    'DISCARDED FILES',
    '='.repeat(80),
    '',
  ];

  // Group discarded files by reason
  const byReason = report.discardedFiles.reduce(
    (acc, item) => {
      if (!acc[item.reason]) {
        acc[item.reason] = [];
      }
      acc[item.reason].push(item);
      return acc;
    },
    {} as Record<string, typeof report.discardedFiles>
  );

  for (const [reason, items] of Object.entries(byReason)) {
    reportText.push(`\n${reason} (${items.length} files):`);
    reportText.push('-'.repeat(80));
    for (const item of items) {
      reportText.push(`  ${item.filename} - ${item.url}`);
    }
  }

  fs.writeFileSync(REPORT_FILE, reportText.join('\n'));

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`\n✅ Valid incidents: ${report.validIncidents}`);
  console.log(`❌ Discarded: ${report.invalidPosts}`);
  console.log(`\n📄 Output: ${OUTPUT_JSON}`);
  console.log(`📋 Report: ${REPORT_FILE}`);

  // Show date range
  if (validatedIncidents.length > 0) {
    const oldest = new Date(validatedIncidents[0].publishedAt);
    const newest = new Date(validatedIncidents[validatedIncidents.length - 1].publishedAt);
    const days = Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`\n📅 Date range:`);
    console.log(`   Oldest: ${oldest.toISOString().split('T')[0]}`);
    console.log(`   Newest: ${newest.toISOString().split('T')[0]}`);
    console.log(`   Span: ${days} days`);
  }

  console.log('\n✅ Validation complete!\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
