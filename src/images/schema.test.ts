import { describe, it, expect } from "vitest";
import {
  permissionStatusSchema,
  permissionsSchema,
  creditsSchema,
  individualMetadataSchema,
  directoryMetadataSchema,
  type ImageMetadata,
  type DirectoryMetadata,
} from "./schema";

describe("Image Metadata Schema", () => {
  describe("permissionStatusSchema", () => {
    it("should accept valid permission status values", () => {
      expect(permissionStatusSchema.safeParse("approved").success).toBe(true);
      expect(permissionStatusSchema.safeParse("pending").success).toBe(true);
      expect(permissionStatusSchema.safeParse("restricted").success).toBe(true);
      expect(permissionStatusSchema.safeParse("rejected").success).toBe(true);
    });

    it("should reject invalid permission status", () => {
      expect(permissionStatusSchema.safeParse("invalid").success).toBe(false);
      expect(permissionStatusSchema.safeParse("").success).toBe(false);
    });
  });

  describe("permissionsSchema", () => {
    it("should validate complete permissions object", () => {
      const permissions = {
        status: "approved",
        approved_by: "John Doe",
        approved_date: "2025-01-05",
        expires: null,
        conditions: ["Internal use only"],
        document: "permissions/approval.pdf",
      };
      const result = permissionsSchema.safeParse(permissions);
      expect(result.success).toBe(true);
    });

    it("should validate minimal permissions (status only)", () => {
      const permissions = {
        status: "pending",
      };
      const result = permissionsSchema.safeParse(permissions);
      expect(result.success).toBe(true);
    });

    it("should validate permissions with pending_contact", () => {
      const permissions = {
        status: "pending",
        pending_contact: "Contact: Company B, Mr. Sato",
      };
      const result = permissionsSchema.safeParse(permissions);
      expect(result.success).toBe(true);
    });

    it("should reject permissions with invalid status", () => {
      const permissions = {
        status: "invalid_status",
      };
      const result = permissionsSchema.safeParse(permissions);
      expect(result.success).toBe(false);
    });
  });

  describe("creditsSchema", () => {
    it("should validate credits object", () => {
      const credits = {
        required: true,
        text: "Source: XX Society Journal (2024)",
      };
      const result = creditsSchema.safeParse(credits);
      expect(result.success).toBe(true);
    });

    it("should validate credits without text", () => {
      const credits = {
        required: false,
      };
      const result = creditsSchema.safeParse(credits);
      expect(result.success).toBe(true);
    });

    it("should validate empty credits object", () => {
      const credits = {};
      const result = creditsSchema.safeParse(credits);
      expect(result.success).toBe(true);
    });
  });

  describe("individualMetadataSchema", () => {
    it("should validate complete individual metadata file", () => {
      const metadata: ImageMetadata = {
        description: "Company A implementation site (Tokyo factory)",
        captured_date: "2024-12-15",
        captured_by: "Sales Dept. Tanaka",
        location: "Ota-ku, Tokyo",
        subject: ["Product X100 in operation", "Workers nearby"],
        permissions: {
          status: "approved",
          approved_by: "Company A, Manager Yamada",
          approved_date: "2025-01-05",
          expires: null,
          conditions: ["Internal materials only"],
        },
        restrictions: ["No social media", "No presentation to competitors"],
        notes: "Another company logo visible in lower right.",
        credits: {
          required: false,
        },
        tags: ["Implementation case", "Manufacturing", "Company A"],
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate minimal metadata", () => {
      const metadata = {
        description: "Test image",
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate metadata with only permissions", () => {
      const metadata = {
        permissions: {
          status: "approved",
          approved_by: "John Doe",
        },
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate metadata with single subject string", () => {
      const metadata = {
        description: "Product photo",
        subject: "Product X100 front view",
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate metadata with tags array", () => {
      const metadata = {
        description: "Test",
        tags: ["test", "sample", "demo"],
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should reject metadata with invalid permission status", () => {
      const metadata = {
        permissions: {
          status: "invalid",
        },
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it("should validate empty metadata object", () => {
      const metadata = {};
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate metadata with processing instructions", () => {
      const metadata = {
        description: "Product photo with watermark",
        processing: [
          { type: "crop", edges: { right: 10 } },
          { type: "blur", region: { x: 100, y: 100, width: 50, height: 50 } },
        ],
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should reject metadata with invalid processing instruction", () => {
      const metadata = {
        description: "Test",
        processing: [
          { type: "invalid_type" },
        ],
      };
      const result = individualMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });
  });

  describe("directoryMetadataSchema", () => {
    it("should validate directory metadata with defaults", () => {
      const metadata: DirectoryMetadata = {
        _defaults: {
          permissions: {
            status: "approved",
          },
          credits: {
            required: false,
          },
        },
        "image1.jpg": {
          description: "Image 1 description",
        },
        "image2.jpg": {
          description: "Image 2 description",
          tags: ["sample"],
        },
      };
      const result = directoryMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate directory metadata without defaults", () => {
      const metadata = {
        "product-front.jpg": {
          description: "Product X100 front view",
          captured_date: "2024-11-20",
          tags: ["Product", "For catalog"],
        },
        "product-side.jpg": {
          description: "Product X100 side view",
        },
      };
      const result = directoryMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should validate directory metadata with mixed permissions", () => {
      const metadata = {
        _defaults: {
          permissions: { status: "approved" },
        },
        "internal.jpg": {
          description: "Internal photo",
        },
        "customer-b.jpg": {
          description: "Customer B site",
          permissions: {
            status: "pending",
            pending_contact: "Checking with Company B",
          },
        },
      };
      const result = directoryMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });

    it("should reject directory metadata with invalid entry", () => {
      const metadata = {
        "image.jpg": {
          permissions: {
            status: "invalid_status",
          },
        },
      };
      const result = directoryMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(false);
    });

    it("should validate empty directory metadata", () => {
      const metadata = {};
      const result = directoryMetadataSchema.safeParse(metadata);
      expect(result.success).toBe(true);
    });
  });

  describe("Type exports", () => {
    it("should export ImageMetadata type", () => {
      const metadata: ImageMetadata = {
        description: "Test",
        tags: ["test"],
      };
      expect(metadata.description).toBe("Test");
    });

    it("should export DirectoryMetadata type", () => {
      const metadata: DirectoryMetadata = {
        _defaults: { permissions: { status: "approved" } },
        "test.jpg": { description: "Test" },
      };
      const defaults = metadata["_defaults"] as { permissions?: { status?: string } };
      expect(defaults?.permissions?.status).toBe("approved");
    });
  });
});
