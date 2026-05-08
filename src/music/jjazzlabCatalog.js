import JJAZZLAB_STANDARDS_INDEX from "./jjazzlabStandardsIndex.json";

const JJAZZLAB_FILE_LOADERS = import.meta.glob("../standards-jjazzlab/*.json", {
  import: "default",
});

export const JJAZZLAB_COLLECTION_LABEL = String(JJAZZLAB_STANDARDS_INDEX?.collectionLabel || "").trim();
export const JJAZZLAB_STANDARD_INDEX = Array.isArray(JJAZZLAB_STANDARDS_INDEX?.items)
  ? JJAZZLAB_STANDARDS_INDEX.items
  : [];

const jjazzlabStandardPromiseCache = new Map();

export function loadJJazzLabStandardFromPath(sourcePath) {
  if (!sourcePath || !JJAZZLAB_FILE_LOADERS[sourcePath]) {
    return Promise.reject(new Error("No encuentro el JSON generado de este standard."));
  }

  if (!jjazzlabStandardPromiseCache.has(sourcePath)) {
    jjazzlabStandardPromiseCache.set(sourcePath, JJAZZLAB_FILE_LOADERS[sourcePath]());
  }

  return jjazzlabStandardPromiseCache.get(sourcePath);
}
