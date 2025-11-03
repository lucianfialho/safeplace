import { prisma } from './src/lib/prisma';

async function testConnection() {
  try {
    console.log('🔄 Testing database connection...');

    // Test basic connection
    await prisma.$connect();
    console.log('✅ Connected to database successfully!');

    // Test if tables exist
    const incidents = await prisma.incident.count();
    const properties = await prisma.property.count();
    const scraperLogs = await prisma.scraperLog.count();

    console.log('\n📊 Database Stats:');
    console.log(`   Incidents: ${incidents}`);
    console.log(`   Properties: ${properties}`);
    console.log(`   Scraper Logs: ${scraperLogs}`);

    console.log('\n✅ All tests passed!');
    console.log('\n⚠️  IMPORTANT: Run the following SQL in Neon SQL Editor:');
    console.log('   File: prisma/add-postgis-columns.sql');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
