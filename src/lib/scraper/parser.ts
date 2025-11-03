import * as cheerio from 'cheerio';
import { RawIncident, IncidentType } from './types';

/**
 * Parses OTT HTML table into structured incident data
 */
export class OttParser {
  /**
   * Parse HTML and extract incidents
   */
  parse(html: string): RawIncident[] {
    const $ = cheerio.load(html);
    const incidents: RawIncident[] = [];

    // Find the main table
    $('table').each((_, table) => {
      // Skip if not the main incidents table
      const headers = $(table)
        .find('th')
        .map((_, el) => $(el).text().trim())
        .get();

      if (!headers.includes('Ocorrência') && !headers.includes('Ocorrencia')) {
        return;
      }

      // Parse each row
      $(table)
        .find('tbody tr')
        .each((_, row) => {
          try {
            const cells = $(row)
              .find('td')
              .map((_, el) => $(el).text().trim())
              .get();

            if (cells.length >= 5) {
              const incident = this.parseRow(cells);
              if (incident) {
                incidents.push(incident);
              }
            }
          } catch (error) {
            console.error('Error parsing row:', error);
            // Continue with next row
          }
        });
    });

    return incidents;
  }

  /**
   * Parse a single table row into an incident
   */
  private parseRow(cells: string[]): RawIncident | null {
    try {
      const [dateStr, occurrenceStr, neighborhood, municipality, state] = cells;

      // Parse date: "03/11/25 14:30" -> Date object
      const occurredAt = this.parseDate(dateStr);
      if (!occurredAt) {
        console.warn('Failed to parse date:', dateStr);
        return null;
      }

      // Parse incident type
      const incidentType = this.parseIncidentType(occurrenceStr);
      if (!incidentType) {
        console.warn('Failed to parse incident type:', occurrenceStr);
        return null;
      }

      return {
        occurredAt,
        incidentType,
        neighborhood: neighborhood.trim(),
        municipality: municipality.trim(),
        state: state.trim(),
        source: 'OTT',
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse row:', cells, error);
      return null;
    }
  }

  /**
   * Parse date string "DD/MM/YY HH:MM" to Date object
   */
  private parseDate(dateStr: string): Date | null {
    try {
      // Format: "03/11/25 14:30"
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
  private parseIncidentType(occurrenceStr: string): IncidentType | null {
    const normalized = occurrenceStr.toLowerCase().trim();

    const mapping: Record<string, IncidentType> = {
      tiroteio: IncidentType.TIROTEIO,
      'disparos ouvidos': IncidentType.DISPAROS_OUVIDOS,
      incêndio: IncidentType.INCENDIO,
      incendio: IncidentType.INCENDIO,
      'utilidade pública': IncidentType.UTILIDADE_PUBLICA,
      'utilidade publica': IncidentType.UTILIDADE_PUBLICA,
    };

    return mapping[normalized] || null;
  }
}
