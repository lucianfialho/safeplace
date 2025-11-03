# Safety Score Engine Specification

## Overview
Core algorithm that calculates a 0-100 safety score for properties based on incident data from multiple radii and timeframes, with trend analysis and comparative metrics.

## Score Calculation Philosophy

### Principles
1. **Proximity matters**: Closer incidents have more weight
2. **Recency matters**: Recent incidents have more weight
3. **Severity matters**: Shootings weighted higher than other incidents
4. **Context matters**: Compare against neighborhood and city averages
5. **Transparency**: User should understand how score is calculated

### Score Range
- **90-100**: Excellent - Very few incidents
- **75-89**: Good - Below average incidents
- **60-74**: Fair - Average for the city
- **40-59**: Moderate - Above average incidents
- **20-39**: Poor - Significantly above average
- **0-19**: Critical - Extremely high incident rate

## Algorithm Components

### 1. Multi-Radius Analysis

Calculate incident counts for three radii:
- **500m**: Immediate vicinity (highest weight)
- **1km**: Walking distance (medium weight)
- **2km**: General area (lowest weight)

### 2. Time-Window Analysis

Count incidents across three timeframes:
- **30 days**: Recent trends (highest weight)
- **90 days**: Medium-term trends (medium weight)
- **365 days**: Long-term context (lowest weight)

### 3. Incident Type Weighting

Different incident types have different severity:
```typescript
const SEVERITY_WEIGHTS = {
  TIROTEIO: 1.0,              // Full weight
  ARRASTAO: 0.9,              // High severity
  OPERACAO_POLICIAL: 0.7,     // Medium-high
  DISPAROS_OUVIDOS: 0.5,      // Medium
  INCENDIO: 0.6,              // Medium
  UTILIDADE_PUBLICA: 0.2,     // Low
};
```

## Implementation

### File Structure
```
/src
  /lib
    /scoring
      safety-score-engine.ts       # Main scoring engine
      incident-aggregator.ts       # Query and aggregate incidents
      score-calculator.ts          # Core calculation logic
      trend-analyzer.ts            # Trend detection
      comparator.ts                # Compare with averages
      types.ts                     # TypeScript types
```

### 1. Safety Score Engine (safety-score-engine.ts)

```typescript
import { IncidentAggregator } from './incident-aggregator';
import { ScoreCalculator } from './score-calculator';
import { TrendAnalyzer } from './trend-analyzer';
import { Comparator } from './comparator';

/**
 * Main safety score engine
 * Orchestrates all scoring components
 */
export class SafetyScoreEngine {
  private readonly incidentAggregator: IncidentAggregator;
  private readonly scoreCalculator: ScoreCalculator;
  private readonly trendAnalyzer: TrendAnalyzer;
  private readonly comparator: Comparator;

  constructor() {
    this.incidentAggregator = new IncidentAggregator();
    this.scoreCalculator = new ScoreCalculator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.comparator = new Comparator();
  }

  /**
   * Calculate comprehensive safety score for a property
   */
  async calculateScore(
    latitude: number,
    longitude: number,
    neighborhood: string,
    municipality: string
  ): Promise<SafetyScore> {
    // 1. Aggregate incidents across all radii and timeframes
    const incidents = await this.incidentAggregator.aggregate(latitude, longitude);

    // 2. Calculate base score
    const baseScore = this.scoreCalculator.calculate(incidents);

    // 3. Analyze trends
    const trend = this.trendAnalyzer.analyze(incidents);

    // 4. Compare with averages
    const comparison = await this.comparator.compare(
      baseScore,
      neighborhood,
      municipality
    );

    // 5. Calculate radius-specific scores
    const radiusScores = {
      score500m: this.scoreCalculator.calculateForRadius(incidents.radius500m),
      score1km: this.scoreCalculator.calculateForRadius(incidents.radius1km),
      score2km: this.scoreCalculator.calculateForRadius(incidents.radius2km),
    };

    return {
      overallScore: baseScore,
      ...radiusScores,
      incidents: this.formatIncidentCounts(incidents),
      trend,
      comparison,
      calculatedAt: new Date(),
    };
  }

  private formatIncidentCounts(incidents: AggregatedIncidents): IncidentCounts {
    return {
      incidents500m30d: incidents.radius500m.last30Days.total,
      incidents500m90d: incidents.radius500m.last90Days.total,
      incidents500m365d: incidents.radius500m.last365Days.total,
      incidents1km30d: incidents.radius1km.last30Days.total,
      incidents1km90d: incidents.radius1km.last90Days.total,
      incidents1km365d: incidents.radius1km.last365Days.total,
      incidents2km30d: incidents.radius2km.last30Days.total,
      incidents2km90d: incidents.radius2km.last90Days.total,
      incidents2km365d: incidents.radius2km.last365Days.total,
      tiroteirosCount: incidents.radius1km.last30Days.byType.TIROTEIO || 0,
      disparosCount: incidents.radius1km.last30Days.byType.DISPAROS_OUVIDOS || 0,
      incendiosCount: incidents.radius1km.last30Days.byType.INCENDIO || 0,
      outrosCount: incidents.radius1km.last30Days.byType.UTILIDADE_PUBLICA || 0,
    };
  }
}

export interface SafetyScore {
  overallScore: number;       // 0-100
  score500m: number;          // Score for 500m radius
  score1km: number;           // Score for 1km radius
  score2km: number;           // Score for 2km radius
  incidents: IncidentCounts;
  trend: TrendAnalysis;
  comparison: ComparisonMetrics;
  calculatedAt: Date;
}

export interface IncidentCounts {
  incidents500m30d: number;
  incidents500m90d: number;
  incidents500m365d: number;
  incidents1km30d: number;
  incidents1km90d: number;
  incidents1km365d: number;
  incidents2km30d: number;
  incidents2km90d: number;
  incidents2km365d: number;
  tiroteirosCount: number;
  disparosCount: number;
  incendiosCount: number;
  outrosCount: number;
}
```

### 2. Incident Aggregator (incident-aggregator.ts)

```typescript
import { PrismaClient } from '@prisma/client';

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
    const point = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;

    // Query all radii in parallel
    const [radius500m, radius1km, radius2km] = await Promise.all([
      this.aggregateForRadius(point, 500),
      this.aggregateForRadius(point, 1000),
      this.aggregateForRadius(point, 2000),
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
    point: string,
    radiusMeters: number
  ): Promise<RadiusIncidents> {
    // Query all timeframes in parallel
    const [last30Days, last90Days, last365Days] = await Promise.all([
      this.queryTimeframe(point, radiusMeters, 30),
      this.queryTimeframe(point, radiusMeters, 90),
      this.queryTimeframe(point, radiusMeters, 365),
    ]);

    return {
      last30Days,
      last90Days,
      last365Days,
    };
  }

  /**
   * Query incidents for a specific timeframe
   */
  private async queryTimeframe(
    point: string,
    radiusMeters: number,
    days: number
  ): Promise<TimeframeIncidents> {
    const result = await this.prisma.$queryRaw<Array<{
      incident_type: string;
      count: bigint;
      weighted_sum: number;
    }>>`
      SELECT
        incident_type,
        COUNT(*) as count,
        SUM(severity_score) as weighted_sum
      FROM incidents
      WHERE
        ST_DWithin(
          location,
          ${point},
          ${radiusMeters}
        )
        AND occurred_at >= NOW() - INTERVAL '${days} days'
      GROUP BY incident_type
    `;

    // Convert to map
    const byType: Record<string, number> = {};
    let total = 0;
    let weightedTotal = 0;

    for (const row of result) {
      const count = Number(row.count);
      byType[row.incident_type] = count;
      total += count;
      weightedTotal += row.weighted_sum;
    }

    return {
      total,
      byType,
      weightedTotal,
    };
  }
}

export interface AggregatedIncidents {
  radius500m: RadiusIncidents;
  radius1km: RadiusIncidents;
  radius2km: RadiusIncidents;
}

export interface RadiusIncidents {
  last30Days: TimeframeIncidents;
  last90Days: TimeframeIncidents;
  last365Days: TimeframeIncidents;
}

export interface TimeframeIncidents {
  total: number;
  byType: Record<string, number>;
  weightedTotal: number;
}
```

### 3. Score Calculator (score-calculator.ts)

```typescript
/**
 * Calculates safety scores based on incident data
 * Uses weighted formula considering proximity, recency, and severity
 */
export class ScoreCalculator {
  // Baseline: 0 incidents = 100 score
  // Scale: Each weighted incident reduces score
  private readonly BASE_SCORE = 100;

  // Radius weights (closer = more important)
  private readonly RADIUS_WEIGHTS = {
    500: 1.0,   // Full weight
    1000: 0.6,  // 60% weight
    2000: 0.3,  // 30% weight
  };

  // Timeframe weights (recent = more important)
  private readonly TIMEFRAME_WEIGHTS = {
    30: 1.0,    // Full weight
    90: 0.6,    // 60% weight
    365: 0.3,   // 30% weight
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

    // Calculate final score
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
```

### 4. Trend Analyzer (trend-analyzer.ts)

```typescript
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
   */
  private calculatePrevious30Days(last90Total: number, recent30: number): number {
    // Approximate: (90 days total - 30 days recent) / 2
    // This gives us an estimate of the 31-60 day period
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
   * Determine trend direction
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

export interface TrendAnalysis {
  direction: TrendDirection;
  percentage: number;         // Absolute percentage change
  confidence: number;         // 0-1
  recent30DayCount: number;
  previous30DayCount: number;
}

export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  WORSENING = 'WORSENING',
}
```

### 5. Comparator (comparator.ts)

```typescript
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
    const [neighborhoodAvg, cityAvg] = await Promise.all([
      this.calculateNeighborhoodAverage(neighborhood, municipality),
      this.calculateCityAverage(municipality),
    ]);

    // Calculate percentile rank
    const percentile = await this.calculatePercentileRank(score, municipality);

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
   */
  private async calculateNeighborhoodAverage(
    neighborhood: string,
    municipality: string
  ): Promise<number> {
    const result = await this.prisma.propertyAnalysis.aggregate({
      where: {
        property: {
          neighborhood,
          municipality,
        },
        calculatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      _avg: {
        overallScore: true,
      },
    });

    return Math.round(result._avg.overallScore || 60); // Default to 60 if no data
  }

  /**
   * Calculate average score for entire city
   */
  private async calculateCityAverage(municipality: string): Promise<number> {
    const result = await this.prisma.propertyAnalysis.aggregate({
      where: {
        property: {
          municipality,
        },
        calculatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
    const total = await this.prisma.propertyAnalysis.count({
      where: {
        property: {
          municipality,
        },
        calculatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    if (total === 0) return 50; // No data, assume median

    const lowerCount = await this.prisma.propertyAnalysis.count({
      where: {
        property: {
          municipality,
        },
        calculatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
        overallScore: {
          lt: score,
        },
      },
    });

    return Math.round((lowerCount / total) * 100);
  }
}

export interface ComparisonMetrics {
  neighborhoodAvgScore: number;
  cityAvgScore: number;
  percentileRank: number;          // 0-100
  betterThanNeighborhood: boolean;
  betterThanCity: boolean;
}
```

## Score Interpretation

### Score Badges
```typescript
export function getScoreBadge(score: number): ScoreBadge {
  if (score >= 90) {
    return {
      label: 'Excellent',
      color: 'green',
      description: 'Very few security incidents in this area',
    };
  }

  if (score >= 75) {
    return {
      label: 'Good',
      color: 'lightgreen',
      description: 'Below average incident rate',
    };
  }

  if (score >= 60) {
    return {
      label: 'Fair',
      color: 'yellow',
      description: 'Average incident rate for the city',
    };
  }

  if (score >= 40) {
    return {
      label: 'Moderate',
      color: 'orange',
      description: 'Above average incident rate',
    };
  }

  if (score >= 20) {
    return {
      label: 'Poor',
      color: 'red',
      description: 'Significantly higher incident rate',
    };
  }

  return {
    label: 'Critical',
    color: 'darkred',
    description: 'Extremely high incident rate - exercise caution',
  };
}
```

## Performance Optimization

### Caching Strategy
```typescript
/**
 * Cache scores for a property
 * Recalculate only if:
 * - Score > 6 hours old
 * - New incidents in area
 */
export class CachedScoreEngine {
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  async getScore(propertyId: string): Promise<SafetyScore> {
    // Check cache
    const cached = await this.getCachedScore(propertyId);

    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Calculate new score
    const score = await this.calculateScore(propertyId);

    // Save to cache
    await this.saveToCache(propertyId, score);

    return score;
  }

  private isCacheValid(cached: any): boolean {
    const age = Date.now() - cached.calculatedAt.getTime();
    return age < this.CACHE_TTL_MS;
  }
}
```

### Database Indexes
Ensure these indexes exist for optimal performance:
```sql
-- Geospatial queries
CREATE INDEX incidents_location_gist_idx ON incidents USING GIST (location);

-- Temporal queries
CREATE INDEX incidents_occurred_at_idx ON incidents (occurred_at DESC);

-- Composite for common queries
CREATE INDEX incidents_location_time_idx
ON incidents (municipality, occurred_at DESC, incident_type)
WHERE occurred_at > NOW() - INTERVAL '1 year';
```

## Testing

### Unit Tests
```typescript
describe('ScoreCalculator', () => {
  it('should return 100 for zero incidents', () => {
    const calculator = new ScoreCalculator();
    const incidents = createEmptyIncidents();
    expect(calculator.calculate(incidents)).toBe(100);
  });

  it('should decrease score with more incidents', () => {
    const calculator = new ScoreCalculator();
    const few = createIncidents(5);
    const many = createIncidents(20);
    expect(calculator.calculate(many)).toBeLessThan(calculator.calculate(few));
  });
});
```

### Integration Tests
```typescript
describe('SafetyScoreEngine', () => {
  it('should calculate score for real property', async () => {
    const engine = new SafetyScoreEngine();
    const score = await engine.calculateScore(
      -22.9327433,
      -43.3525182,
      'Copacabana',
      'Rio de Janeiro'
    );

    expect(score.overallScore).toBeGreaterThanOrEqual(0);
    expect(score.overallScore).toBeLessThanOrEqual(100);
    expect(score.trend).toBeDefined();
    expect(score.comparison).toBeDefined();
  });
});
```

## Future Enhancements

### Machine Learning
- Predict future incident likelihood
- Identify spatial-temporal patterns
- Weight incidents by time of day

### Advanced Features
- Time-of-day scores (daytime vs nighttime)
- Route safety scores (for commutes)
- Customizable weights (users prioritize different incidents)
- Historical score tracking (see how area changed over time)
