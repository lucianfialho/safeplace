import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/cron/logs
 *
 * Get paginated cron job execution logs with filters
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - status: Filter by status (SUCCESS, FAILED, RUNNING, PARTIAL_SUCCESS)
 * - since: Filter logs since date (ISO string)
 * - until: Filter logs until date (ISO string)
 *
 * Example:
 * /api/cron/logs?page=1&limit=20&status=FAILED&since=2025-11-01
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // Parse filters
    const status = searchParams.get('status');
    const since = searchParams.get('since');
    const until = searchParams.get('until');

    // Build where clause
    const where: any = {};

    if (status && ['SUCCESS', 'FAILED', 'RUNNING', 'PARTIAL_SUCCESS'].includes(status)) {
      where.status = status;
    }

    if (since || until) {
      where.startedAt = {};
      if (since) {
        where.startedAt.gte = new Date(since);
      }
      if (until) {
        where.startedAt.lte = new Date(until);
      }
    }

    // Fetch logs and total count in parallel
    const [logs, totalCount] = await Promise.all([
      prisma.scraperLog.findMany({
        where,
        orderBy: {
          startedAt: 'desc',
        },
        take: limit,
        skip,
      }),
      prisma.scraperLog.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching cron logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cron logs',
      },
      { status: 500 }
    );
  }
}
