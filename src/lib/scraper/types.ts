export enum IncidentType {
  TIROTEIO = 'TIROTEIO',
  DISPAROS_OUVIDOS = 'DISPAROS_OUVIDOS',
  INCENDIO = 'INCENDIO',
  UTILIDADE_PUBLICA = 'UTILIDADE_PUBLICA',
}

export interface RawIncident {
  occurredAt: Date;
  incidentType: IncidentType;
  neighborhood: string;
  municipality: string;
  state: string;
  source: string;
  scrapedAt: Date;
}

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
  confidence?: number;
}

export interface GeocodedIncident extends RawIncident {
  latitude?: number;
  longitude?: number;
}

export interface ScrapingResult {
  success: boolean;
  recordsFound: number;
  recordsNew: number;
  recordsDuplicate?: number;
  recordsFailed?: number;
  durationMs: number;
  error?: string;
}
