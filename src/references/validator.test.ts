import { describe, it, expect, vi } from 'vitest';
import { ReferenceValidator } from './validator';
import type { ReferenceManager } from './manager';

describe('ReferenceValidator', () => {
  describe('validateCitations', () => {
    it('should return valid result when all citations exist', async () => {
      const mockManager = {
        getByIds: vi.fn().mockResolvedValue(
          new Map([
            ['smith2024', { id: 'smith2024', title: 'Test' }],
            ['tanaka2023', { id: 'tanaka2023', title: 'Test 2' }],
          ])
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const result = await validator.validateCitations([
        'smith2024',
        'tanaka2023',
      ]);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.found).toEqual(['smith2024', 'tanaka2023']);
    });

    it('should detect missing citations', async () => {
      const mockManager = {
        getByIds: vi
          .fn()
          .mockResolvedValue(
            new Map([['smith2024', { id: 'smith2024', title: 'Test' }]])
          ),
        isAvailable: vi.fn().mockResolvedValue(true),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const result = await validator.validateCitations([
        'smith2024',
        'unknown2024',
      ]);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['unknown2024']);
      expect(result.found).toEqual(['smith2024']);
    });

    it('should handle reference-manager unavailable', async () => {
      const mockManager = {
        isAvailable: vi.fn().mockResolvedValue(false),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const result = await validator.validateCitations(['smith2024']);

      expect(result.valid).toBe(true); // Validation skipped
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('reference-manager');
    });

    it('should return valid result for empty citations array', async () => {
      const mockManager = {
        getByIds: vi.fn().mockResolvedValue(new Map()),
        isAvailable: vi.fn().mockResolvedValue(true),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const result = await validator.validateCitations([]);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.found).toEqual([]);
    });
  });

  describe('validateWithLocations', () => {
    it('should report slide locations for missing citations', async () => {
      const mockManager = {
        getByIds: vi
          .fn()
          .mockResolvedValue(
            new Map([['smith2024', { id: 'smith2024', title: 'Test' }]])
          ),
        isAvailable: vi.fn().mockResolvedValue(true),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const slides = [
        {
          template: 'bullet-list',
          content: { items: ['text [@smith2024]', 'more [@unknown2024]'] },
        },
        {
          template: 'bullet-list',
          content: { items: ['another [@unknown2024]'] },
        },
      ];

      const result = await validator.validateWithLocations(slides as any);

      expect(result.valid).toBe(false);
      expect(result.missingDetails).toHaveLength(1);
      expect(result.missingDetails[0]!.id).toBe('unknown2024');
      expect(result.missingDetails[0]!.locations).toHaveLength(2);
      expect(result.missingDetails[0]!.locations[0]!.slide).toBe(1);
      expect(result.missingDetails[0]!.locations[1]!.slide).toBe(2);
    });

    it('should handle all citations found', async () => {
      const mockManager = {
        getByIds: vi.fn().mockResolvedValue(
          new Map([
            ['smith2024', { id: 'smith2024', title: 'Test' }],
            ['tanaka2023', { id: 'tanaka2023', title: 'Test 2' }],
          ])
        ),
        isAvailable: vi.fn().mockResolvedValue(true),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const slides = [
        {
          template: 'bullet-list',
          content: { items: ['[@smith2024]', '[@tanaka2023]'] },
        },
      ];

      const result = await validator.validateWithLocations(slides as any);

      expect(result.valid).toBe(true);
      expect(result.missingDetails).toHaveLength(0);
    });

    it('should handle reference-manager unavailable', async () => {
      const mockManager = {
        isAvailable: vi.fn().mockResolvedValue(false),
      } as unknown as ReferenceManager;

      const validator = new ReferenceValidator(mockManager);
      const slides = [
        {
          template: 'bullet-list',
          content: { items: ['[@smith2024]'] },
        },
      ];

      const result = await validator.validateWithLocations(slides as any);

      expect(result.valid).toBe(true);
      expect(result.skipped).toBe(true);
      expect(result.missingDetails).toHaveLength(0);
    });
  });
});
