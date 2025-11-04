import { IncidentType, RawIncident } from './types';

/**
 * Parses OTT Instagram post captions to extract incident data
 *
 * Caption format:
 * OTT 360 INFORMA:
 * Tiroteio - 15/10/25 06:33
 * Pavuna - Rio de Janeiro RJ
 */
export class InstagramParser {
  /**
   * Parse a single Instagram caption
   */
  parse(caption: string): RawIncident | null {
    try {
      // Split by lines and clean
      const lines = caption
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length < 3) {
        console.warn('Caption too short:', caption);
        return null;
      }

      // Line 1: Should be "OTT 360 INFORMA:" (skip)
      // Line 2: "Tiroteio - 15/10/25 06:33"
      // Line 3: "Pavuna - Rio de Janeiro RJ"

      const typeDateLine = lines[1];
      const locationLine = lines[2];

      // Parse type and date
      const typeMatch = typeDateLine.match(/^(.+?)\s*-\s*(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})/);
      if (!typeMatch) {
        console.warn('Could not parse type/date from:', typeDateLine);
        return null;
      }

      const typeStr = typeMatch[1].trim();
      const dateStr = typeMatch[2].trim();

      // Parse location
      const locationMatch = locationLine.match(/^(.+?)\s*-\s*(.+?)\s+([A-Z]{2})$/);
      if (!locationMatch) {
        console.warn('Could not parse location from:', locationLine);
        return null;
      }

      const neighborhood = locationMatch[1].trim();
      const municipality = locationMatch[2].trim();
      const state = locationMatch[3].trim();

      // Parse incident type
      const incidentType = this.parseIncidentType(typeStr);
      if (!incidentType) {
        console.warn('Unknown incident type:', typeStr);
        return null;
      }

      // Parse date
      const occurredAt = this.parseDate(dateStr);
      if (!occurredAt) {
        console.warn('Could not parse date:', dateStr);
        return null;
      }

      return {
        occurredAt,
        neighborhood,
        municipality,
        state,
        incidentType,
        source: 'OTT_INSTAGRAM',
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Error parsing Instagram caption:', error);
      return null;
    }
  }

  /**
   * Parse multiple captions (batch)
   */
  parseBatch(captions: string[]): RawIncident[] {
    return captions.map((c) => this.parse(c)).filter((r): r is RawIncident => r !== null);
  }

  /**
   * Parse date string "DD/MM/YY HH:MM" to Date object
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Format: "15/10/25 06:33"
      const [datePart, timePart] = dateStr.split(' ');
      if (!datePart || !timePart) return null;

      const [day, month, year] = datePart.split('/').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);

      if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute)) {
        return null;
      }

      // Assume 2000s for year
      const fullYear = year + 2000;

      const date = new Date(fullYear, month - 1, day, hour, minute);

      // Validate
      if (isNaN(date.getTime())) return null;

      return date;
    } catch {
      return null;
    }
  }

  /**
   * Map occurrence string to IncidentType enum
   */
  private parseIncidentType(typeStr: string): IncidentType | null {
    const normalized = typeStr.toLowerCase().trim();

    const mapping: Record<string, IncidentType> = {
      tiroteio: IncidentType.TIROTEIO,
      'disparos ouvidos': IncidentType.DISPAROS_OUVIDOS,
      incêndio: IncidentType.INCENDIO,
      incendio: IncidentType.INCENDIO,
      'utilidade pública': IncidentType.UTILIDADE_PUBLICA,
      'utilidade publica': IncidentType.UTILIDADE_PUBLICA,
      'operação policial': IncidentType.OPERACAO_POLICIAL,
      'operacao policial': IncidentType.OPERACAO_POLICIAL,
      assalto: IncidentType.ASSALTO,
      arrastão: IncidentType.ARRASTAO,
      arrastao: IncidentType.ARRASTAO,
      manifestação: IncidentType.MANIFESTACAO,
      manifestacao: IncidentType.MANIFESTACAO,
      'toque de recolher': IncidentType.TOQUE_DE_RECOLHER,
      'perseguição policial': IncidentType.PERSEGUICAO_POLICIAL,
      'perseguicao policial': IncidentType.PERSEGUICAO_POLICIAL,
      'roubo de carga': IncidentType.ROUBO_DE_CARGA,
      'carros na contramão': IncidentType.CARROS_NA_CONTRAMAO,
      'carros na contramao': IncidentType.CARROS_NA_CONTRAMAO,
    };

    return mapping[normalized] || null;
  }
}
