import { GeocodedLocation, RawIncident, GeocodedIncident } from './types';

/**
 * Resolves neighborhood + municipality + state to lat/long coordinates
 * Uses caching to avoid repeated geocoding of same locations
 */
export class Geocoder {
  private cache: Map<string, GeocodedLocation> = new Map();
  private readonly provider: GeocodingProvider;

  constructor() {
    // Use OpenStreetMap Nominatim (free) for now
    this.provider = new NominatimProvider();
  }

  /**
   * Geocode multiple incidents in batch
   */
  async batchGeocode(incidents: RawIncident[]): Promise<GeocodedIncident[]> {
    const results: GeocodedIncident[] = [];

    for (const incident of incidents) {
      const location = await this.geocode(
        incident.neighborhood,
        incident.municipality,
        incident.state
      );

      results.push({
        ...incident,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
    }

    return results;
  }

  /**
   * Geocode a single location
   */
  async geocode(
    neighborhood: string,
    municipality: string,
    state: string
  ): Promise<GeocodedLocation | null> {
    const cacheKey = `${neighborhood}|${municipality}|${state}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Build query string
      const query = `${neighborhood}, ${municipality}, ${state}, Brazil`;

      // Call geocoding provider
      const result = await this.provider.geocode(query);

      if (result) {
        this.cache.set(cacheKey, result);
        return result;
      }

      return null;
    } catch (error) {
      console.error(`Geocoding failed for ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Nominatim provider (OpenStreetMap - free but rate limited)
 */
class NominatimProvider implements GeocodingProvider {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org';
  private lastRequestTime = 0;
  private readonly minRequestInterval = 1000; // 1 second between requests

  async geocode(query: string): Promise<GeocodedLocation | null> {
    // Respect rate limiting
    await this.throttle();

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'SafePlace/1.0 (https://github.com/safeplace)',
        },
      });

      if (!response.ok) {
        console.warn(`Nominatim returned ${response.status} for: ${query}`);
        return null;
      }

      const data = await response.json();

      if (data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          confidence: parseFloat(data[0].importance || '0.5'),
        };
      }

      return null;
    } catch (error) {
      console.error('Nominatim request failed:', error);
      return null;
    }
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();
  }
}

interface GeocodingProvider {
  geocode(query: string): Promise<GeocodedLocation | null>;
}
