import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/health/cron
 *
 * Health check endpoint for cron job monitoring
 * Returns the status of the cron job based on recent executions
 *
 * Checks:
 * - Is cron running? (has executions in last 2 hours)
 * - Recent failure rate
 * - Average execution time
 * - Last execution details
 */
export async function GET() {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get recent executions
    const [recentExecution, last24HoursLogs, totalLogs] = await Promise.all([
      // Most recent execution
      prisma.scraperLog.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      // Last 24 hours logs for stats
      prisma.scraperLog.findMany({
        where: {
          startedAt: { gte: last24Hours },
        },
        orderBy: { startedAt: 'desc' },
      }),
      // Total count
      prisma.scraperLog.count(),
    ]);

    // Check if cron is running (should have execution in last 2 hours)
    const isCronRunning = recentExecution
      ? recentExecution.startedAt >= twoHoursAgo
      : false;

    // Calculate stats from last 24 hours
    const failures = last24HoursLogs.filter((log) => log.status === 'FAILURE').length;
    const successRate =
      last24HoursLogs.length > 0
        ? ((last24HoursLogs.length - failures) / last24HoursLogs.length) * 100
        : 0;

    const avgDuration =
      last24HoursLogs.length > 0
        ? last24HoursLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0) /
          last24HoursLogs.length
        : 0;

    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    if (!isCronRunning) {
      status = 'unhealthy';
      message = 'Cron job has not run in the last 2 hours';
    } else if (successRate < 50) {
      status = 'unhealthy';
      message = `High failure rate: ${failures} failures in last 24 hours`;
    } else if (successRate < 90) {
      status = 'degraded';
      message = `Some failures detected: ${failures} in last 24 hours`;
    } else {
      status = 'healthy';
      message = 'Cron job is running normally';
    }

    const response = {
      status,
      message,
      timestamp: now.toISOString(),
      checks: {
        isCronRunning,
        lastExecution: recentExecution
          ? {
              startedAt: recentExecution.startedAt,
              status: recentExecution.status,
              durationMs: recentExecution.durationMs,
              recordsNew: recentExecution.recordsNew,
              recordsFailed: recentExecution.recordsFailed,
            }
          : null,
      },
      stats: {
        last24Hours: {
          totalExecutions: last24HoursLogs.length,
          failures,
          successRate: Math.round(successRate * 100) / 100,
          avgDurationMs: Math.round(avgDuration),
        },
        lifetime: {
          totalExecutions: totalLogs,
        },
      },
    };

    // Return appropriate HTTP status based on health
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 207 : 503;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
