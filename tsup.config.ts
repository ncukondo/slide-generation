import { defineConfig } from "tsup";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts"],
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  target: "es2024",
  platform: "node",
  shims: false,
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
});
