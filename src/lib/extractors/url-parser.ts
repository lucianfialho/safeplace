/**
 * Parses and validates Quinto Andar URLs
 */
export class QuintoAndarUrlParser {
  private readonly VALID_DOMAINS = [
    'quintoandar.com.br',
    'www.quintoandar.com.br',
  ];

  private readonly LISTING_ID_PATTERN = /\/imovel\/(\d+)/;

  /**
   * Extract listing ID from URL
   */
  extractListingId(url: string): string | null {
    try {
      const parsedUrl = new URL(url);

      // Validate domain
      if (!this.VALID_DOMAINS.includes(parsedUrl.hostname)) {
        return null;
      }

      // Extract ID from path
      const match = parsedUrl.pathname.match(this.LISTING_ID_PATTERN);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Validate if URL is a Quinto Andar property listing
   */
  isValidPropertyUrl(url: string): boolean {
    return this.extractListingId(url) !== null;
  }

  /**
   * Normalize URL to standard format
   */
  normalizeUrl(url: string): string | null {
    const listingId = this.extractListingId(url);
    if (!listingId) return null;

    return `https://www.quintoandar.com.br/imovel/${listingId}`;
  }
}
