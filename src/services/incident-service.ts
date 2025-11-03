import { PrismaClient } from '@prisma/client';
import { GeocodedIncident, IncidentType } from '@/lib/scraper/types';

/**
 * Database operations for incidents
 */
export class IncidentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Bulk insert incidents with PostGIS geography
   */
  async bulkInsert(incidents: GeocodedIncident[]): Promise<number> {
    let insertedCount = 0;

    for (const incident of incidents) {
      try {
        // Skip if missing coordinates
        if (!incident.latitude || !incident.longitude) {
          console.warn('Skipping incident without coordinates:', {
            neighborhood: incident.neighborhood,
            municipality: incident.municipality,
          });
          continue;
        }

        // Calculate severity score
        const severityScore = this.calculateSeverityScore(incident.incidentType);

        // Generate source ID for deduplication
        const sourceId = this.generateSourceId(incident);

        // Insert with PostGIS point using raw SQL
        await this.prisma.$executeRaw`
          INSERT INTO incidents (
            id,
            occurred_at,
            scraped_at,
            neighborhood,
            municipality,
            state,
            latitude,
            longitude,
            location,
            incident_type,
            severity_score,
            source,
            source_id,
            verified
          ) VALUES (
            gen_random_uuid(),
            ${incident.occurredAt},
            ${incident.scrapedAt},
            ${incident.neighborhood},
            ${incident.municipality},
            ${incident.state},
            ${incident.latitude},
            ${incident.longitude},
            ST_SetSRID(ST_MakePoint(${incident.longitude}, ${incident.latitude}), 4326)::geography,
            ${incident.incidentType}::"IncidentType",
            ${severityScore},
            ${incident.source},
            ${sourceId},
            false
          )
          ON CONFLICT (source, source_id) DO NOTHING
        `;

        insertedCount++;
      } catch (error: any) {
        // Check if it's a duplicate (conflict) - this is expected
        if (error?.code === '23505') {
          // Unique constraint violation - skip silently
          continue;
        }
        console.error('Failed to insert incident:', error);
        // Continue with next incident
      }
    }

    return insertedCount;
  }

  /**
   * Find incident by source and source_id
   */
  async findBySourceId(source: string, sourceId: string) {
    return this.prisma.incident.findUnique({
      where: {
        source_source_id: {
          source,
          sourceId,
        },
      },
    });
  }

  /**
   * Count total incidents
   */
  async count(filters?: {
    municipality?: string;
    state?: string;
    since?: Date;
  }) {
    return this.prisma.incident.count({
      where: {
        municipality: filters?.municipality,
        state: filters?.state,
        occurredAt: filters?.since
          ? {
              gte: filters.since,
            }
          : undefined,
      },
    });
  }

  /**
   * Get recent incidents
   */
  async getRecent(limit: number = 10) {
    return this.prisma.incident.findMany({
      take: limit,
      orderBy: {
        occurredAt: 'desc',
      },
    });
  }

  /**
   * Calculate severity score based on incident type
   */
  private calculateSeverityScore(type: IncidentType): number {
    const scores: Record<IncidentType, number> = {
      [IncidentType.TIROTEIO]: 10,
      [IncidentType.DISPAROS_OUVIDOS]: 5,
      [IncidentType.INCENDIO]: 6,
      [IncidentType.UTILIDADE_PUBLICA]: 2,
      [IncidentType.OPERACAO_POLICIAL]: 7,
    };

    return scores[type] || 5;
  }

  /**
   * Generate unique source ID from incident data
   * Format: {occurred_at}_{municipality}_{neighborhood}_{type}
   */
  private generateSourceId(incident: GeocodedIncident): string {
    const timestamp = incident.occurredAt.toISOString();
    const parts = [
      timestamp,
      incident.municipality,
      incident.neighborhood,
      incident.incidentType,
    ];

    return parts
      .join('_')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
  }
}
