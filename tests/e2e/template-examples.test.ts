import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import { TemplateLoader } from '../../src/templates';
import { IconRegistryLoader } from '../../src/icons';

/**
 * E2E tests for template example data validation
 *
 * These tests verify that all template example sections contain valid data:
 * - Icons use valid prefix format (mi:xxx, health:xxx, etc.) or defined aliases
 * - Image URLs use placehold.co or are valid relative paths
 */

describe('E2E: Template examples validation', () => {
  let templateLoader: TemplateLoader;
  let iconRegistryLoader: IconRegistryLoader;
  let aliases: Record<string, string>;

  const builtInTemplatesDir = path.resolve(__dirname, '../../templates');
  const iconsRegistryPath = path.resolve(__dirname, '../../icons/registry.yaml');

  beforeAll(async () => {
    templateLoader = new TemplateLoader();
    await templateLoader.loadBuiltIn(builtInTemplatesDir);

    iconRegistryLoader = new IconRegistryLoader();
    await iconRegistryLoader.load(iconsRegistryPath);
    aliases = iconRegistryLoader.getAliases();
  });

  /**
   * Check if an icon reference is valid (prefix format or defined alias)
   */
  const isValidIconRef = (icon: string): boolean => {
    // Check if it's a prefix format (contains :)
    if (icon.includes(':')) {
      const parsed = iconRegistryLoader.parseIconReference(icon);
      if (parsed && iconRegistryLoader.getSource(parsed.prefix)) {
        return true;
      }
    }
    // Check if it's a defined alias
    return icon in aliases;
  };

  describe('Icon references in template examples', () => {
    it('hierarchy template should have valid icon references', () => {
      const template = templateLoader.get('hierarchy');
      expect(template).toBeDefined();
      expect(template?.example).toBeDefined();

      // Root node icon should be valid prefix format or alias
      const rootIcon = template?.example?.root?.icon;
      if (rootIcon) {
        expect(isValidIconRef(rootIcon), `Icon "${rootIcon}" should be prefix format (e.g., mi:person) or valid alias`).toBe(true);
      }

      // Check children icons recursively
      function checkNodeIcons(node: { icon?: string; children?: Array<{ icon?: string; children?: unknown[] }> }) {
        if (node.icon) {
          expect(isValidIconRef(node.icon), `Icon "${node.icon}" should be prefix format or valid alias`).toBe(true);
        }
        if (node.children) {
          for (const child of node.children) {
            checkNodeIcons(child as { icon?: string; children?: Array<{ icon?: string; children?: unknown[] }> });
          }
        }
      }

      if (template?.example?.root) {
        checkNodeIcons(template.example.root as { icon?: string; children?: Array<{ icon?: string; children?: unknown[] }> });
      }
    });

    it('cycle-diagram template should have valid icon references', () => {
      const template = templateLoader.get('cycle-diagram');
      expect(template).toBeDefined();
      expect(template?.example?.nodes).toBeDefined();

      const nodes = template?.example?.nodes as Array<{ icon?: string }>;
      for (const node of nodes) {
        if (node.icon) {
          expect(isValidIconRef(node.icon), `Icon "${node.icon}" should be prefix format or valid alias`).toBe(true);
        }
      }
    });

    it('three-column template should have valid icon references', () => {
      const template = templateLoader.get('three-column');
      expect(template).toBeDefined();
      expect(template?.example?.columns).toBeDefined();

      const columns = template?.example?.columns as Array<{ icon?: string }>;
      for (const column of columns) {
        if (column.icon) {
          expect(isValidIconRef(column.icon), `Icon "${column.icon}" should be prefix format or valid alias`).toBe(true);
        }
      }
    });

    it('flow-chart template should have valid icon references if present', () => {
      const template = templateLoader.get('flow-chart');
      expect(template).toBeDefined();
      expect(template?.example?.steps).toBeDefined();

      const steps = template?.example?.steps as Array<{ icon?: string }>;
      for (const step of steps) {
        if (step.icon) {
          expect(isValidIconRef(step.icon), `Icon "${step.icon}" should be prefix format or valid alias`).toBe(true);
        }
      }
    });
  });

  describe('Image URLs in template examples', () => {
    const isValidImageUrl = (url: string): boolean => {
      // Placehold.co URLs
      if (url.startsWith('https://placehold.co/')) return true;
      // Other placeholder services
      if (url.startsWith('https://via.placeholder.com/')) return true;
      if (url.startsWith('https://picsum.photos/')) return true;
      // Relative paths starting with images/ (project convention)
      if (url.startsWith('images/')) return true;
      // HTTP/HTTPS URLs (valid for external images)
      if (url.startsWith('http://') || url.startsWith('https://')) return true;
      return false;
    };

    it('image-text template should have valid image URL', () => {
      const template = templateLoader.get('image-text');
      expect(template).toBeDefined();

      const imageUrl = template?.example?.image;
      expect(imageUrl).toBeDefined();
      expect(isValidImageUrl(imageUrl as string), `Image URL "${imageUrl}" should be valid`).toBe(true);
    });

    it('image-full template should have valid image URL', () => {
      const template = templateLoader.get('image-full');
      expect(template).toBeDefined();

      const imageUrl = template?.example?.image;
      expect(imageUrl).toBeDefined();
      expect(isValidImageUrl(imageUrl as string), `Image URL "${imageUrl}" should be valid`).toBe(true);
    });

    it('image-caption template should have valid image URL', () => {
      const template = templateLoader.get('image-caption');
      expect(template).toBeDefined();

      const imageUrl = template?.example?.image;
      expect(imageUrl).toBeDefined();
      expect(isValidImageUrl(imageUrl as string), `Image URL "${imageUrl}" should be valid`).toBe(true);
    });

    it('gallery template should have valid image URLs', () => {
      const template = templateLoader.get('gallery');
      expect(template).toBeDefined();
      expect(template?.example?.images).toBeDefined();

      const images = template?.example?.images as Array<{ src: string }>;
      expect(images.length).toBeGreaterThan(0);

      for (const image of images) {
        expect(isValidImageUrl(image.src), `Image URL "${image.src}" should be valid`).toBe(true);
      }
    });

    it('before-after template should have valid image URLs', () => {
      const template = templateLoader.get('before-after');
      expect(template).toBeDefined();

      const beforeImage = template?.example?.before?.image;
      const afterImage = template?.example?.after?.image;

      expect(beforeImage).toBeDefined();
      expect(afterImage).toBeDefined();
      expect(isValidImageUrl(beforeImage as string), `Before image URL "${beforeImage}" should be valid`).toBe(true);
      expect(isValidImageUrl(afterImage as string), `After image URL "${afterImage}" should be valid`).toBe(true);
    });
  });

  describe('Template example schema validation', () => {
    it('all templates with examples should pass schema validation', () => {
      const allTemplates = templateLoader.list();

      for (const template of allTemplates) {
        if (template.example) {
          const result = templateLoader.validateContent(template.name, template.example);
          expect(result.valid, `Template "${template.name}" example should pass schema validation: ${result.errors.join(', ')}`).toBe(true);
        }
      }
    });
  });
});
