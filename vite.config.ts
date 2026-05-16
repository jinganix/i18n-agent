import checker from "vite-plugin-checker";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
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
    },
  },
});
