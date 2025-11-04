import { AggregatedIncidents, RadiusIncidents } from './types';

/**
 * Calculates safety scores based on incident data
 * Uses weighted formula considering proximity, recency, and severity
 */
export class ScoreCalculator {
  // Baseline: 0 incidents = 100 score
  private readonly BASE_SCORE = 100;

  // Radius weights (closer = more important)
  private readonly RADIUS_WEIGHTS: Record<number, number> = {
    500: 1.0, // Full weight
    1000: 0.6, // 60% weight
    2000: 0.3, // 30% weight
  };

  // Timeframe weights (recent = more important)
  private readonly TIMEFRAME_WEIGHTS: Record<number, number> = {
    30: 1.0, // Full weight
    90: 0.6, // 60% weight
    365: 0.3, // 30% weight
  };

  // Points deducted per weighted incident
  private readonly POINTS_PER_INCIDENT = 2;

  /**
   * Calculate overall safety score
   * Uses weighted average of radius scores to avoid counting incidents multiple times
   */
  calculate(incidents: AggregatedIncidents): number {
    // Calculate individual scores for each radius
    const score500m = this.calculateForRadius(incidents.radius500m);
    const score1km = this.calculateForRadius(incidents.radius1km);
    const score2km = this.calculateForRadius(incidents.radius2km);

    // Use weighted average based on radius importance
    // Closer incidents matter more, but we don't want to count them multiple times
    const weightedScore =
      score500m * this.RADIUS_WEIGHTS[500] +
      score1km * this.RADIUS_WEIGHTS[1000] +
      score2km * this.RADIUS_WEIGHTS[2000];

    // Normalize by total weights
    const totalWeight =
      this.RADIUS_WEIGHTS[500] + this.RADIUS_WEIGHTS[1000] + this.RADIUS_WEIGHTS[2000];

    const score = weightedScore / totalWeight;

    return Math.round(score);
  }

  /**
   * Calculate score for a specific radius
   * Used for radius-specific scores in the UI
   */
  calculateForRadius(radiusData: RadiusIncidents): number {
    const deduction =
      (radiusData.last30Days.weightedTotal * this.TIMEFRAME_WEIGHTS[30] +
        radiusData.last90Days.weightedTotal * this.TIMEFRAME_WEIGHTS[90] +
        radiusData.last365Days.weightedTotal * this.TIMEFRAME_WEIGHTS[365]) *
      this.POINTS_PER_INCIDENT;

    const score = Math.max(0, Math.min(100, this.BASE_SCORE - deduction));

    return Math.round(score);
  }
}
