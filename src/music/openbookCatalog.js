import { parseOpenbookStandard } from "./openbookParser.js";

const OPENBOOK_ID_ALIASES = Object.freeze({
  "softly-as-in-a-morning-sunrise": "softly-morning-sunrise",
});

const OPENBOOK_FILE_LOADERS = import.meta.glob("../openbook/*.ly.mako", {
  query: "?raw",
  import: "default",
});

function pathToSlug(path) {
  return String(path || "")
    .split("/")
    .pop()
    .replace(/\.ly\.mako$/i, "");
}

function slugToTitle(slug) {
  return String(slug || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugToId(slug) {
  const normalized = String(slug || "").replace(/_/g, "-");
  return OPENBOOK_ID_ALIASES[normalized] || normalized;
}

export const OPENBOOK_STANDARD_INDEX = Object.keys(OPENBOOK_FILE_LOADERS)
  .map((path) => {
    const slug = pathToSlug(path);
    return {
      id: slugToId(slug),
      sourcePath: path,
      title: slugToTitle(slug),
      sourceLabel: "OpenBook",
      hasOpenbookSource: true,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, "es", { sensitivity: "base" }));

const openbookStandardPromiseCache = new Map();

export function loadOpenbookStandardFromPath(sourcePath, item = null) {
  if (!sourcePath || !OPENBOOK_FILE_LOADERS[sourcePath]) {
    return Promise.reject(new Error("No encuentro el fichero OpenBook para este standard."));
  }

  if (!openbookStandardPromiseCache.has(sourcePath)) {
    openbookStandardPromiseCache.set(
      sourcePath,
      OPENBOOK_FILE_LOADERS[sourcePath]().then((raw) => parseOpenbookStandard(raw, {
        id: item?.id || slugToId(pathToSlug(sourcePath)),
        titleFallback: item?.title || slugToTitle(pathToSlug(sourcePath)),
      }))
    );
  }

  return openbookStandardPromiseCache.get(sourcePath);
}
