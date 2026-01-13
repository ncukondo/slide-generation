import { describe, it, expect, beforeEach } from 'vitest';
import { Renderer } from './renderer';
import type { PresentationMeta } from './parser';

describe('Renderer', () => {
  let renderer: Renderer;

  beforeEach(() => {
    renderer = new Renderer();
  });

  describe('renderFrontMatter', () => {
    it('should render basic front matter', () => {
      const meta: PresentationMeta = {
        title: 'My Presentation',
        theme: 'default',
      };

      const result = renderer.render([], meta);

      expect(result).toContain('---');
      expect(result).toContain('marp: true');
      expect(result).toContain('title: My Presentation');
      expect(result).toContain('theme: default');
    });

    it('should include author when specified', () => {
      const meta: PresentationMeta = {
        title: 'My Presentation',
        author: 'John Doe',
        theme: 'academic',
      };

      const result = renderer.render([], meta);

      expect(result).toContain('author: John Doe');
    });

    it('should include date when specified', () => {
      const meta: PresentationMeta = {
        title: 'My Presentation',
        date: '2024-01-15',
        theme: 'default',
      };

      const result = renderer.render([], meta);

      expect(result).toContain('date: 2024-01-15');
    });
  });

  describe('render', () => {
    it('should not add separator before first slide', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'default',
      };

      const slides = ['# Slide 1', '# Slide 2'];

      const result = renderer.render(slides, meta);

      // フロントマター終了後、最初のスライドの前に---がないことを確認
      // (---\n\n--- というパターンがないこと)
      expect(result).not.toMatch(/---\n\n---/);
      // 最初のスライドがフロントマター直後にあることを確認
      expect(result).toMatch(/---\n\n# Slide 1/);
      // 2番目のスライドは---で区切られる
      expect(result).toMatch(/# Slide 1\n\n---\n\n# Slide 2/);
    });

    it('should join slides with --- separator between slides', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'default',
      };

      const slides = [
        '# Slide 1\n\nContent 1',
        '# Slide 2\n\nContent 2',
        '# Slide 3\n\nContent 3',
      ];

      const result = renderer.render(slides, meta);

      // First slide should come right after front matter (no --- before)
      expect(result).toMatch(/---\n\n# Slide 1/);
      // Subsequent slides should have --- separator
      expect(result).toMatch(/Content 1\n\n---\n\n# Slide 2/);
      expect(result).toMatch(/Content 2\n\n---\n\n# Slide 3/);
    });

    it('should handle empty slides array', () => {
      const meta: PresentationMeta = {
        title: 'Empty',
        theme: 'default',
      };

      const result = renderer.render([], meta);

      // Should just have front matter
      expect(result).toContain('marp: true');
      expect(result).not.toMatch(/---\n\n---/);
    });

    it('should handle single slide', () => {
      const meta: PresentationMeta = {
        title: 'Single',
        theme: 'default',
      };

      const slides = ['# Only Slide'];

      const result = renderer.render(slides, meta);

      expect(result).toContain('# Only Slide');
      // Front matter ends with ---, then slide content
      expect(result).toMatch(/---\n\n# Only Slide/);
    });
  });

  describe('speaker notes', () => {
    it('should embed speaker notes with HTML comment', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'default',
      };

      const slides = ['# Slide 1'];
      const notes = ['These are speaker notes for slide 1'];

      const result = renderer.render(slides, meta, { notes });

      expect(result).toContain('<!--');
      expect(result).toContain('These are speaker notes for slide 1');
      expect(result).toContain('-->');
    });

    it('should embed notes for multiple slides', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'default',
      };

      const slides = ['# Slide 1', '# Slide 2'];
      const notes = ['Note 1', 'Note 2'];

      const result = renderer.render(slides, meta, { notes });

      expect(result).toContain('Note 1');
      expect(result).toContain('Note 2');
    });

    it('should handle slides without notes', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'default',
      };

      const slides = ['# Slide 1', '# Slide 2'];
      const notes = ['Note for slide 1', undefined as unknown as string];

      const result = renderer.render(slides, meta, { notes });

      expect(result).toContain('Note for slide 1');
      // Slide 2 should not have a comment block
      const slide2Part = result.split('# Slide 2')[1] || '';
      expect(slide2Part).not.toMatch(/<!--\s*-->/);
    });
  });

  describe('options', () => {
    it('should exclude theme when includeTheme is false', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'academic',
      };

      const result = renderer.render([], meta, { includeTheme: false });

      expect(result).not.toContain('theme: academic');
    });

    it('should include theme by default', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'academic',
      };

      const result = renderer.render([], meta);

      expect(result).toContain('theme: academic');
    });

    it('should support custom front matter properties', () => {
      const meta: PresentationMeta = {
        title: 'Test',
        theme: 'default',
      };

      const result = renderer.render([], meta, {
        additionalFrontMatter: {
          paginate: true,
          footer: 'Page %number%',
        },
      });

      expect(result).toContain('paginate: true');
      expect(result).toContain('footer: Page %number%');
    });
  });

  describe('output format', () => {
    it('should produce valid Marp markdown structure', () => {
      const meta: PresentationMeta = {
        title: 'Complete Presentation',
        author: 'Test Author',
        theme: 'academic',
      };

      const slides = [
        '# Welcome\n\nThis is the intro',
        '# Content\n\n- Point 1\n- Point 2',
        '# Conclusion\n\nThank you!',
      ];

      const notes = ['Opening remarks', undefined as unknown as string, 'Closing remarks'];

      const result = renderer.render(slides, meta, { notes });

      // Should start with front matter
      expect(result.startsWith('---')).toBe(true);

      // Should have proper structure
      expect(result).toMatch(/^---\nmarp: true\n/);

      // Should end with content, not extra separators
      expect(result).toContain('Thank you!');
    });
  });
});
