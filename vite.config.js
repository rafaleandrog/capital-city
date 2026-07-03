import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" — essencial para GitHub Pages funcionar com assets relativos
export default defineConfig({
  base: "./",
  plugins: [react()],
});
