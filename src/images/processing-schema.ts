import { z } from "zod";

/**
 * Edge crop options schema
 * Each edge is a percentage (0-50) to crop from that edge
 */
export const edgeCropOptionsSchema = z.object({
  left: z.number().min(0).max(50).optional(),
  right: z.number().min(0).max(50).optional(),
  top: z.number().min(0).max(50).optional(),
  bottom: z.number().min(0).max(50).optional(),
});

export type EdgeCropOptions = z.infer<typeof edgeCropOptionsSchema>;

/**
 * Region specification for crop or blur
 */
export const regionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

export type Region = z.infer<typeof regionSchema>;

/**
 * Crop instruction schema
 * Can specify either edges (percentage) or region (pixels)
 */
export const cropInstructionSchema = z.object({
  type: z.literal("crop"),
  edges: edgeCropOptionsSchema.optional(),
  region: regionSchema.optional(),
});

export type CropInstruction = z.infer<typeof cropInstructionSchema>;

/**
 * Blur instruction schema
 * Applies blur to a specified region
 */
export const blurInstructionSchema = z.object({
  type: z.literal("blur"),
  region: regionSchema,
  radius: z.number().min(1).max(100).optional(),
});

export type BlurInstruction = z.infer<typeof blurInstructionSchema>;

/**
 * Combined processing instruction schema (discriminated union)
 */
export const imageProcessingSchema = z.discriminatedUnion("type", [
  cropInstructionSchema,
  blurInstructionSchema,
]);

export type ImageProcessingInstruction = z.infer<typeof imageProcessingSchema>;

/**
 * Array of processing instructions
 */
export const imageProcessingArraySchema = z.array(imageProcessingSchema);

export type ImageProcessingInstructions = z.infer<
  typeof imageProcessingArraySchema
>;
