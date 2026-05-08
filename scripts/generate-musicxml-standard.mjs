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

async function main() {
  const rootDir = process.cwd();
  const sourceArg = String(process.argv[2] || "").trim();
  const targetArg = String(process.argv[3] || "").trim();
  if (!sourceArg || !targetArg) {
    throw new Error('Uso: node scripts/generate-musicxml-standard.mjs "src/origen.musicxml" "src/standards-jjazzlab/destino.json"');
  }

  const sourcePath = path.resolve(rootDir, sourceArg);
  const targetPath = path.resolve(rootDir, targetArg);
  const sourceRaw = await fs.readFile(sourcePath, "utf8");
  const targetExists = await fs.stat(targetPath).then(() => true).catch(() => false);
  const previous = targetExists ? JSON.parse(await fs.readFile(targetPath, "utf8")) : {};
  const targetFileName = path.basename(targetPath);

  const parsed = parseMusicXmlStandard(sourceRaw, {
    id: String(previous.id || "").trim(),
    title: String(previous.title || "").trim(),
  });

  const detail = {
    ...previous,
    id: parsed.id || previous.id || path.basename(targetFileName, ".json"),
    title: parsed.title || previous.title || path.basename(targetFileName, ".json"),
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

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(detail, null, 2)}\n`, "utf8");

  const indexPath = path.join(rootDir, "src", "music", "jjazzlabStandardsIndex.json");
  const indexPayload = JSON.parse(await fs.readFile(indexPath, "utf8"));
  const items = Array.isArray(indexPayload?.items) ? indexPayload.items : [];
  const nextItem = buildIndexItem(detail, targetFileName);
  const nextItems = items.some((item) => item?.id === detail.id)
    ? items.map((item) => (item?.id === detail.id ? nextItem : item))
    : [...items, nextItem];

  nextItems.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "es", { sensitivity: "base" }));

  const nextPayload = {
    collectionLabel: `${nextItems.length} standards en la base de datos`,
    items: nextItems,
  };

  await fs.writeFile(indexPath, `${JSON.stringify(nextPayload, null, 2)}\n`, "utf8");

  console.log(`Standard generado: ${targetPath}`);
  console.log(`Índice actualizado: ${indexPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
