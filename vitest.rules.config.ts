import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(process.cwd()) } },
  test: {
    environment: "node",
    include: ["tests/firestore-rules.test.ts", "tests/*.emulator.test.ts"],
    fileParallelism: false,
  },
});
