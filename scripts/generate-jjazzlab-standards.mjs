import fs from "node:fs/promises";
import path from "node:path";
import { parseJJazzLabStandard } from "../src/music/jjazzlabParser.js";

function slugToTitle(slug) {
  return String(slug || "")
    .replace(/\.sng$/i, "")
    .split(/[-_]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugToId(slug) {
  return String(slug || "").replace(/_/g, "-");
}

async function loadManualStandards(outputDir) {
  try {
    const files = (await fs.readdir(outputDir))
      .filter((file) => file.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const manualStandards = [];

    for (const file of files) {
      const payload = JSON.parse(await fs.readFile(path.join(outputDir, file), "utf8"));
      if (payload?.catalogSource !== "manual") continue;
      manualStandards.push({ file, payload });
    }

    return manualStandards;
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function buildIndexItem(detail, sourceFileName) {
  return {
    id: detail.id,
    title: detail.title,
    composers: Array.isArray(detail.composers) ? detail.composers : [],
    year: Number.isFinite(detail.year) ? detail.year : null,
    defaultKey: String(detail.defaultKey || "").trim(),
    form: String(detail.form || "").trim(),
    sourcePath: `../standards-jjazzlab/${sourceFileName}`,
    hasJJazzLabSource: true,
  };
}

async function resolveSourceDir(rootDir) {
  const cliSourceDir = String(process.argv[2] || "").trim();
  const envSourceDir = String(process.env.JJAZZLAB_SOURCE_DIR || "").trim();
  const bundledSourceDir = path.join(rootDir, "src", "JJazzLab-Jazz-1460");
  const configuredSourceDir = cliSourceDir || envSourceDir;
  const sourceDir = configuredSourceDir
    ? path.resolve(rootDir, configuredSourceDir)
    : bundledSourceDir;

  try {
    const stat = await fs.stat(sourceDir);
    if (!stat.isDirectory()) {
      throw new Error("La ruta indicada no es una carpeta.");
    }
    return sourceDir;
  } catch (error) {
    const message = configuredSourceDir
      ? `No encuentro la carpeta de origen JJazzLab en "${sourceDir}".`
      : [
          `No encuentro la carpeta de origen JJazzLab en "${sourceDir}".`,
          "El repo ya no incluye los .sng brutos.",
          "Pasa una ruta externa como primer argumento o usa la variable JJAZZLAB_SOURCE_DIR.",
          "Ejemplo:",
          'node scripts/generate-jjazzlab-standards.mjs "C:\\temp\\otra_carpeta\\JJazzLab-Jazz-1460"',
        ].join("\n");
    throw new Error(message, { cause: error });
  }
}

async function main() {
  const rootDir = process.cwd();
  const sourceDir = await resolveSourceDir(rootDir);
  const outputDir = path.join(rootDir, "src", "standards-jjazzlab");
  const indexPath = path.join(rootDir, "src", "music", "jjazzlabStandardsIndex.json");
  const standardsDataPath = path.join(rootDir, "src", "music", "standardsData.json");
  const manualStandards = await loadManualStandards(outputDir);
  const standardsData = JSON.parse(await fs.readFile(standardsDataPath, "utf8"));
  const overrides = Array.isArray(standardsData?.items) ? standardsData.items : [];
  const overrideMap = new Map(overrides.map((item) => [item.id, item]));

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const files = (await fs.readdir(sourceDir))
    .filter((file) => file.toLowerCase().endsWith(".sng"))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const items = [];

  for (const file of files) {
    const slug = file.replace(/\.sng$/i, "");
    const id = slugToId(slug);
    const raw = await fs.readFile(path.join(sourceDir, file), "utf8");
    const parsed = parseJJazzLabStandard(raw, {
      id,
      titleFallback: slugToTitle(slug),
    });
    const override = overrideMap.get(id) || null;

    const detail = {
      id,
      title: override?.title || parsed.title,
      composers: Array.isArray(override?.composers) ? override.composers : [],
      year: Number.isFinite(override?.year) ? override.year : null,
      defaultKey: String(override?.defaultKey || parsed.defaultKey || "").trim(),
      form: parsed.form,
      overview: String(override?.overview || "").trim(),
      practiceFocus: Array.isArray(override?.practiceFocus) ? override.practiceFocus : [],
      scaleHints: Array.isArray(override?.scaleHints) ? override.scaleHints : [],
      realForm: parsed.realForm,
    };

    await fs.writeFile(
      path.join(outputDir, `${slug}.json`),
      `${JSON.stringify(detail, null, 2)}\n`,
      "utf8"
    );

    items.push(buildIndexItem(detail, `${slug}.json`));
  }

  for (const manualStandard of manualStandards) {
    await fs.writeFile(
      path.join(outputDir, manualStandard.file),
      `${JSON.stringify(manualStandard.payload, null, 2)}\n`,
      "utf8"
    );
    items.push(buildIndexItem(manualStandard.payload, manualStandard.file));
  }

  const indexPayload = {
    collectionLabel: `${items.length} standards en la base de datos`,
    items: items.sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" })),
  };

  await fs.writeFile(indexPath, `${JSON.stringify(indexPayload, null, 2)}\n`, "utf8");

  console.log(`Generados ${items.length} standards en ${outputDir}`);
  console.log(`Índice actualizado: ${indexPath}`);
  console.log(`Origen JJazzLab usado: ${sourceDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
