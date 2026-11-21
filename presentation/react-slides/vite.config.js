import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The deck imports shared diagrams (../../assets) and team names (../../team) from the repo.
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: { alias: { "@repo": repoRoot } },
  server: { fs: { allow: [repoRoot] } },
});
