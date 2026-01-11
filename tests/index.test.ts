import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { VERSION } from "../src/index.js";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

describe("slide-generation", () => {
  it("should export VERSION matching package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
