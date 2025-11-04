import { AnalysisContent } from '@/components/analysis/analysis-content';
import { prisma } from '@/lib/prisma';
import { PropertyService } from '@/services/property-service';
import { SafetyScoreEngine, getScoreBadge } from '@/lib/scoring/safety-score-engine';

interface PageProps {
  params: Promise<{
    listingId: string;
  }>;
}

async function getAnalysisData(listingId: string) {
  try {
    // Check if it's a demo listing (starts with 'demo-')
    if (listingId.startsWith('demo-')) {
      // Demo data will be loaded client-side from sessionStorage
      return null;
    }

    // Fetch property from database
    const propertyService = new PropertyService(prisma);
    const property = await propertyService.findByListingId(listingId);

    if (!property) {
      console.error('Property not found:', listingId);
      return null;
    }

    // Calculate safety score
    const scoreEngine = new SafetyScoreEngine(prisma);
    const safetyScore = await scoreEngine.calculateScore(
      Number(property.latitude),
      Number(property.longitude),
      property.neighborhood,
      property.municipality
    );

    // Save the analysis
    await prisma.propertyAnalysis.create({
      data: {
        propertyId: property.id,
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

    // Serialize Decimal values for client components
    return {
      property: {
        ...property,
        latitude: Number(property.latitude),
        longitude: Number(property.longitude),
        placesNearby: property.placesNearby || null,
      },
      safetyScore: {
        ...safetyScore,
        badge: getScoreBadge(safetyScore.overallScore),
      },
    };
  } catch (error) {
    console.error('Error fetching analysis data:', error);
    return null;
  }
}

export default async function AnalysisPage({ params }: PageProps) {
  const resolvedParams = await params;
  const data = await getAnalysisData(resolvedParams.listingId);

  return <AnalysisContent initialData={data} listingId={resolvedParams.listingId} />;
}
