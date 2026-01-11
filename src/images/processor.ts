import sharp from "sharp";

/**
 * Crop options for extracting a region from an image
 */
export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Edge crop options for cropping percentage from edges
 */
export interface EdgeCropOptions {
  left?: number; // Percentage to crop from left (0-50)
  right?: number; // Percentage to crop from right (0-50)
  top?: number; // Percentage to crop from top (0-50)
  bottom?: number; // Percentage to crop from bottom (0-50)
}

/**
 * Blur region options
 */
export interface BlurRegionOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number; // Default: 10
}

/**
 * Result of image processing operation
 */
export interface ProcessResult {
  success: boolean;
  outputPath?: string;
  width?: number;
  height?: number;
  error?: string;
}

/**
 * Image metadata
 */
export interface ImageMetadataInfo {
  width: number;
  height: number;
  format?: string;
}

/**
 * Image processor for crop and blur operations
 */
export class ImageProcessor {
  private readonly defaultBlurRadius = 10;

  /**
   * Crop image with specified region
   */
  async crop(
    inputPath: string,
    options: CropOptions,
    outputPath: string
  ): Promise<ProcessResult> {
    try {
      const metadata = await sharp(inputPath).metadata();
      const imgWidth = metadata.width ?? 0;
      const imgHeight = metadata.height ?? 0;

      // Validate crop region
      if (
        options.left + options.width > imgWidth ||
        options.top + options.height > imgHeight
      ) {
        return {
          success: false,
          error: `Crop region exceeds image dimensions (${imgWidth}x${imgHeight})`,
        };
      }

      await sharp(inputPath)
        .extract({
          left: options.left,
          top: options.top,
          width: options.width,
          height: options.height,
        })
        .toFile(outputPath);

      return {
        success: true,
        outputPath,
        width: options.width,
        height: options.height,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Crop percentage from specified edges
   */
  async cropEdges(
    inputPath: string,
    options: EdgeCropOptions,
    outputPath: string
  ): Promise<ProcessResult> {
    try {
      // Validate percentages
      const edges = [
        options.left ?? 0,
        options.right ?? 0,
        options.top ?? 0,
        options.bottom ?? 0,
      ];
      for (const edge of edges) {
        if (edge > 50) {
          return {
            success: false,
            error: "Edge crop percentage cannot exceed 50%",
          };
        }
      }

      const metadata = await sharp(inputPath).metadata();
      const imgWidth = metadata.width ?? 0;
      const imgHeight = metadata.height ?? 0;

      const leftPixels = Math.round(imgWidth * ((options.left ?? 0) / 100));
      const rightPixels = Math.round(imgWidth * ((options.right ?? 0) / 100));
      const topPixels = Math.round(imgHeight * ((options.top ?? 0) / 100));
      const bottomPixels = Math.round(
        imgHeight * ((options.bottom ?? 0) / 100)
      );

      const newWidth = imgWidth - leftPixels - rightPixels;
      const newHeight = imgHeight - topPixels - bottomPixels;

      await sharp(inputPath)
        .extract({
          left: leftPixels,
          top: topPixels,
          width: newWidth,
          height: newHeight,
        })
        .toFile(outputPath);

      return {
        success: true,
        outputPath,
        width: newWidth,
        height: newHeight,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Apply blur to specified region
   */
  async blurRegion(
    inputPath: string,
    options: BlurRegionOptions,
    outputPath: string
  ): Promise<ProcessResult> {
    try {
      const metadata = await sharp(inputPath).metadata();
      const imgWidth = metadata.width ?? 0;
      const imgHeight = metadata.height ?? 0;

      // Validate region
      if (
        options.x + options.width > imgWidth ||
        options.y + options.height > imgHeight
      ) {
        return {
          success: false,
          error: `Blur region exceeds image dimensions (${imgWidth}x${imgHeight})`,
        };
      }

      const radius = options.radius ?? this.defaultBlurRadius;

      // Extract the region to blur
      const blurredRegion = await sharp(inputPath)
        .extract({
          left: options.x,
          top: options.y,
          width: options.width,
          height: options.height,
        })
        .blur(radius)
        .toBuffer();

      // Composite the blurred region back onto the original image
      await sharp(inputPath)
        .composite([
          {
            input: blurredRegion,
            left: options.x,
            top: options.y,
          },
        ])
        .toFile(outputPath);

      return {
        success: true,
        outputPath,
        width: imgWidth,
        height: imgHeight,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(inputPath: string): Promise<ImageMetadataInfo> {
    const metadata = await sharp(inputPath).metadata();
    return {
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format: metadata.format,
    };
  }
}
