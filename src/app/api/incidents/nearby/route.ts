import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET /api/incidents/nearby
 * Returns incidents near a location with filters
 *
 * Query parameters:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - radius: radius in meters (default: 1000, max: 5000)
 * - days: number of days to look back (default: 30, max: 365)
 * - type: filter by incident type (optional)
 * - limit: max results to return (default: 50, max: 200)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radiusStr = searchParams.get('radius');
    const daysStr = searchParams.get('days');
    const type = searchParams.get('type');
    const limitStr = searchParams.get('limit');

    // Validate required parameters
    if (!lat || !lng) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: lat and lng',
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid coordinates',
        },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coordinates out of range',
        },
        { status: 400 }
      );
    }

    // Parse optional parameters with defaults and limits
    const radius = Math.min(radiusStr ? parseInt(radiusStr) : 1000, 5000);
    const days = Math.min(daysStr ? parseInt(daysStr) : 30, 365);
    const limit = Math.min(limitStr ? parseInt(limitStr) : 50, 200);

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    console.log(`🔍 Searching incidents near ${latitude}, ${longitude} within ${radius}m`);

    // Query incidents using PostGIS
    let incidents;
    if (type) {
      incidents = await prisma.$queryRaw<
        Array<{
          id: string;
          occurred_at: Date;
          scraped_at: Date;
          neighborhood: string;
          municipality: string;
          state: string;
          latitude: number;
          longitude: number;
          incident_type: string;
          severity_score: number;
          source: string;
          verified: boolean;
          distance: number;
        }>
      >`
        SELECT
          id,
          occurred_at,
          scraped_at,
          neighborhood,
          municipality,
          state,
          latitude,
          longitude,
          incident_type,
          severity_score,
          source,
          verified,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) as distance
        FROM incidents
        WHERE
          ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            ${radius}
          )
          AND occurred_at >= ${cutoffDate}
          AND incident_type = ${type}::"IncidentType"
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
    } else {
      incidents = await prisma.$queryRaw<
        Array<{
          id: string;
          occurred_at: Date;
          scraped_at: Date;
          neighborhood: string;
          municipality: string;
          state: string;
          latitude: number;
          longitude: number;
          incident_type: string;
          severity_score: number;
          source: string;
          verified: boolean;
          distance: number;
        }>
      >`
        SELECT
          id,
          occurred_at,
          scraped_at,
          neighborhood,
          municipality,
          state,
          latitude,
          longitude,
          incident_type,
          severity_score,
          source,
          verified,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
          ) as distance
        FROM incidents
        WHERE
          ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
            ${radius}
          )
          AND occurred_at >= ${cutoffDate}
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
    }

    // Group by type
    const byType: Record<string, number> = {};
    incidents.forEach((inc) => {
      byType[inc.incident_type] = (byType[inc.incident_type] || 0) + 1;
    });

    console.log(`✅ Found ${incidents.length} incidents`);

    return NextResponse.json({
      success: true,
      data: {
        incidents: incidents.map((inc) => ({
          id: inc.id,
          occurredAt: inc.occurred_at,
          scrapedAt: inc.scraped_at,
          neighborhood: inc.neighborhood,
          municipality: inc.municipality,
          state: inc.state,
          latitude: inc.latitude,
          longitude: inc.longitude,
          type: inc.incident_type,
          severityScore: inc.severity_score,
          source: inc.source,
          verified: inc.verified,
          distanceMeters: Math.round(inc.distance),
        })),
        summary: {
          total: incidents.length,
          byType,
          searchRadius: radius,
          searchPeriodDays: days,
        },
        location: {
          latitude,
          longitude,
        },
      },
    });
  } catch (error) {
    console.error('❌ Failed to fetch nearby incidents:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
