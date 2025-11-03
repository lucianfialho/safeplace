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
   * Considers all radii and timeframes with appropriate weights
   */
  calculate(incidents: AggregatedIncidents): number {
    let totalDeduction = 0;

    // Calculate weighted deduction for each radius
    const radii = [
      { data: incidents.radius500m, radius: 500 },
      { data: incidents.radius1km, radius: 1000 },
      { data: incidents.radius2km, radius: 2000 },
    ];

    for (const { data, radius } of radii) {
      const radiusWeight = this.RADIUS_WEIGHTS[radius];

      // Weight by timeframe
      const deduction =
        (data.last30Days.weightedTotal * this.TIMEFRAME_WEIGHTS[30] +
          data.last90Days.weightedTotal * this.TIMEFRAME_WEIGHTS[90] +
          data.last365Days.weightedTotal * this.TIMEFRAME_WEIGHTS[365]) *
        radiusWeight *
        this.POINTS_PER_INCIDENT;

      totalDeduction += deduction;
    }

    // Calculate final score (bounded between 0 and 100)
    const score = Math.max(0, Math.min(100, this.BASE_SCORE - totalDeduction));

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
