import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PropertyService } from '@/services/property-service';
import { SafetyScoreEngine, getScoreBadge } from '@/lib/scoring/safety-score-engine';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/analyze-manual
 * Manual analysis endpoint for testing
 * Accepts property data directly instead of extracting from URL
 *
 * Request body:
 * {
 *   "latitude": -22.9068,
 *   "longitude": -43.1729,
 *   "neighborhood": "Copacabana",
 *   "municipality": "Rio de Janeiro",
 *   "state": "RJ"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, neighborhood, municipality, state } = body;

    // Validate required fields
    if (!latitude || !longitude || !neighborhood || !municipality || !state) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: latitude, longitude, neighborhood, municipality, state',
        },
        { status: 400 }
      );
    }

    console.log(`📍 Manual analysis: ${neighborhood}, ${municipality}`);

    // Calculate safety score
    const scoreEngine = new SafetyScoreEngine(prisma);
    const safetyScore = await scoreEngine.calculateScore(
      latitude,
      longitude,
      neighborhood,
      municipality
    );

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        location: {
          latitude,
          longitude,
          neighborhood,
          municipality,
          state,
        },
        score: {
          overallScore: safetyScore.overallScore,
          score500m: safetyScore.score500m,
          score1km: safetyScore.score1km,
          score2km: safetyScore.score2km,
          badge: getScoreBadge(safetyScore.overallScore),
        },
        incidents: safetyScore.incidents,
        trend: safetyScore.trend,
        comparison: safetyScore.comparison,
        calculatedAt: safetyScore.calculatedAt,
      },
    });
  } catch (error) {
    console.error('❌ Manual analysis failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
