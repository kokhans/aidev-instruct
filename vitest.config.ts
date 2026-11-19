import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      /** The bin entry only wires the terminal to `run`. A spawn test in `cli.test.ts` covers it. */
      exclude: ["src/cli.ts"],
      thresholds: { 100: true },
    },
  },
});
