import { resolve } from "path";
import checker from "vite-plugin-checker";
import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/cli/index.ts"),
      fileName: "cli/index",
      formats: ["es"],
      name: "i18n-agent",
    },
    outDir: "dist",
    rollupOptions: {
      external: ["commander", "fs", "path", "url", "@dqbd/tiktoken"],
      output: {
        entryFileNames: "cli/index.js",
        preserveModules: false,
      },
    },
  },
  plugins: [checker({ typescript: { tsconfigPath: "./tsconfig.app.json" } })],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    coverage: {
      exclude: ["node_modules/", "dist/", "test/"],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
