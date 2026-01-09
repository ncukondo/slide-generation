import { describe, expect, it } from "vitest";
import {
  iconSourceSchema,
  iconRegistrySchema,
  type IconSource,
  type IconRegistry,
} from "./schema.js";

describe("iconSourceSchema", () => {
  it("validates web-font source", () => {
    const source: IconSource = {
      name: "material-icons",
      type: "web-font",
      prefix: "mi",
      url: "https://fonts.googleapis.com/icon?family=Material+Icons",
      render: '<span class="material-icons">{{ name }}</span>',
    };

    const result = iconSourceSchema.safeParse(source);
    expect(result.success).toBe(true);
  });

  it("validates svg-inline source", () => {
    const source: IconSource = {
      name: "heroicons",
      type: "svg-inline",
      prefix: "hero",
      url: "https://unpkg.com/heroicons/{name}.svg",
    };

    const result = iconSourceSchema.safeParse(source);
    expect(result.success).toBe(true);
  });

  it("validates local-svg source", () => {
    const source: IconSource = {
      name: "custom",
      type: "local-svg",
      prefix: "custom",
      path: "./icons/custom/",
    };

    const result = iconSourceSchema.safeParse(source);
    expect(result.success).toBe(true);
  });

  it("validates svg-sprite source", () => {
    const source: IconSource = {
      name: "feather",
      type: "svg-sprite",
      prefix: "feather",
      url: "https://example.com/sprite.svg",
    };

    const result = iconSourceSchema.safeParse(source);
    expect(result.success).toBe(true);
  });

  it("rejects invalid source type", () => {
    const source = {
      name: "invalid",
      type: "invalid-type",
      prefix: "inv",
    };

    const result = iconSourceSchema.safeParse(source);
    expect(result.success).toBe(false);
  });

  it("requires name and prefix", () => {
    const source = {
      type: "web-font",
    };

    const result = iconSourceSchema.safeParse(source);
    expect(result.success).toBe(false);
  });
});

describe("iconRegistrySchema", () => {
  it("validates complete registry", () => {
    const registry: IconRegistry = {
      sources: [
        {
          name: "material-icons",
          type: "web-font",
          prefix: "mi",
          url: "https://fonts.googleapis.com/icon?family=Material+Icons",
          render: '<span class="material-icons">{{ name }}</span>',
        },
        {
          name: "custom",
          type: "local-svg",
          prefix: "custom",
          path: "./icons/custom/",
        },
      ],
      aliases: {
        planning: "mi:event_note",
        success: "mi:check_circle",
      },
      colors: {
        primary: "#1976D2",
        success: "#4CAF50",
      },
      defaults: {
        size: "24px",
        color: "currentColor",
      },
    };

    const result = iconRegistrySchema.safeParse(registry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources).toHaveLength(2);
      expect(result.data.aliases).toEqual({
        planning: "mi:event_note",
        success: "mi:check_circle",
      });
    }
  });

  it("provides defaults for optional fields", () => {
    const registry = {
      sources: [
        {
          name: "material-icons",
          type: "web-font",
          prefix: "mi",
        },
      ],
    };

    const result = iconRegistrySchema.safeParse(registry);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aliases).toEqual({});
      expect(result.data.defaults).toEqual({
        size: "24px",
        color: "currentColor",
      });
    }
  });

  it("requires at least sources array", () => {
    const result = iconRegistrySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("validates with empty sources array", () => {
    const registry = {
      sources: [],
    };

    const result = iconRegistrySchema.safeParse(registry);
    expect(result.success).toBe(true);
  });
});
