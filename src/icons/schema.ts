import { z } from "zod";

/**
 * Schema for icon source types
 */
export const iconSourceTypeSchema = z.enum([
  "web-font",
  "svg-inline",
  "svg-sprite",
  "local-svg",
]);

export type IconSourceType = z.infer<typeof iconSourceTypeSchema>;

/**
 * Schema for individual icon source definition
 */
export const iconSourceSchema = z.object({
  name: z.string(),
  type: iconSourceTypeSchema,
  prefix: z.string(),
  url: z.string().optional(),
  path: z.string().optional(),
  render: z.string().optional(),
});

export type IconSource = z.infer<typeof iconSourceSchema>;

/**
 * Schema for icon defaults
 */
export const iconDefaultsSchema = z.object({
  size: z.string().default("24px"),
  color: z.string().default("currentColor"),
});

export type IconDefaults = z.infer<typeof iconDefaultsSchema>;

/**
 * Schema for the full icon registry configuration
 */
export const iconRegistrySchema = z.object({
  sources: z.array(iconSourceSchema),
  aliases: z.record(z.string()).default({}),
  colors: z.record(z.string()).optional(),
  defaults: iconDefaultsSchema.default({}),
});

export type IconRegistry = z.infer<typeof iconRegistrySchema>;
