import { PrismaClient } from '@prisma/client';
import { PropertyData } from '@/lib/extractors/types';

/**
 * Database operations for properties
 */
export class PropertyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Find property by Quinto Andar listing ID
   */
  async findByListingId(listingId: string) {
    return this.prisma.property.findUnique({
      where: {
        qaListingId: listingId,
      },
    });
  }

  /**
   * Upsert property data with PostGIS location
   */
  async upsert(data: PropertyData) {
    // Serialize placesNearby to JSON string for raw SQL
    const placesNearbyJson = data.placesNearby ? JSON.stringify(data.placesNearby) : null;

    // Use raw SQL for PostGIS and ENUM handling
    await this.prisma.$executeRaw`
      INSERT INTO properties (
        id,
        qa_listing_id,
        qa_url,
        address,
        neighborhood,
        municipality,
        state,
        latitude,
        longitude,
        location,
        property_type,
        business_context,
        price,
        condominium_fee,
        iptu,
        total_area,
        bedroom_count,
        bathroom_count,
        suite_count,
        parking_slots,
        is_furnished,
        places_nearby,
        first_analyzed_at,
        last_analyzed_at,
        analysis_count
      ) VALUES (
        gen_random_uuid(),
        ${data.qaListingId},
        ${data.qaUrl},
        ${data.address},
        ${data.neighborhood},
        ${data.municipality},
        ${data.state},
        ${data.latitude},
        ${data.longitude},
        ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)::geography,
        ${data.propertyType}::"PropertyType",
        ${data.businessContext}::"BusinessContext",
        ${data.price},
        ${data.condominiumFee},
        ${data.iptu},
        ${data.totalArea},
        ${data.bedroomCount},
        ${data.bathroomCount},
        ${data.suiteCount},
        ${data.parkingSlots},
        ${data.isFurnished},
        ${placesNearbyJson}::jsonb,
        NOW(),
        NOW(),
        1
      )
      ON CONFLICT (qa_listing_id) DO UPDATE SET
        last_analyzed_at = NOW(),
        analysis_count = properties.analysis_count + 1,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        location = EXCLUDED.location,
        price = EXCLUDED.price,
        condominium_fee = EXCLUDED.condominium_fee,
        iptu = EXCLUDED.iptu,
        places_nearby = EXCLUDED.places_nearby
    `;

    // Return the upserted property
    return this.findByListingId(data.qaListingId);
  }

  /**
   * Check if cached property data is still valid
   * Cache for 7 days since property data rarely changes
   */
  isCacheValid(property: any): boolean {
    if (!property?.lastAnalyzedAt) return false;

    const cacheAgeMs = Date.now() - property.lastAnalyzedAt.getTime();
    const maxCacheAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days

    return cacheAgeMs < maxCacheAgeMs;
  }
}
