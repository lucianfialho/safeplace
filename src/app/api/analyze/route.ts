import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { QuintoAndarExtractor } from '@/lib/extractors/quinto-andar-extractor';
import { PropertyService } from '@/services/property-service';
import { SafetyScoreEngine, getScoreBadge } from '@/lib/scoring/safety-score-engine';
import { ExtractionError } from '@/lib/extractors/types';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout for extraction + analysis

/**
 * POST /api/analyze
 * Primary endpoint: Analyzes a Quinto Andar property URL
 * Returns complete safety report with property details
 *
 * Request body:
 * {
 *   "url": "https://www.quintoandar.com.br/imovel/893321695"
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid URL parameter',
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Analyzing property: ${url}`);

    // Step 1: Extract property data from Quinto Andar
    const extractor = new QuintoAndarExtractor();
    const propertyService = new PropertyService(prisma);

    let propertyData;
    let fromCache = false;

    // Check cache first
    const extractor2 = new QuintoAndarExtractor();
    const urlParser = (extractor2 as any).urlParser;
    const listingId = urlParser.extractListingId(url);

    if (listingId) {
      const cached = await propertyService.findByListingId(listingId);
      if (cached && propertyService.isCacheValid(cached)) {
        console.log(`✅ Using cached property data (${listingId})`);
        propertyData = {
          qaListingId: cached.qaListingId,
          qaUrl: cached.qaUrl,
          address: cached.address || undefined,
          neighborhood: cached.neighborhood,
          municipality: cached.municipality,
          state: cached.state,
          latitude: cached.latitude!,
          longitude: cached.longitude!,
          propertyType: cached.propertyType || undefined,
          businessContext: cached.businessContext || undefined,
          price: cached.price || undefined,
          condominiumFee: cached.condominiumFee || undefined,
          iptu: cached.iptu || undefined,
          totalArea: cached.totalArea || undefined,
          bedroomCount: cached.bedroomCount || undefined,
          bathroomCount: cached.bathroomCount || undefined,
          suiteCount: cached.suiteCount || undefined,
          parkingSlots: cached.parkingSlots || undefined,
          isFurnished: cached.isFurnished || undefined,
        };
        fromCache = true;
      }
    }

    if (!propertyData) {
      console.log(`📥 Extracting property data from URL...`);
      propertyData = await extractor.extractFromUrl(url);

      // Save to database
      await propertyService.upsert(propertyData);
      console.log(`💾 Property saved to database (${propertyData.qaListingId})`);
    }

    // Step 2: Calculate safety score
    console.log(`📊 Calculating safety score...`);
    const scoreEngine = new SafetyScoreEngine(prisma);
    const safetyScore = await scoreEngine.calculateScore(
      Number(propertyData.latitude),
      Number(propertyData.longitude),
      propertyData.neighborhood,
      propertyData.municipality
    );

    // Step 3: Save analysis result
    await prisma.propertyAnalysis.create({
      data: {
        propertyId: (await propertyService.findByListingId(propertyData.qaListingId))!.id,
        overallScore: safetyScore.overallScore,
        score500m: safetyScore.score500m,
        score1km: safetyScore.score1km,
        score2km: safetyScore.score2km,
        incidents500m30d: safetyScore.incidents.incidents500m30d,
        incidents500m90d: safetyScore.incidents.incidents500m90d,
        incidents500m365d: safetyScore.incidents.incidents500m365d,
        incidents1km30d: safetyScore.incidents.incidents1km30d,
        incidents1km90d: safetyScore.incidents.incidents1km90d,
        incidents1km365d: safetyScore.incidents.incidents1km365d,
        incidents2km30d: safetyScore.incidents.incidents2km30d,
        incidents2km90d: safetyScore.incidents.incidents2km90d,
        incidents2km365d: safetyScore.incidents.incidents2km365d,
        tiroteirosCount: safetyScore.incidents.tiroteirosCount,
        disparosCount: safetyScore.incidents.disparosCount,
        incendiosCount: safetyScore.incidents.incendiosCount,
        outrosCount: safetyScore.incidents.outrosCount,
        trendDirection: safetyScore.trend.direction,
        trendPercentage: safetyScore.trend.percentage,
        neighborhoodAvgScore: safetyScore.comparison.neighborhoodAvgScore,
        cityAvgScore: safetyScore.comparison.cityAvgScore,
        percentileRank: safetyScore.comparison.percentileRank,
        calculatedAt: safetyScore.calculatedAt,
      },
    });

    const durationMs = Date.now() - startTime;
    console.log(`✅ Analysis complete in ${durationMs}ms`);

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        property: {
          qaListingId: propertyData.qaListingId,
          qaUrl: propertyData.qaUrl,
          address: propertyData.address,
          neighborhood: propertyData.neighborhood,
          municipality: propertyData.municipality,
          state: propertyData.state,
          latitude: propertyData.latitude,
          longitude: propertyData.longitude,
          price: propertyData.price,
          condominiumFee: propertyData.condominiumFee,
          iptu: propertyData.iptu,
          totalArea: propertyData.totalArea,
          bedroomCount: propertyData.bedroomCount,
          bathroomCount: propertyData.bathroomCount,
          suiteCount: propertyData.suiteCount,
          parkingSlots: propertyData.parkingSlots,
          isFurnished: propertyData.isFurnished,
          propertyType: propertyData.propertyType,
          businessContext: propertyData.businessContext,
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
        meta: {
          fromCache,
          durationMs,
          calculatedAt: safetyScore.calculatedAt,
        },
      },
    });
  } catch (error) {
    console.error('❌ Analysis failed:', error);

    // Handle extraction errors
    if (error instanceof ExtractionError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errorCode: error.code,
        },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
