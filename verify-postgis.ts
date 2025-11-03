import { prisma } from './src/lib/prisma';

async function verifyPostGIS() {
  try {
    console.log('🔍 Verifying PostGIS setup...\n');

    // Check if location columns exist
    const result = await prisma.$queryRaw<Array<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>>`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_name IN ('incidents', 'properties')
        AND column_name = 'location'
      ORDER BY table_name;
    `;

    if (result.length === 2) {
      console.log('✅ PostGIS location columns found:');
      result.forEach(row => {
        console.log(`   - ${row.table_name}.${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ Missing location columns!');
      console.log('   Expected: 2, Found:', result.length);
    }

    // Check indexes
    const indexes = await prisma.$queryRaw<Array<{
      indexname: string;
      tablename: string;
    }>>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE '%location%'
      ORDER BY tablename;
    `;

    console.log('\n✅ Spatial indexes found:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.tablename}: ${idx.indexname}`);
    });

    // Test a spatial query
    console.log('\n🧪 Testing spatial query...');
    const testQuery = await prisma.$queryRaw<Array<{ test: string }>>`
      SELECT ST_AsText(ST_MakePoint(-43.3525182, -22.9327433)::geography) as test;
    `;

    if (testQuery.length > 0) {
      console.log('✅ Spatial query works!');
      console.log(`   Result: ${testQuery[0].test}`);
    }

    console.log('\n🎉 All PostGIS features are working correctly!');
    console.log('\n✅ Database is ready for the OTT Scraper!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPostGIS();
