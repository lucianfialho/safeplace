import { PrismaClient } from '@prisma/client';
import { ComparisonMetrics } from './types';

/**
 * Compares property score against neighborhood and city averages
 */
export class Comparator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Compare score against neighborhood and city averages
   */
  async compare(
    score: number,
    neighborhood: string,
    municipality: string
  ): Promise<ComparisonMetrics> {
    // Query averages in parallel
    const [neighborhoodAvg, cityAvg, percentile] = await Promise.all([
      this.calculateNeighborhoodAverage(neighborhood, municipality),
      this.calculateCityAverage(municipality),
      this.calculatePercentileRank(score, municipality),
    ]);

    return {
      neighborhoodAvgScore: neighborhoodAvg,
      cityAvgScore: cityAvg,
      percentileRank: percentile,
      betterThanNeighborhood: score > neighborhoodAvg,
      betterThanCity: score > cityAvg,
    };
  }

  /**
   * Calculate average score for neighborhood
   * Uses last 7 days of analyses
   */
  private async calculateNeighborhoodAverage(
    neighborhood: string,
    municipality: string
  ): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.propertyAnalysis.aggregate({
      where: {
        property: {
          neighborhood,
          municipality,
        },
        calculatedAt: {
          gte: sevenDaysAgo,
        },
      },
      _avg: {
        overallScore: true,
      },
    });

    // Default to 60 if no data (neutral score)
    return Math.round(result._avg.overallScore || 60);
  }

  /**
   * Calculate average score for entire city
   * Uses last 7 days of analyses
   */
  private async calculateCityAverage(municipality: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.propertyAnalysis.aggregate({
      where: {
        property: {
          municipality,
        },
        calculatedAt: {
          gte: sevenDaysAgo,
        },
      },
      _avg: {
        overallScore: true,
      },
    });

    return Math.round(result._avg.overallScore || 60);
  }

  /**
   * Calculate percentile rank (0-100)
   * Shows what % of properties have lower scores
   */
  private async calculatePercentileRank(
    score: number,
    municipality: string
  ): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Count total properties analyzed
    const total = await this.prisma.propertyAnalysis.count({
      where: {
        property: {
          municipality,
        },
        calculatedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    // No data yet, assume median
    if (total === 0) return 50;

    // Count properties with lower scores
    const lowerCount = await this.prisma.propertyAnalysis.count({
      where: {
        property: {
          municipality,
        },
        calculatedAt: {
          gte: sevenDaysAgo,
        },
        overallScore: {
          lt: score,
        },
      },
    });

    return Math.round((lowerCount / total) * 100);
  }
}
