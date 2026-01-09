import { describe, it, expect } from "vitest";
import { jsonSchemaToZod, validateWithJsonSchema, type JsonSchema } from "./validators";

describe("jsonSchemaToZod", () => {
  it("should convert string type", () => {
    const schema: JsonSchema = { type: "string" };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(123).success).toBe(false);
  });

  it("should convert string with pattern", () => {
    const schema: JsonSchema = {
      type: "string",
      pattern: "^#[0-9A-Fa-f]{6}$",
    };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse("#FF0000").success).toBe(true);
    expect(zodSchema.safeParse("#fff").success).toBe(false);
    expect(zodSchema.safeParse("red").success).toBe(false);
  });

  it("should convert number type", () => {
    const schema: JsonSchema = { type: "number" };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse(42).success).toBe(true);
    expect(zodSchema.safeParse(3.14).success).toBe(true);
    expect(zodSchema.safeParse("42").success).toBe(false);
  });

  it("should convert integer type", () => {
    const schema: JsonSchema = { type: "integer" };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse(42).success).toBe(true);
    expect(zodSchema.safeParse(3.14).success).toBe(false);
  });

  it("should convert boolean type", () => {
    const schema: JsonSchema = { type: "boolean" };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse(true).success).toBe(true);
    expect(zodSchema.safeParse(false).success).toBe(true);
    expect(zodSchema.safeParse("true").success).toBe(false);
  });

  it("should convert array type", () => {
    const schema: JsonSchema = {
      type: "array",
      items: { type: "string" },
    };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
    expect(zodSchema.safeParse([1, 2, 3]).success).toBe(false);
    expect(zodSchema.safeParse("not array").success).toBe(false);
  });

  it("should convert array with minItems/maxItems", () => {
    const schema: JsonSchema = {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 4,
    };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse(["a"]).success).toBe(false);
    expect(zodSchema.safeParse(["a", "b"]).success).toBe(true);
    expect(zodSchema.safeParse(["a", "b", "c", "d"]).success).toBe(true);
    expect(zodSchema.safeParse(["a", "b", "c", "d", "e"]).success).toBe(false);
  });

  it("should convert object with properties", () => {
    const schema: JsonSchema = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse({ name: "John" }).success).toBe(true);
    expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
    expect(zodSchema.safeParse({ age: 30 }).success).toBe(false);
    expect(zodSchema.safeParse({ name: 123 }).success).toBe(false);
  });

  it("should handle nested objects", () => {
    const schema: JsonSchema = {
      type: "object",
      required: ["user"],
      properties: {
        user: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string" },
            email: { type: "string" },
          },
        },
      },
    };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse({ user: { name: "John" } }).success).toBe(true);
    expect(zodSchema.safeParse({ user: { email: "john@test.com" } }).success).toBe(false);
  });

  it("should handle array of objects", () => {
    const schema: JsonSchema = {
      type: "array",
      items: {
        type: "object",
        required: ["label"],
        properties: {
          label: { type: "string" },
          value: { type: "number" },
        },
      },
    };
    const zodSchema = jsonSchemaToZod(schema);

    expect(zodSchema.safeParse([{ label: "A" }, { label: "B" }]).success).toBe(true);
    expect(zodSchema.safeParse([{ value: 1 }]).success).toBe(false);
  });

  it("should allow extra properties with passthrough", () => {
    const schema: JsonSchema = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
      },
    };
    const zodSchema = jsonSchemaToZod(schema);

    const result = zodSchema.safeParse({ name: "John", extra: "field" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "John", extra: "field" });
    }
  });
});

describe("validateWithJsonSchema", () => {
  it("should return valid:true for valid content", () => {
    const schema: JsonSchema = {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
    };

    const result = validateWithJsonSchema(schema, { title: "Hello" });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should return errors for missing required field", () => {
    const schema: JsonSchema = {
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string" },
      },
    };

    const result = validateWithJsonSchema(schema, {});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("title");
  });

  it("should return errors with path for nested issues", () => {
    const schema: JsonSchema = {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["label"],
            properties: {
              label: { type: "string" },
            },
          },
        },
      },
    };

    const result = validateWithJsonSchema(schema, {
      items: [{ label: "OK" }, { wrongKey: "value" }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("items.1.label"))).toBe(true);
  });
});
