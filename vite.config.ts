/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"], // optional
    include: ["tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    globals: true,
  },
});
