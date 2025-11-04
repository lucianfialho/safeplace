import { NextResponse } from 'next/server';
import { createCronHealthAlerts, defaultAlertManager } from '@/lib/alerts/alert-manager';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/alerts/check
 *
 * Check cron health and send alerts if needed
 * This endpoint should be called periodically (e.g., every 15 minutes)
 * to monitor the cron job health and send alerts when issues are detected
 *
 * Can be configured as a separate cron job or monitoring service
 */
export async function GET() {
  try {
    // Calculate health data directly (avoid internal fetch issues)
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [recentExecution, last24HoursLogs, totalLogs] = await Promise.all([
      prisma.scraperLog.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      prisma.scraperLog.findMany({
        where: {
          startedAt: { gte: last24Hours },
        },
        orderBy: { startedAt: 'desc' },
      }),
      prisma.scraperLog.count(),
    ]);

    const isCronRunning = recentExecution
      ? recentExecution.startedAt >= twoHoursAgo
      : false;

    const failures = last24HoursLogs.filter((log) => log.status === 'FAILED').length;
    const successRate =
      last24HoursLogs.length > 0
        ? ((last24HoursLogs.length - failures) / last24HoursLogs.length) * 100
        : 0;

    const avgDuration =
      last24HoursLogs.length > 0
        ? last24HoursLogs.reduce((sum, log) => sum + (log.durationMs || 0), 0) /
          last24HoursLogs.length
        : 0;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (!isCronRunning) {
      status = 'unhealthy';
    } else if (successRate < 50) {
      status = 'unhealthy';
    } else if (successRate < 90) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    const health = {
      status,
      message: '',
      stats: {
        last24Hours: {
          totalExecutions: last24HoursLogs.length,
          failures,
          successRate: Math.round(successRate * 100) / 100,
          avgDurationMs: Math.round(avgDuration),
        },
      },
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
    };

    // Generate alerts based on health status
    const alerts = createCronHealthAlerts(health);

    // Send all alerts
    if (alerts.length > 0) {
      await Promise.all(alerts.map((alert) => defaultAlertManager.sendAlert(alert)));
    }

    return NextResponse.json({
      success: true,
      data: {
        healthStatus: health.status,
        alertsSent: alerts.length,
        alerts: alerts.map((a) => ({
          severity: a.severity,
          title: a.title,
          message: a.message,
        })),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Alert check failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Alert check failed',
      },
      { status: 500 }
    );
  }
}
