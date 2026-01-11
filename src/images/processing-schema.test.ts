import { describe, it, expect } from "vitest";
import {
  cropInstructionSchema,
  blurInstructionSchema,
  imageProcessingSchema,
  imageProcessingArraySchema,
} from "./processing-schema";

describe("Image Processing Schema", () => {
  describe("cropInstructionSchema", () => {
    it("should validate crop instruction with edges", () => {
      const instruction = {
        type: "crop",
        edges: { right: 10 },
      };
      const result = cropInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(true);
    });

    it("should validate crop instruction with region", () => {
      const instruction = {
        type: "crop",
        region: { x: 0, y: 0, width: 800, height: 600 },
      };
      const result = cropInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(true);
    });

    it("should validate crop with all edges", () => {
      const instruction = {
        type: "crop",
        edges: { left: 5, right: 10, top: 5, bottom: 10 },
      };
      const result = cropInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(true);
    });

    it("should reject edge percentage over 50", () => {
      const instruction = {
        type: "crop",
        edges: { right: 60 },
      };
      const result = cropInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(false);
    });

    it("should reject negative edge percentage", () => {
      const instruction = {
        type: "crop",
        edges: { right: -10 },
      };
      const result = cropInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(false);
    });
  });

  describe("blurInstructionSchema", () => {
    it("should validate blur instruction with region", () => {
      const instruction = {
        type: "blur",
        region: { x: 100, y: 100, width: 50, height: 50 },
      };
      const result = blurInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(true);
    });

    it("should validate blur instruction with radius", () => {
      const instruction = {
        type: "blur",
        region: { x: 100, y: 100, width: 50, height: 50 },
        radius: 20,
      };
      const result = blurInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(true);
    });

    it("should reject blur without region", () => {
      const instruction = {
        type: "blur",
        radius: 10,
      };
      const result = blurInstructionSchema.safeParse(instruction);
      expect(result.success).toBe(false);
    });
  });

  describe("imageProcessingSchema (discriminated union)", () => {
    it("should parse crop instruction", () => {
      const instruction = {
        type: "crop",
        edges: { right: 10 },
      };
      const result = imageProcessingSchema.safeParse(instruction);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("crop");
      }
    });

    it("should parse blur instruction", () => {
      const instruction = {
        type: "blur",
        region: { x: 100, y: 100, width: 50, height: 50 },
      };
      const result = imageProcessingSchema.safeParse(instruction);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("blur");
      }
    });

    it("should reject unknown type", () => {
      const instruction = {
        type: "unknown",
        data: {},
      };
      const result = imageProcessingSchema.safeParse(instruction);
      expect(result.success).toBe(false);
    });
  });

  describe("imageProcessingArraySchema", () => {
    it("should validate array of processing instructions", () => {
      const instructions = [
        { type: "crop", edges: { right: 10 } },
        { type: "blur", region: { x: 100, y: 100, width: 50, height: 50 } },
      ];
      const result = imageProcessingArraySchema.safeParse(instructions);
      expect(result.success).toBe(true);
    });

    it("should validate empty array", () => {
      const result = imageProcessingArraySchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("should reject array with invalid instruction", () => {
      const instructions = [
        { type: "crop", edges: { right: 10 } },
        { type: "invalid" },
      ];
      const result = imageProcessingArraySchema.safeParse(instructions);
      expect(result.success).toBe(false);
    });
  });
});
