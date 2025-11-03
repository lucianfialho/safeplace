import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/stats
 * Returns platform statistics and metrics
 *
 * Query parameters:
 * - municipality: filter by municipality (optional)
 * - period: time period for stats - 7d, 30d, 90d, 365d (default: 30d)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const municipality = searchParams.get('municipality');
    const period = searchParams.get('period') || '30d';

    // Parse period to days
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '365d': 365,
    }[period] || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);

    console.log(`📊 Generating stats for ${municipality || 'all'} (${period})`);

    // Run all queries in parallel for better performance
    const [
      totalIncidents,
      recentIncidents,
      incidentsByType,
      incidentsByMunicipality,
      totalProperties,
      totalAnalyses,
      recentAnalyses,
      avgScoreData,
      scraperStats,
    ] = await Promise.all([
      // Total incidents (all time)
      prisma.incident.count({
        where: municipality ? { municipality } : undefined,
      }),

      // Recent incidents
      prisma.incident.count({
        where: {
          ...(municipality ? { municipality } : {}),
          occurredAt: {
            gte: cutoffDate,
          },
        },
      }),

      // Incidents by type (recent period)
      prisma.incident.groupBy({
        by: ['incidentType'],
        where: {
          ...(municipality ? { municipality } : {}),
          occurredAt: {
            gte: cutoffDate,
          },
        },
        _count: true,
      }),

      // Top municipalities by incident count (if no municipality filter)
      !municipality
        ? prisma.incident.groupBy({
            by: ['municipality'],
            where: {
              occurredAt: {
                gte: cutoffDate,
              },
            },
            _count: true,
            orderBy: {
              _count: {
                municipality: 'desc',
              },
            },
            take: 10,
          })
        : Promise.resolve([]),

      // Total properties analyzed
      prisma.property.count({
        where: municipality ? { municipality } : undefined,
      }),

      // Total analyses
      prisma.propertyAnalysis.count(),

      // Recent analyses
      prisma.propertyAnalysis.count({
        where: {
          calculatedAt: {
            gte: cutoffDate,
          },
        },
      }),

      // Average safety score
      prisma.propertyAnalysis.aggregate({
        where: {
          calculatedAt: {
            gte: cutoffDate,
          },
        },
        _avg: {
          overallScore: true,
        },
      }),

      // Scraper stats (last 10 runs)
      prisma.scraperLog.findMany({
        orderBy: {
          startedAt: 'desc',
        },
        take: 10,
        select: {
          status: true,
          recordsFound: true,
          recordsNew: true,
          recordsDuplicate: true,
          durationMs: true,
          startedAt: true,
          completedAt: true,
        },
      }),
    ]);

    // Format incidents by type
    const incidentTypeStats = incidentsByType.reduce(
      (acc, item) => {
        acc[item.incidentType] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    // Format municipalities
    const municipalityStats = incidentsByMunicipality.map((item) => ({
      municipality: item.municipality,
      count: item._count,
    }));

    // Calculate scraper success rate
    const scraperSuccessCount = scraperStats.filter((s) => s.status === 'SUCCESS').length;
    const scraperSuccessRate =
      scraperStats.length > 0 ? (scraperSuccessCount / scraperStats.length) * 100 : 0;

    // Calculate average scraper duration
    const avgScraperDuration =
      scraperStats.length > 0
        ? scraperStats.reduce((sum, s) => sum + (s.durationMs || 0), 0) / scraperStats.length
        : 0;

    // Last scrape time
    const lastScrape = scraperStats[0]?.startedAt || null;

    console.log(`✅ Stats generated successfully`);

    return NextResponse.json({
      success: true,
      data: {
        incidents: {
          total: totalIncidents,
          recent: recentIncidents,
          byType: incidentTypeStats,
          topMunicipalities: municipalityStats,
        },
        properties: {
          total: totalProperties,
          totalAnalyses,
          recentAnalyses,
          avgScore: Math.round(avgScoreData._avg.overallScore || 0),
        },
        scraper: {
          lastRun: lastScrape,
          successRate: Math.round(scraperSuccessRate),
          avgDurationMs: Math.round(avgScraperDuration),
          recentRuns: scraperStats.map((s) => ({
            status: s.status,
            recordsFound: s.recordsFound,
            recordsNew: s.recordsNew,
            recordsDuplicate: s.recordsDuplicate,
            durationMs: s.durationMs,
            startedAt: s.startedAt,
          })),
        },
        meta: {
          period: period,
          periodDays,
          municipality: municipality || 'all',
          generatedAt: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('❌ Failed to generate stats:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
