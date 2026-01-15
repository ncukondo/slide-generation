import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import { SearchCache } from './search-cache.js';

describe('SearchCache', () => {
  const cacheDir = '.test-cache/icon-search';

  beforeEach(async () => {
    await fs.mkdir(cacheDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm('.test-cache', { recursive: true, force: true });
  });

  it('should cache search results', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 3600 });
    const data = { icons: ['mdi:heart'], total: 1 };

    await cache.set('heart', data);
    const cached = await cache.get<typeof data>('heart');

    expect(cached).toEqual(data);
  });

  it('should return null for expired cache', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 0 });
    const data = { icons: ['mdi:heart'], total: 1 };

    await cache.set('heart', data);
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    const cached = await cache.get('heart');

    expect(cached).toBeNull();
  });

  it('should return null for missing cache', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 3600 });
    const cached = await cache.get('nonexistent');

    expect(cached).toBeNull();
  });

  it('should handle invalid JSON gracefully', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 3600 });
    const cacheFile = `${cacheDir}/invalid.json`;

    await fs.writeFile(cacheFile, 'not json', 'utf-8');
    const cached = await cache.get('invalid');

    expect(cached).toBeNull();
  });

  it('should handle special characters in keys', async () => {
    const cache = new SearchCache({ directory: cacheDir, ttl: 3600 });
    const data = { icons: ['mdi:folder-open'], total: 1 };

    await cache.set('folder/open', data);
    const cached = await cache.get<typeof data>('folder/open');

    expect(cached).toEqual(data);
  });
});
