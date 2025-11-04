import { NextRequest, NextResponse } from 'next/server';
import { SafetyScoreEngine } from '@/lib/scoring/safety-score-engine';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/compare
 *
 * Compare safety scores across multiple locations
 *
 * Query params:
 * - locations: JSON array of [{lat, lng, neighborhood, municipality}]
 *
 * Example:
 * /api/compare?locations=[{"lat":-22.9167,"lng":-43.2458,"neighborhood":"Vila Isabel","municipality":"Rio de Janeiro"},{"lat":-22.9068,"lng":-43.1729,"neighborhood":"Copacabana","municipality":"Rio de Janeiro"}]
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const locationsParam = searchParams.get('locations');

    if (!locationsParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: locations',
        },
        { status: 400 }
      );
    }

    // Parse locations
    let locations: Array<{
      lat: number;
      lng: number;
      neighborhood: string;
      municipality: string;
    }>;

    try {
      locations = JSON.parse(locationsParam);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in locations parameter',
        },
        { status: 400 }
      );
    }

    // Validate
    if (!Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'locations must be a non-empty array',
        },
        { status: 400 }
      );
    }

    if (locations.length > 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum 10 locations allowed',
        },
        { status: 400 }
      );
    }

    // Calculate scores for all locations
    const engine = new SafetyScoreEngine(prisma);
    const results = [];

    for (const location of locations) {
      const { lat, lng, neighborhood, municipality } = location;

      // Validate each location
      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        !neighborhood ||
        !municipality
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Each location must have lat, lng, neighborhood, and municipality',
          },
          { status: 400 }
        );
      }

      const score = await engine.calculateScore(lat, lng, neighborhood, municipality);

      results.push({
        location: {
          neighborhood,
          municipality,
          coordinates: { lat, lng },
        },
        score: score.score,
        incidents: score.incidents,
        trend: score.trend,
      });
    }

    // Sort by overall score (best to worst)
    results.sort((a, b) => b.score.overallScore - a.score.overallScore);

    // Add rankings
    const rankedResults = results.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));

    // Calculate summary stats
    const scores = results.map((r) => r.score.overallScore);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    return NextResponse.json({
      success: true,
      data: {
        results: rankedResults,
        summary: {
          totalLocations: results.length,
          averageScore: Math.round(avgScore),
          bestScore: maxScore,
          worstScore: minScore,
          scoreRange: maxScore - minScore,
        },
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error comparing locations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare locations',
      },
      { status: 500 }
    );
  }
}
