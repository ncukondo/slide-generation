import { describe, it, expect } from 'vitest';
import { addHtmlOption } from './marp-runner.js';

describe('marp-runner HTML option', () => {
  describe('addHtmlOption', () => {
    it('should add --html option when not present', () => {
      const args = ['input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      expect(result).toContain('--html');
    });

    it('should not add --html if already present', () => {
      const args = ['--html', 'input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      expect(result.filter((a) => a === '--html')).toHaveLength(1);
    });

    it('should not add --html if --no-html is present', () => {
      const args = ['--no-html', 'input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      expect(result).not.toContain('--html');
      expect(result).toContain('--no-html');
    });

    it('should preserve original args order', () => {
      const args = ['input.md', '-o', 'output.html'];
      const result = addHtmlOption(args);
      // --html should be added but other args should remain in order
      const withoutHtml = result.filter((a) => a !== '--html');
      expect(withoutHtml).toEqual(args);
    });
  });
});
