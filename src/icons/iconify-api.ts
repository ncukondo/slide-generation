/**
 * Iconify API Client
 *
 * Client for searching icons via the Iconify API.
 */

export interface SearchOptions {
  /** Maximum number of results (default: 20) */
  limit?: number;
  /** Filter by icon set prefixes */
  prefixes?: string[];
  /** Starting index for pagination */
  start?: number;
}

export interface SearchResult {
  /** Array of icon references (e.g., "mdi:heart") */
  icons: string[];
  /** Total number of matching icons */
  total: number;
  /** Limit used in the search */
  limit: number;
  /** Starting index */
  start: number;
}

export interface CollectionInfo {
  /** Display name of the collection */
  name: string;
  /** Total number of icons in the collection */
  total: number;
  /** Author information */
  author?: { name: string; url?: string };
  /** License information */
  license?: { title: string; spdx?: string };
  /** Sample icon names */
  samples?: string[];
  /** Collection category */
  category?: string;
}

export interface IconifyApiClientOptions {
  /** Base URL for the API (default: https://api.iconify.design) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Iconify API response for search
 */
interface IconifySearchResponse {
  icons: string[];
  total: number;
  limit: number;
  start: number;
}

/**
 * Client for interacting with the Iconify API
 */
export class IconifyApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options?: IconifyApiClientOptions) {
    this.baseUrl = options?.baseUrl ?? 'https://api.iconify.design';
    this.timeout = options?.timeout ?? 10000;
  }

  /**
   * Search for icons by query
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult> {
    const params = new URLSearchParams();
    params.set('query', query);

    if (options?.limit !== undefined) {
      params.set('limit', String(options.limit));
    }
    if (options?.start !== undefined) {
      params.set('start', String(options.start));
    }
    if (options?.prefixes && options.prefixes.length > 0) {
      params.set('prefixes', options.prefixes.join(','));
    }

    const url = `${this.baseUrl}/search?${params.toString()}`;
    const response = await this.fetch(url);

    const data = (await response.json()) as IconifySearchResponse;

    return {
      icons: data.icons ?? [],
      total: data.total ?? 0,
      limit: data.limit ?? (options?.limit ?? 64),
      start: data.start ?? 0,
    };
  }

  /**
   * Get available icon collections
   */
  async getCollections(): Promise<Record<string, CollectionInfo>> {
    const url = `${this.baseUrl}/collections`;
    const response = await this.fetch(url);
    return (await response.json()) as Record<string, CollectionInfo>;
  }

  /**
   * Perform a fetch request with timeout
   */
  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout: exceeded ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
