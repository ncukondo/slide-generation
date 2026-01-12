import { describe, it, expect, beforeEach } from 'vitest';
import { ReferencesTracker } from './references-tracker.js';

describe('ReferencesTracker', () => {
  let tracker: ReferencesTracker;

  beforeEach(() => {
    tracker = new ReferencesTracker();
  });

  describe('addPending', () => {
    it('should add a pending reference', () => {
      tracker.addPending({
        id: 'needed2024',
        slide: 3,
        purpose: 'Support claim',
        requirement: 'required',
        suggested_search: ['AI accuracy meta-analysis'],
      });

      const items = tracker.getItems();
      expect(items).toHaveLength(1);
      expect(items[0]?.status).toBe('pending');
      expect(items[0]?.id).toBe('needed2024');
    });

    it('should add multiple pending references', () => {
      tracker.addPending({
        id: 'ref1',
        slide: 1,
        purpose: 'Background',
      });
      tracker.addPending({
        id: 'ref2',
        slide: 2,
        purpose: 'Evidence',
      });

      expect(tracker.getItems()).toHaveLength(2);
    });
  });

  describe('markAdded', () => {
    it('should update pending to added', () => {
      tracker.addPending({
        id: 'needed2024',
        slide: 3,
        purpose: 'Support claim',
      });

      tracker.markAdded('needed2024', 'smith2024');

      const items = tracker.getItems();
      expect(items[0]?.status).toBe('added');
      expect(items[0]?.id).toBe('smith2024');
      expect(items[0]?.added_date).toBeDefined();
    });

    it('should do nothing if pending id not found', () => {
      tracker.addPending({
        id: 'existing',
        slide: 1,
        purpose: 'Test',
      });

      tracker.markAdded('nonexistent', 'smith2024');

      const items = tracker.getItems();
      expect(items[0]?.id).toBe('existing');
      expect(items[0]?.status).toBe('pending');
    });
  });

  describe('markExisting', () => {
    it('should mark reference as existing in library', () => {
      tracker.markExisting({
        id: 'smith2024',
        slide: 5,
        purpose: 'Background reference',
      });

      const items = tracker.getItems();
      expect(items[0]?.status).toBe('existing');
    });
  });

  describe('getStatus', () => {
    it('should calculate status summary', () => {
      tracker.addPending({
        id: 'a',
        slide: 1,
        purpose: 'test',
        requirement: 'required',
      });
      tracker.addPending({
        id: 'b',
        slide: 2,
        purpose: 'test',
        requirement: 'required',
      });
      tracker.markExisting({ id: 'c', slide: 3, purpose: 'test' });

      const status = tracker.getStatus();
      expect(status.required).toBe(2);
      expect(status.pending).toBe(2);
      expect(status.found).toBe(1);
    });

    it('should return zero counts for empty tracker', () => {
      const status = tracker.getStatus();
      expect(status.required).toBe(0);
      expect(status.pending).toBe(0);
      expect(status.found).toBe(0);
    });

    it('should count added as found', () => {
      tracker.addPending({
        id: 'a',
        slide: 1,
        purpose: 'test',
      });
      tracker.markAdded('a', 'smith2024');

      const status = tracker.getStatus();
      expect(status.found).toBe(1);
      expect(status.pending).toBe(0);
    });
  });

  describe('getPending', () => {
    it('should return only pending items', () => {
      tracker.addPending({ id: 'a', slide: 1, purpose: 'test' });
      tracker.markExisting({ id: 'b', slide: 2, purpose: 'test' });

      const pending = tracker.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.id).toBe('a');
    });

    it('should return empty array if no pending', () => {
      tracker.markExisting({ id: 'a', slide: 1, purpose: 'test' });

      expect(tracker.getPending()).toHaveLength(0);
    });
  });

  describe('toYaml', () => {
    it('should serialize to YAML-compatible object', () => {
      tracker.addPending({ id: 'a', slide: 1, purpose: 'test' });

      const yaml = tracker.toYaml();
      expect(yaml.status).toBeDefined();
      expect(yaml.items).toHaveLength(1);
    });

    it('should include status counts', () => {
      tracker.addPending({
        id: 'a',
        slide: 1,
        purpose: 'test',
        requirement: 'required',
      });
      tracker.markExisting({ id: 'b', slide: 2, purpose: 'test' });

      const yaml = tracker.toYaml();
      expect(yaml.status?.required).toBe(1);
      expect(yaml.status?.pending).toBe(1);
      expect(yaml.status?.found).toBe(1);
    });
  });

  describe('constructor with initial data', () => {
    it('should load existing references', () => {
      const initial = {
        items: [
          {
            id: 'existing2024',
            status: 'existing' as const,
            slide: 1,
            purpose: 'Background',
          },
        ],
      };

      const trackerWithData = new ReferencesTracker(initial);
      expect(trackerWithData.getItems()).toHaveLength(1);
      expect(trackerWithData.getItems()[0]?.id).toBe('existing2024');
    });

    it('should handle undefined initial data', () => {
      const trackerWithUndefined = new ReferencesTracker(undefined);
      expect(trackerWithUndefined.getItems()).toHaveLength(0);
    });
  });
});
