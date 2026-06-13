import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";

test("casos dorados del lector de voicings pasan por el comparador", () => {
  const result = spawnSync("npm", ["run", "compare:frets-oracle", "--", "--golden"], {
    encoding: "utf8",
    shell: true,
  });

  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain("Fallos: 0");
});
