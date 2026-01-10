import { z, type ZodTypeAny, type ZodIssue } from "zod";

/**
 * JSON Schema type definition (subset used by templates)
 */
export interface JsonSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
  enum?: (string | number | boolean)[];
  default?: unknown;
  description?: string;
  oneOf?: JsonSchema[];
}

/**
 * Validation result for content against template schema
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Convert a JSON Schema object to a Zod schema
 *
 * Supports a subset of JSON Schema used by template definitions:
 * - Basic types: string, number, boolean, array, object
 * - Required fields
 * - Nested objects and arrays
 * - Pattern validation for strings
 * - minItems/maxItems for arrays
 */
export function jsonSchemaToZod(schema: JsonSchema): ZodTypeAny {
  // Handle oneOf first (union type)
  if (schema.oneOf && schema.oneOf.length > 0) {
    const schemas = schema.oneOf.map((s) => jsonSchemaToZod(s));
    if (schemas.length === 1) {
      return schemas[0]!;
    }
    // z.union requires at least 2 schemas
    return z.union(schemas as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  const type = schema.type ?? "object";

  switch (type) {
    case "string": {
      // Handle enum first (enum values are always valid)
      if (schema.enum && schema.enum.length > 0) {
        const enumValues = schema.enum as [string, ...string[]];
        return z.enum(enumValues);
      }

      let zodSchema = z.string();
      if (schema.pattern) {
        zodSchema = zodSchema.regex(new RegExp(schema.pattern));
      }
      return zodSchema;
    }

    case "number":
      return z.number();

    case "integer":
      return z.number().int();

    case "boolean":
      return z.boolean();

    case "array": {
      const itemSchema = schema.items ? jsonSchemaToZod(schema.items) : z.unknown();
      let arraySchema = z.array(itemSchema);

      if (schema.minItems !== undefined) {
        arraySchema = arraySchema.min(schema.minItems);
      }
      if (schema.maxItems !== undefined) {
        arraySchema = arraySchema.max(schema.maxItems);
      }

      return arraySchema;
    }

    case "object": {
      if (!schema.properties) {
        return z.record(z.unknown());
      }

      const shape: Record<string, ZodTypeAny> = {};
      const required = new Set(schema.required ?? []);

      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propZod = jsonSchemaToZod(propSchema);
        shape[key] = required.has(key) ? propZod : propZod.optional();
      }

      return z.object(shape).passthrough();
    }

    default:
      return z.unknown();
  }
}

/**
 * Validate content against a JSON Schema
 */
export function validateWithJsonSchema(
  schema: JsonSchema,
  content: unknown
): ValidationResult {
  const zodSchema = jsonSchemaToZod(schema);
  const result = zodSchema.safeParse(content);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  const errors = result.error.errors.map((issue: ZodIssue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  return { valid: false, errors };
}
