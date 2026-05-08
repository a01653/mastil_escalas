import fs from "node:fs/promises";
import path from "node:path";
import { parseMusicXmlStandard } from "../src/music/musicXmlParser.js";

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

async function loadExistingCatalog(outputDir) {
  try {
    const files = (await fs.readdir(outputDir))
      .filter((file) => file.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const existingByFile = new Map();
    const manualStandards = [];

    for (const file of files) {
      const payload = JSON.parse(await fs.readFile(path.join(outputDir, file), "utf8"));
      if (payload?.catalogSource === "manual") {
        manualStandards.push({ file, payload });
        continue;
      }
      existingByFile.set(file, payload);
    }

    return { existingByFile, manualStandards };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        existingByFile: new Map(),
        manualStandards: [],
      };
    }
    throw error;
  }
}

async function main() {
  const rootDir = process.cwd();
  const sourceDir = path.join(rootDir, "src", "musicxml");
  const outputDir = path.join(rootDir, "src", "standards-jjazzlab");
  const indexPath = path.join(rootDir, "src", "music", "jjazzlabStandardsIndex.json");
  const { existingByFile, manualStandards } = await loadExistingCatalog(outputDir);

  await fs.mkdir(outputDir, { recursive: true });

  const files = (await fs.readdir(sourceDir))
    .filter((file) => file.toLowerCase().endsWith(".musicxml"))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const items = [];

  for (const file of files) {
    const slug = file.replace(/\.musicxml$/i, "");
    const targetFileName = `${slug}.json`;
    const targetPath = path.join(outputDir, targetFileName);
    const previous = existingByFile.get(targetFileName) || {};
    const raw = await fs.readFile(path.join(sourceDir, file), "utf8");
    const parsed = parseMusicXmlStandard(raw, {
      id: String(previous.id || slug).trim(),
      title: String(previous.title || "").trim(),
      composers: Array.isArray(previous.composers) ? previous.composers : [],
    });

    const detail = {
      ...previous,
      id: parsed.id || previous.id || slug,
      title: parsed.title || previous.title || slug,
      composers: Array.isArray(parsed.composers) && parsed.composers.length
        ? parsed.composers
        : Array.isArray(previous.composers)
          ? previous.composers
          : [],
      year: Number.isFinite(previous.year) ? previous.year : null,
      defaultKey: String(previous.defaultKey || parsed.defaultKey || "").trim(),
      form: parsed.form,
      overview: String(previous.overview || "").trim(),
      practiceFocus: Array.isArray(previous.practiceFocus) ? previous.practiceFocus : [],
      scaleHints: Array.isArray(previous.scaleHints) ? previous.scaleHints : [],
      realForm: parsed.realForm,
      phrases: parsed.phrases,
    };

    await fs.writeFile(targetPath, `${JSON.stringify(detail, null, 2)}\n`, "utf8");
    items.push(buildIndexItem(detail, targetFileName));
  }

  for (const manualStandard of manualStandards) {
    await fs.writeFile(
      path.join(outputDir, manualStandard.file),
      `${JSON.stringify(manualStandard.payload, null, 2)}\n`,
      "utf8"
    );
    items.push(buildIndexItem(manualStandard.payload, manualStandard.file));
  }

  items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "es", { sensitivity: "base" }));

  await fs.writeFile(
    indexPath,
    `${JSON.stringify({
      collectionLabel: `${items.length} standards en la base de datos`,
      items,
    }, null, 2)}\n`,
    "utf8"
  );

  console.log(`Sincronizados ${files.length} MusicXML en ${outputDir}`);
  console.log(`Standards manuales preservados: ${manualStandards.length}`);
  console.log(`Indice actualizado: ${indexPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
