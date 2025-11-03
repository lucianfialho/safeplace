import { PrismaClient } from '@prisma/client';
import { AggregatedIncidents, RadiusIncidents, TimeframeIncidents } from './types';

/**
 * Aggregates incidents across multiple radii and timeframes
 * Uses PostGIS for efficient geospatial queries
 */
export class IncidentAggregator {
  constructor(private prisma: PrismaClient) {}

  /**
   * Aggregate incidents for all radii and timeframes
   */
  async aggregate(
    latitude: number,
    longitude: number
  ): Promise<AggregatedIncidents> {
    // Query all radii in parallel for better performance
    const [radius500m, radius1km, radius2km] = await Promise.all([
      this.aggregateForRadius(latitude, longitude, 500),
      this.aggregateForRadius(latitude, longitude, 1000),
      this.aggregateForRadius(latitude, longitude, 2000),
    ]);

    return {
      radius500m,
      radius1km,
      radius2km,
    };
  }

  /**
   * Aggregate incidents for a specific radius
   */
  private async aggregateForRadius(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<RadiusIncidents> {
    // Query all timeframes in parallel
    const [last30Days, last90Days, last365Days] = await Promise.all([
      this.queryTimeframe(latitude, longitude, radiusMeters, 30),
      this.queryTimeframe(latitude, longitude, radiusMeters, 90),
      this.queryTimeframe(latitude, longitude, radiusMeters, 365),
    ]);

    return {
      last30Days,
      last90Days,
      last365Days,
    };
  }

  /**
   * Query incidents for a specific timeframe using PostGIS
   */
  private async queryTimeframe(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    days: number
  ): Promise<TimeframeIncidents> {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Use PostGIS ST_DWithin for efficient geospatial query
    const result = await this.prisma.$queryRaw<
      Array<{
        incident_type: string;
        count: bigint;
        weighted_sum: number;
      }>
    >`
      SELECT
        incident_type,
        COUNT(*) as count,
        SUM(severity_score) as weighted_sum
      FROM incidents
      WHERE
        ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters}
        )
        AND occurred_at >= ${cutoffDate}
      GROUP BY incident_type
    `;

    // Convert to map and calculate totals
    const byType: Record<string, number> = {};
    let total = 0;
    let weightedTotal = 0;

    for (const row of result) {
      const count = Number(row.count);
      const weighted = Number(row.weighted_sum);
      byType[row.incident_type] = count;
      total += count;
      weightedTotal += weighted;
    }

    return {
      total,
      byType,
      weightedTotal,
    };
  }
}
