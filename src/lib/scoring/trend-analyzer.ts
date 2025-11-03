import { AggregatedIncidents, TrendAnalysis, TrendDirection } from './types';

/**
 * Analyzes incident trends to determine if situation is improving or worsening
 */
export class TrendAnalyzer {
  /**
   * Analyze trend based on 30 vs 90 day comparison
   */
  analyze(incidents: AggregatedIncidents): TrendAnalysis {
    // Use 1km radius for trend analysis (good balance)
    const recent30 = incidents.radius1km.last30Days.total;
    const previous30 = this.calculatePrevious30Days(
      incidents.radius1km.last90Days.total,
      recent30
    );

    // Calculate percentage change
    const change = this.calculatePercentageChange(recent30, previous30);

    // Determine trend direction
    const direction = this.determineTrendDirection(change);

    // Calculate confidence (based on sample size)
    const confidence = this.calculateConfidence(recent30, previous30);

    return {
      direction,
      percentage: Math.abs(change),
      confidence,
      recent30DayCount: recent30,
      previous30DayCount: previous30,
    };
  }

  /**
   * Calculate incidents from 31-90 days ago
   * Approximation: (90 days total - 30 days recent) / 2
   * This gives us an estimate of the 31-60 day period
   */
  private calculatePrevious30Days(last90Total: number, recent30: number): number {
    return Math.round((last90Total - recent30) / 2);
  }

  /**
   * Calculate percentage change
   */
  private calculatePercentageChange(recent: number, previous: number): number {
    if (previous === 0) {
      return recent > 0 ? 100 : 0;
    }

    return ((recent - previous) / previous) * 100;
  }

  /**
   * Determine trend direction based on percentage change
   * > +10% = WORSENING
   * < -10% = IMPROVING
   * Otherwise = STABLE
   */
  private determineTrendDirection(change: number): TrendDirection {
    if (change < -10) return TrendDirection.IMPROVING;
    if (change > 10) return TrendDirection.WORSENING;
    return TrendDirection.STABLE;
  }

  /**
   * Calculate confidence in trend analysis
   * Higher incident counts = higher confidence
   */
  private calculateConfidence(recent: number, previous: number): number {
    const totalSample = recent + previous;

    if (totalSample >= 20) return 0.9;
    if (totalSample >= 10) return 0.7;
    if (totalSample >= 5) return 0.5;
    return 0.3;
  }
}
