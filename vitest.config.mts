import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the mock AI engine and other pure logic (no browser needed).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
