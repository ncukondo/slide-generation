import { describe, it, expect } from 'vitest';
import { IconifyApiClient } from './iconify-api.js';

describe('IconifyApiClient', () => {
  describe('search', () => {
    it('should search icons by query', async () => {
      const client = new IconifyApiClient();
      const results = await client.search('heart', { limit: 5 });

      expect(results.icons).toBeDefined();
      expect(results.total).toBeGreaterThan(0);
    });

    it('should filter by icon set', async () => {
      const client = new IconifyApiClient();
      const results = await client.search('heart', {
        limit: 10,
        prefixes: ['mdi']
      });

      expect(results.icons.every(icon => icon.startsWith('mdi:'))).toBe(true);
    });

    it('should handle empty results', async () => {
      const client = new IconifyApiClient();
      const results = await client.search('xyznonexistent12345', { limit: 5 });

      expect(results.icons).toEqual([]);
      expect(results.total).toBe(0);
    });

    it('should handle network errors gracefully', async () => {
      const client = new IconifyApiClient({ baseUrl: 'https://invalid.example.com' });

      await expect(client.search('heart')).rejects.toThrow();
    });
  });

  describe('getCollections', () => {
    it('should list available icon collections', async () => {
      const client = new IconifyApiClient();
      const collections = await client.getCollections();

      expect(collections).toHaveProperty('mdi');
      expect(collections).toHaveProperty('heroicons');
      expect(collections['mdi']).toHaveProperty('name');
      expect(collections['mdi']).toHaveProperty('total');
    });
  });
});
