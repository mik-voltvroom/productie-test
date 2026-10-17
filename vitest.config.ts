import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Next preserves JSX for its own compiler; component-rendering tests need it transformed here.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve(process.cwd()) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/firestore-rules.test.ts", "tests/*.emulator.test.ts"],
  },
});
