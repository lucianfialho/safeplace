import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * GET /api/health
 * Health check endpoint for monitoring and uptime checks
 * Returns system status and basic metrics
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connection
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // Get basic counts (fast queries)
    const [incidentCount, propertyCount, lastScraperRun] = await Promise.all([
      prisma.incident.count(),
      prisma.property.count(),
      prisma.scraperLog.findFirst({
        orderBy: {
          startedAt: 'desc',
        },
        select: {
          startedAt: true,
          status: true,
          recordsNew: true,
        },
      }),
    ]);

    // Check if scraper is running (last run within 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const scraperHealthy = lastScraperRun && lastScraperRun.startedAt > twoHoursAgo;

    const totalLatency = Date.now() - startTime;

    // Determine overall health status
    const isHealthy = dbLatency < 1000 && scraperHealthy;

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: {
            status: dbLatency < 1000 ? 'healthy' : 'slow',
            latencyMs: dbLatency,
          },
          scraper: {
            status: scraperHealthy ? 'healthy' : 'stale',
            lastRun: lastScraperRun?.startedAt || null,
            lastStatus: lastScraperRun?.status || null,
            lastRecordsNew: lastScraperRun?.recordsNew || 0,
          },
        },
        metrics: {
          totalIncidents: incidentCount,
          totalProperties: propertyCount,
        },
        performance: {
          responseTimeMs: totalLatency,
        },
        version: '1.0.0',
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('❌ Health check failed:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: {
          responseTimeMs: Date.now() - startTime,
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
