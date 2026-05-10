const JJAZZLAB_FILE_LOADERS = import.meta.glob("../standards-jjazzlab/*.json", {
  import: "default",
});
const JJAZZLAB_INDEX_LOADERS = import.meta.glob("./jjazzlabStandardsIndex.json", {
  import: "default",
});

const loadJJazzLabIndexModule = JJAZZLAB_INDEX_LOADERS["./jjazzlabStandardsIndex.json"];
let jjazzlabCatalogIndexPromise = null;
const jjazzlabStandardPromiseCache = new Map();

export function loadJJazzLabCatalogIndex() {
  if (!loadJJazzLabIndexModule) {
    return Promise.reject(new Error("No encuentro el índice de standards de JJazzLab."));
  }

  if (!jjazzlabCatalogIndexPromise) {
    jjazzlabCatalogIndexPromise = loadJJazzLabIndexModule().then((index) => ({
      collectionLabel: String(index?.collectionLabel || "").trim(),
      items: Array.isArray(index?.items) ? index.items : [],
    }));
  }

  return jjazzlabCatalogIndexPromise;
}

export function loadJJazzLabStandardFromPath(sourcePath) {
  if (!sourcePath || !JJAZZLAB_FILE_LOADERS[sourcePath]) {
    return Promise.reject(new Error("No encuentro el JSON generado de este standard."));
  }

  if (!jjazzlabStandardPromiseCache.has(sourcePath)) {
    jjazzlabStandardPromiseCache.set(sourcePath, JJAZZLAB_FILE_LOADERS[sourcePath]());
  }

  return jjazzlabStandardPromiseCache.get(sourcePath);
}
