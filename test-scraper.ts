import { OttScraper } from './src/lib/scraper/ott-scraper';
import { prisma } from './src/lib/prisma';

async function testScraper() {
  try {
    console.log('🧪 Testing OTT Scraper\n');
    console.log('='.repeat(50));

    // Create scraper instance
    const scraper = new OttScraper();

    // Run scraper
    const result = await scraper.scrape();

    console.log('\n' + '='.repeat(50));
    console.log('📊 Results Summary:\n');
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Records Found: ${result.recordsFound}`);
    console.log(`   Records New: ${result.recordsNew}`);
    console.log(`   Records Duplicate: ${result.recordsDuplicate || 0}`);
    console.log(`   Duration: ${result.durationMs}ms`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    // Show some sample incidents
    console.log('\n' + '='.repeat(50));
    console.log('📋 Sample Incidents (most recent):\n');

    const incidents = await prisma.incident.findMany({
      take: 5,
      orderBy: {
        occurredAt: 'desc',
      },
      select: {
        occurredAt: true,
        incidentType: true,
        neighborhood: true,
        municipality: true,
        state: true,
        latitude: true,
        longitude: true,
      },
    });

    incidents.forEach((inc, i) => {
      console.log(`${i + 1}. ${inc.incidentType} - ${inc.neighborhood}, ${inc.municipality}-${inc.state}`);
      console.log(`   Occurred: ${inc.occurredAt.toLocaleString()}`);
      console.log(`   Coords: ${inc.latitude}, ${inc.longitude}`);
      console.log('');
    });

    // Database stats
    const total = await prisma.incident.count();
    const last24h = await prisma.incident.count({
      where: {
        occurredAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    console.log('='.repeat(50));
    console.log('📈 Database Stats:\n');
    console.log(`   Total Incidents: ${total}`);
    console.log(`   Last 24 Hours: ${last24h}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testScraper();
