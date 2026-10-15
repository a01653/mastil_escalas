import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { offlinePwa } from "./scripts/pwa/build.mjs";

export default defineConfig({
  test: {
    // .claude/worktrees/** excluye las copias de trabajo que crean los worktrees de
    // Claude Code dentro del repo (contienen duplicados de src/**/*.test.js).
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/worktrees/**"],
  },
  base: "/mastil_escalas/",
  define: { "import.meta.env.VITE_PWA_ENABLED": JSON.stringify("true") },
  preview: { port: 4185, strictPort: true },
  plugins: [
    react({
      babel: {
        generatorOpts: {
          compact: true,
        },
      },
    }),
    tailwindcss(),
    offlinePwa(),
  ],
  build: {
    target: "es2018",
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Paquetes acotados: sin 1461 peticiones de instalación ni un módulo de 11 MB al abrir un standard.
          if (id.includes("/src/standards-jjazzlab/")) {
            let bucket = 0;
            for (const char of id.slice(id.lastIndexOf('/') + 1)) bucket = (bucket * 31 + char.charCodeAt(0)) >>> 0;
            return `standards-data-${bucket % 32}`;
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/scheduler")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
          if (id.includes("/src/music/") || id.includes("\\src\\music\\")) {
            if (id.includes("jjazzlabStandardsIndex.json")) {
              return "standards-index";
            }
            return "music-core";
          }
          return undefined;
        },
      },
    },
  },
});
