import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ReferenceManager, CSLItem, ReferenceManagerError } from './manager';
import { exec } from 'child_process';

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

const mockExec = vi.mocked(exec);

describe('ReferenceManager', () => {
  let manager: ReferenceManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ReferenceManager('ref');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockCSLItems: CSLItem[] = [
    {
      id: 'smith2024',
      author: [{ family: 'Smith', given: 'John' }],
      issued: { 'date-parts': [[2024]] },
      title: 'A great paper',
      PMID: '12345678',
    },
    {
      id: 'tanaka2023',
      author: [{ family: '田中', given: '太郎' }],
      issued: { 'date-parts': [[2023]] },
      title: '素晴らしい論文',
      DOI: '10.1234/example',
    },
    {
      id: 'johnson2022',
      author: [
        { family: 'Johnson', given: 'Alice' },
        { family: 'Williams', given: 'Bob' },
      ],
      issued: { 'date-parts': [[2022]] },
      title: 'A comprehensive review',
    },
  ];

  // Helper to create exec callback type
  type ExecCallback = (
    error: Error | null,
    stdout: string,
    stderr: string
  ) => void;

  describe('isAvailable', () => {
    it('should return true when CLI is available', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, 'ref version 1.0.0', '');
      }) as typeof exec);

      const available = await manager.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when CLI is not available', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        const error = new Error('Command not found');
        (error as NodeJS.ErrnoException).code = 'ENOENT';
        (callback as ExecCallback)(error, '', '');
      }) as typeof exec);

      const available = await manager.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all references', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
      }) as typeof exec);

      const items = await manager.getAll();

      expect(items).toHaveLength(3);
      expect(items[0]!.id).toBe('smith2024');
      expect(mockExec).toHaveBeenCalledWith(
        'ref list --format json',
        expect.any(Function)
      );
    });

    it('should throw ReferenceManagerError when CLI fails', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(new Error('CLI error'), '', '');
      }) as typeof exec);

      await expect(manager.getAll()).rejects.toThrow(ReferenceManagerError);
    });

    it('should throw ReferenceManagerError for invalid JSON', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, 'not valid json', '');
      }) as typeof exec);

      await expect(manager.getAll()).rejects.toThrow(ReferenceManagerError);
    });
  });

  describe('getById', () => {
    it('should return a single reference by ID', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(
          null,
          JSON.stringify([mockCSLItems[0]]),
          ''
        );
      }) as typeof exec);

      const item = await manager.getById('smith2024');

      expect(item).not.toBeNull();
      expect(item?.id).toBe('smith2024');
      expect(mockExec).toHaveBeenCalledWith(
        'ref list --id smith2024 --format json',
        expect.any(Function)
      );
    });

    it('should return null for non-existent ID', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, '[]', '');
      }) as typeof exec);

      const item = await manager.getById('nonexistent');

      expect(item).toBeNull();
    });
  });

  describe('getByIds', () => {
    it('should return a map of references by IDs', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, JSON.stringify(mockCSLItems), '');
      }) as typeof exec);

      const items = await manager.getByIds(['smith2024', 'tanaka2023']);

      expect(items.size).toBe(2);
      expect(items.get('smith2024')?.id).toBe('smith2024');
      expect(items.get('tanaka2023')?.id).toBe('tanaka2023');
      expect(items.has('johnson2022')).toBe(false);
    });

    it('should return empty map for empty IDs array', async () => {
      const items = await manager.getByIds([]);

      expect(items.size).toBe(0);
    });

    it('should handle partial matches', async () => {
      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(
          null,
          JSON.stringify([mockCSLItems[0]]),
          ''
        );
      }) as typeof exec);

      const items = await manager.getByIds(['smith2024', 'nonexistent']);

      expect(items.size).toBe(1);
      expect(items.has('smith2024')).toBe(true);
      expect(items.has('nonexistent')).toBe(false);
    });
  });

  describe('custom command', () => {
    it('should use custom command', async () => {
      const customManager = new ReferenceManager('custom-ref');

      mockExec.mockImplementation(((_cmd, callback) => {
        (callback as ExecCallback)(null, '[]', '');
      }) as typeof exec);

      await customManager.getAll();

      expect(mockExec).toHaveBeenCalledWith(
        'custom-ref list --format json',
        expect.any(Function)
      );
    });
  });
});
