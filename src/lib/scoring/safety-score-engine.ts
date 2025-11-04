import { PrismaClient } from '@prisma/client';
import { IncidentAggregator } from './incident-aggregator';
import { ScoreCalculator } from './score-calculator';
import { TrendAnalyzer } from './trend-analyzer';
import { Comparator } from './comparator';
import { SafetyScore, IncidentCounts, AggregatedIncidents } from './types';

/**
 * Main safety score engine
 * Orchestrates all scoring components to calculate comprehensive safety scores
 */
export class SafetyScoreEngine {
  private readonly incidentAggregator: IncidentAggregator;
  private readonly scoreCalculator: ScoreCalculator;
  private readonly trendAnalyzer: TrendAnalyzer;
  private readonly comparator: Comparator;

  constructor(private prisma: PrismaClient) {
    this.incidentAggregator = new IncidentAggregator(prisma);
    this.scoreCalculator = new ScoreCalculator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.comparator = new Comparator(prisma);
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

  /**
   * Format incident counts for API response
   */
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

/**
 * Get score badge based on score value
 */
export function getScoreBadge(score: number) {
  if (score >= 90) {
    return {
      label: 'Excelente',
      color: 'green',
      description: 'Área muito segura, com pouquíssimos incidentes de segurança',
    };
  }

  if (score >= 75) {
    return {
      label: 'Bom',
      color: 'lightgreen',
      description: 'Área segura, com taxa de incidentes abaixo da média da cidade',
    };
  }

  if (score >= 60) {
    return {
      label: 'Regular',
      color: 'yellow',
      description: 'Segurança na média da cidade, requer atenção básica',
    };
  }

  if (score >= 40) {
    return {
      label: 'Moderado',
      color: 'orange',
      description: 'Taxa de incidentes acima da média, requer atenção redobrada',
    };
  }

  if (score >= 20) {
    return {
      label: 'Ruim',
      color: 'red',
      description: 'Alta taxa de incidentes de segurança na região',
    };
  }

  return {
    label: 'Crítico',
    color: 'darkred',
    description: 'Taxa muito alta de incidentes - área de alto risco, tenha bastante cuidado',
  };
}
