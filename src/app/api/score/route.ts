import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SafetyScoreEngine, getScoreBadge } from '@/lib/scoring/safety-score-engine';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout

/**
 * GET /api/score
 * Calculate safety score for a location
 *
 * Query parameters:
 * - lat: latitude (required)
 * - lng: longitude (required)
 * - neighborhood: neighborhood name (optional, for comparisons)
 * - municipality: city name (optional, for comparisons)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const neighborhood = searchParams.get('neighborhood') || 'Unknown';
    const municipality = searchParams.get('municipality') || 'Unknown';

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

    console.log(`📍 Calculating score for: ${latitude}, ${longitude}`);

    // Calculate safety score
    const engine = new SafetyScoreEngine(prisma);
    const score = await engine.calculateScore(
      latitude,
      longitude,
      neighborhood,
      municipality
    );

    // Get score badge
    const badge = getScoreBadge(score.overallScore);

    return NextResponse.json({
      success: true,
      data: {
        score: {
          overallScore: score.overallScore,
          score500m: score.score500m,
          score1km: score.score1km,
          score2km: score.score2km,
          badge,
        },
        incidents: score.incidents,
        trend: score.trend,
        comparison: score.comparison,
        calculatedAt: score.calculatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Score calculation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
