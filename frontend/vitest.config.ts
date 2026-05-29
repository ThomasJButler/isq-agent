import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Vitest runs pure logic (adapter, formatters, validation) and component
// render/behaviour tests. `resolve.tsconfigPaths` makes the `@/*` alias
// resolve in tests the same way it does in the Next app (native Vite support,
// so no extra plugin); `react` provides the JSX transform; jsdom gives
// components a DOM to render into.
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
  },
});
