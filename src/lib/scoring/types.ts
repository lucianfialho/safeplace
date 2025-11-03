/**
 * Type definitions for Safety Score Engine
 */

export interface SafetyScore {
  overallScore: number; // 0-100
  score500m: number; // Score for 500m radius
  score1km: number; // Score for 1km radius
  score2km: number; // Score for 2km radius
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

export interface TrendAnalysis {
  direction: TrendDirection;
  percentage: number; // Absolute percentage change
  confidence: number; // 0-1
  recent30DayCount: number;
  previous30DayCount: number;
}

export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  STABLE = 'STABLE',
  WORSENING = 'WORSENING',
}

export interface ComparisonMetrics {
  neighborhoodAvgScore: number;
  cityAvgScore: number;
  percentileRank: number; // 0-100
  betterThanNeighborhood: boolean;
  betterThanCity: boolean;
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

export interface ScoreBadge {
  label: string;
  color: string;
  description: string;
}
