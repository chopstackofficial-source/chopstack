
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// IMPORTANT: Ensure this points to the real server entry file in your project
export default defineConfig({
  tanstackStart: {
    server: {
      entry: "./src/server.ts",
    },
  },
});