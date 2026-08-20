import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  test: {
    // .claude/worktrees/** excluye las copias de trabajo que crean los worktrees de
    // Claude Code dentro del repo (contienen duplicados de src/**/*.test.js).
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/worktrees/**"],
  },
  base: "/mastil_escalas/",
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
  ],
  build: {
    target: "es2018",
    rollupOptions: {
      output: {
        manualChunks(id) {
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
