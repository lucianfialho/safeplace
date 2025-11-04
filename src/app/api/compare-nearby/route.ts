import { NextRequest, NextResponse } from 'next/server';
import { SafetyScoreEngine } from '@/lib/scoring/safety-score-engine';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/compare-nearby
 *
 * Compare a location's safety score with nearby neighborhoods in the same region
 *
 * Query params:
 * - lat: Latitude
 * - lng: Longitude
 * - neighborhood: Neighborhood name
 * - municipality: Municipality name
 * - radius: Search radius in km (optional, default: 5)
 *
 * Example:
 * /api/compare-nearby?lat=-22.9167&lng=-43.2458&neighborhood=Vila%20Isabel&municipality=Rio%20de%20Janeiro&radius=5
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const neighborhood = searchParams.get('neighborhood');
    const municipality = searchParams.get('municipality');
    const radius = parseFloat(searchParams.get('radius') || '5');

    // Validate
    if (isNaN(lat) || isNaN(lng) || !neighborhood || !municipality) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: lat, lng, neighborhood, municipality',
        },
        { status: 400 }
      );
    }

    if (radius < 1 || radius > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'Radius must be between 1 and 20 km',
        },
        { status: 400 }
      );
    }

    // Find nearby neighborhoods with incidents
    const nearbyNeighborhoods = await prisma.$queryRaw<
      Array<{ neighborhood: string; incident_count: bigint }>
    >`
      SELECT
        neighborhood,
        COUNT(*) as incident_count
      FROM incidents
      WHERE
        municipality = ${municipality}
        AND ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radius * 1000}
        )
        AND neighborhood != ${neighborhood}
      GROUP BY neighborhood
      ORDER BY incident_count DESC
      LIMIT 5
    `;

    // Get the primary location's score
    const engine = new SafetyScoreEngine(prisma);
    const primaryScore = await engine.calculateScore(lat, lng, neighborhood, municipality);

    // Validate primary score
    if (!primaryScore || typeof primaryScore.overallScore !== 'number') {
      console.error('Primary score validation failed:', {
        hasPrimaryScore: !!primaryScore,
        overallScore: primaryScore?.overallScore,
        keys: Object.keys(primaryScore || {}),
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to calculate safety score for primary location',
        },
        { status: 500 }
      );
    }

    // Calculate scores for nearby neighborhoods
    const nearbyScores = [];

    for (const nearby of nearbyNeighborhoods) {
      // Get a representative incident from this neighborhood to get coordinates
      const sampleIncident = await prisma.$queryRaw<
        Array<{ latitude: number; longitude: number }>
      >`
        SELECT latitude, longitude
        FROM incidents
        WHERE neighborhood = ${nearby.neighborhood}
          AND municipality = ${municipality}
          AND latitude IS NOT NULL
          AND longitude IS NOT NULL
        LIMIT 1
      `;

      if (sampleIncident.length > 0) {
        const { latitude, longitude } = sampleIncident[0];
        try {
          const score = await engine.calculateScore(
            Number(latitude),
            Number(longitude),
            nearby.neighborhood,
            municipality
          );

          if (score && typeof score.overallScore === 'number') {
            nearbyScores.push({
              neighborhood: nearby.neighborhood,
              totalIncidents: Number(nearby.incident_count),
              overallScore: score.overallScore,
              score500m: score.score500m,
              score1km: score.score1km,
              score2km: score.score2km,
              incidents: score.incidents,
              trend: score.trend,
            });
          }
        } catch (error) {
          console.error(`Failed to calculate score for ${nearby.neighborhood}:`, error);
          // Skip this neighborhood if score calculation fails
        }
      }
    }

    // Sort by overall score (best to worst)
    nearbyScores.sort((a, b) => b.overallScore - a.overallScore);

    // Create comparison array including primary location
    const allLocations = [
      {
        neighborhood,
        isPrimary: true,
        totalIncidents: primaryScore.incidents.incidents2km365d,
        overallScore: primaryScore.overallScore,
        score500m: primaryScore.score500m,
        score1km: primaryScore.score1km,
        score2km: primaryScore.score2km,
        incidents: primaryScore.incidents,
        trend: primaryScore.trend,
      },
      ...nearbyScores.map((n) => ({ ...n, isPrimary: false })),
    ];

    // Sort all by score
    allLocations.sort((a, b) => b.overallScore - a.overallScore);

    // Add rankings
    const rankedLocations = allLocations.map((loc, index) => ({
      ...loc,
      rank: index + 1,
      rankSuffix:
        index === 0 ? '🥇 Best' : index === allLocations.length - 1 ? '⚠️ Worst' : '',
    }));

    // Find primary location's rank
    const primaryRank = rankedLocations.findIndex((l) => l.isPrimary) + 1;

    // Calculate summary
    const scores = allLocations.map((l) => l.overallScore);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    return NextResponse.json({
      success: true,
      data: {
        primary: {
          neighborhood,
          municipality,
          rank: primaryRank,
          totalLocations: allLocations.length,
          overallScore: primaryScore.overallScore,
          score500m: primaryScore.score500m,
          score1km: primaryScore.score1km,
          score2km: primaryScore.score2km,
          incidents: primaryScore.incidents,
          trend: primaryScore.trend,
          comparison: primaryScore.comparison,
        },
        nearby: rankedLocations.filter((l) => !l.isPrimary),
        allRanked: rankedLocations,
        summary: {
          searchRadius: `${radius} km`,
          totalNeighborhoods: allLocations.length,
          averageScore: Math.round(avgScore),
          bestScore: Math.max(...scores),
          worstScore: Math.min(...scores),
          primaryRank: {
            position: primaryRank,
            outOf: allLocations.length,
            percentile: Math.round(((allLocations.length - primaryRank) / allLocations.length) * 100),
          },
        },
        calculatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error comparing nearby locations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compare nearby locations',
      },
      { status: 500 }
    );
  }
}
