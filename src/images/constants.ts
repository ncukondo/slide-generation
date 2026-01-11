/**
 * Shared constants for image management
 */

/**
 * Supported image file extensions
 */
export const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
]);

/**
 * Check if a file is an image file based on its extension
 */
export function isImageFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Default minimum resolution thresholds for image quality warnings
 */
export const DEFAULT_MIN_RESOLUTION = {
  width: 1280,
  height: 720,
};
