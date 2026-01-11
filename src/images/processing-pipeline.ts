import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ImageMetadataLoader } from "./metadata-loader";
import { ImageProcessor } from "./processor";
import { isImageFile } from "./constants";
import type { ImageProcessingInstruction } from "./processing-schema";

/**
 * Result of processing a single image
 */
export interface ProcessImageResult {
  success: boolean;
  originalPath: string;
  processedPath?: string;
  skipped?: boolean;
  instructionsApplied?: number;
  error?: string;
}

/**
 * Result of processing a directory of images
 */
export interface ProcessDirectoryResult {
  totalImages: number;
  processedImages: number;
  skippedImages: number;
  errors: string[];
  imageMap: Map<string, string>; // original -> processed path mapping
}

/**
 * Options for the processing pipeline
 */
export interface ProcessingPipelineOptions {
  outputDir?: string;
}

/**
 * Pipeline for processing images based on metadata instructions
 */
export class ImageProcessingPipeline {
  private metadataLoader: ImageMetadataLoader;
  private processor: ImageProcessor;
  private outputDir: string;

  constructor(
    private baseDir: string,
    options?: ProcessingPipelineOptions
  ) {
    this.metadataLoader = new ImageMetadataLoader(baseDir);
    this.processor = new ImageProcessor();
    this.outputDir = options?.outputDir ?? path.join(baseDir, ".processed");
  }

  /**
   * Process a single image based on its metadata instructions
   */
  async processImage(imagePath: string): Promise<ProcessImageResult> {
    const fullPath = path.join(this.baseDir, imagePath);
    const result: ProcessImageResult = {
      success: true,
      originalPath: fullPath,
    };

    try {
      // Load metadata
      const metadata = await this.metadataLoader.load(imagePath);

      // Check if processing instructions exist
      if (!metadata.processing || metadata.processing.length === 0) {
        result.skipped = true;
        return result;
      }

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Process image with each instruction
      const processedPath = await this.applyInstructions(
        fullPath,
        imagePath,
        metadata.processing
      );

      result.processedPath = processedPath;
      result.instructionsApplied = metadata.processing.length;
      return result;
    } catch (error) {
      return {
        success: false,
        originalPath: fullPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Process all images in a directory
   */
  async processDirectory(): Promise<ProcessDirectoryResult> {
    const result: ProcessDirectoryResult = {
      totalImages: 0,
      processedImages: 0,
      skippedImages: 0,
      errors: [],
      imageMap: new Map(),
    };

    try {
      // Get all image files in directory
      const files = await fs.readdir(this.baseDir);
      const imageFiles = files.filter((f) => isImageFile(f));
      result.totalImages = imageFiles.length;

      // Process each image
      for (const imageFile of imageFiles) {
        const imageResult = await this.processImage(imageFile);

        if (!imageResult.success) {
          result.errors.push(`${imageFile}: ${imageResult.error}`);
        } else if (imageResult.skipped) {
          result.skippedImages++;
        } else if (imageResult.processedPath) {
          result.processedImages++;
          result.imageMap.set(imageResult.originalPath, imageResult.processedPath);
        }
      }

      return result;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      return result;
    }
  }

  /**
   * Apply processing instructions to an image
   */
  private async applyInstructions(
    inputPath: string,
    relativePath: string,
    instructions: ImageProcessingInstruction[]
  ): Promise<string> {
    const outputFilename = path.basename(relativePath);
    const finalOutputPath = path.join(this.outputDir, outputFilename);

    // Use two temp files alternately for intermediate processing
    // This ensures input and output are always different files
    const tempPaths = [
      path.join(this.outputDir, `temp_${outputFilename}`),
      path.join(this.outputDir, `temp2_${outputFilename}`),
    ];
    let currentInputPath = inputPath;

    for (let i = 0; i < instructions.length; i++) {
      const instruction = instructions[i]!;
      const isLast = i === instructions.length - 1;
      const outputPath = isLast ? finalOutputPath : tempPaths[i % 2]!;

      await this.applyInstruction(currentInputPath, outputPath, instruction);

      // For next iteration, use the output as input
      if (!isLast) {
        currentInputPath = outputPath;
      }
    }

    // Clean up temp files
    try {
      await fs.unlink(path.join(this.outputDir, `temp_${outputFilename}`));
    } catch {
      // Ignore if doesn't exist
    }
    try {
      await fs.unlink(path.join(this.outputDir, `temp2_${outputFilename}`));
    } catch {
      // Ignore if doesn't exist
    }

    return finalOutputPath;
  }

  /**
   * Apply a single processing instruction
   */
  private async applyInstruction(
    inputPath: string,
    outputPath: string,
    instruction: ImageProcessingInstruction
  ): Promise<void> {
    switch (instruction.type) {
      case "crop":
        await this.applyCrop(inputPath, outputPath, instruction);
        break;
      case "blur":
        await this.applyBlur(inputPath, outputPath, instruction);
        break;
    }
  }

  /**
   * Apply crop instruction
   */
  private async applyCrop(
    inputPath: string,
    outputPath: string,
    instruction: ImageProcessingInstruction & { type: "crop" }
  ): Promise<void> {
    if (instruction.edges) {
      const result = await this.processor.cropEdges(
        inputPath,
        instruction.edges,
        outputPath
      );
      if (!result.success) {
        throw new Error(result.error);
      }
    } else if (instruction.region) {
      const result = await this.processor.crop(
        inputPath,
        {
          left: instruction.region.x,
          top: instruction.region.y,
          width: instruction.region.width,
          height: instruction.region.height,
        },
        outputPath
      );
      if (!result.success) {
        throw new Error(result.error);
      }
    }
  }

  /**
   * Apply blur instruction
   */
  private async applyBlur(
    inputPath: string,
    outputPath: string,
    instruction: ImageProcessingInstruction & { type: "blur" }
  ): Promise<void> {
    const result = await this.processor.blurRegion(
      inputPath,
      {
        x: instruction.region.x,
        y: instruction.region.y,
        width: instruction.region.width,
        height: instruction.region.height,
        radius: instruction.radius,
      },
      outputPath
    );
    if (!result.success) {
      throw new Error(result.error);
    }
  }
}
