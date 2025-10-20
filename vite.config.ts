/// <reference types="vitest" />
import { defineConfig } from "vite";
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, './lib/index.ts'),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"], // optional
    include: ["tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    globals: true,
  },
});
