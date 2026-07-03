import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// base "./" — essencial para GitHub Pages funcionar com assets relativos.
// viteSingleFile inlina JS/CSS no index.html: o build também abre
// diretamente via file:// (Chromium bloqueia módulos externos em file://).
export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
});
