import fs from "node:fs/promises";
import path from "node:path";

const USER_AGENT = "mastil-escalas/1.0 (+https://local.codex)";
const JAZZSTANDARDS_BASE_URL = "https://www.jazzstandards.com/compositions/";
const JAZZSTANDARDS_SEED_PAGES = [
  new URL("index.htm", JAZZSTANDARDS_BASE_URL).href,
  new URL("indexa.htm", JAZZSTANDARDS_BASE_URL).href,
];
const WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php";
const WIKIDATA_SEARCH_LIMIT = 6;
const WIKIDATA_ENTITY_BATCH_SIZE = 40;
const WIKIDATA_PROGRESS_STEP = 100;
const MIN_YEAR = 1880;
const MAX_YEAR = new Date().getFullYear() + 1;
const INDEX_LINK_PATTERN = /(?:https:\/\/www\.jazzstandards\.com\/compositions\/|\/compositions\/)?(index[^"'#?\s>]+\.htm)/gi;
const STOP_TOKENS = new Set(["and", "the", "of", "de", "la", "le"]);
const POSITIVE_INSTANCE_TOKENS = ["song", "composition", "musical work", "standard"];
const NEGATIVE_INSTANCE_TOKENS = ["album", "film", "television", "episode", "novel", "disambiguation"];

function decodeHtmlText(rawValue) {
  return String(rawValue || "")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number.parseInt(value, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(Number.parseInt(value, 16)))
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&quot;|&#34;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(rawValue) {
  return decodeHtmlText(String(rawValue || "").replace(/<[^>]+>/g, " "));
}

function normalizeLookupKey(rawValue) {
  return stripHtml(rawValue)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompactLookupKey(rawValue) {
  return normalizeLookupKey(rawValue).replace(/\s+/g, "");
}

function buildLookupKeysFromValues(values) {
  const keys = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = normalizeLookupKey(value);
    const compact = normalizeCompactLookupKey(value);
    if (normalized) keys.add(normalized);
    if (compact) keys.add(compact);
  }
  return [...keys];
}

function parseYear(rawValue) {
  const match = /\b(1[89]\d{2}|20\d{2})\b/.exec(String(rawValue || ""));
  if (!match) return null;
  const year = Number.parseInt(match[1], 10);
  if (!Number.isFinite(year) || year < MIN_YEAR || year > MAX_YEAR) return null;
  return year;
}

function buildTitleKeys(detail) {
  return buildLookupKeysFromValues([
    detail?.title,
    String(detail?.id || "").replace(/-/g, " "),
  ]);
}

function composerTokensFromList(values) {
  const tokens = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    for (const token of normalizeLookupKey(value).split(" ")) {
      if (!token || token.length < 2 || STOP_TOKENS.has(token)) continue;
      tokens.add(token);
    }
  }
  return tokens;
}

function overlapCount(left, right) {
  let total = 0;
  for (const token of left) {
    if (right.has(token)) total += 1;
  }
  return total;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchText(url, acceptHeader = "text/html") {
  const response = await fetch(url, {
    headers: {
      "accept": acceptHeader,
      "user-agent": USER_AGENT,
    },
  });
  if (!response.ok) {
    throw new Error(`No pude leer ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchJson(url, init = {}, acceptHeader = "application/json") {
  const response = await fetch(url, {
    ...init,
    headers: {
      "accept": acceptHeader,
      "user-agent": USER_AGENT,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`No pude leer ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function isRetriableHttpError(error) {
  return /\b(429|500|502|503|504)\b/.test(String(error?.message || ""));
}

async function discoverJazzStandardsIndexPages() {
  const pending = [...JAZZSTANDARDS_SEED_PAGES];
  const seen = new Set();
  const pages = [];

  while (pending.length) {
    const url = pending.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    let html = "";
    try {
      html = await fetchText(url);
    } catch (error) {
      if (/404/i.test(String(error?.message || ""))) continue;
      throw error;
    }
    pages.push({ url, html });

    for (const match of html.matchAll(INDEX_LINK_PATTERN)) {
      const nextUrl = new URL(match[1], JAZZSTANDARDS_BASE_URL).href;
      if (!seen.has(nextUrl)) pending.push(nextUrl);
    }
  }

  return pages;
}

function buildJazzStandardsYearMap(pages) {
  const yearMap = new Map();

  for (const page of Array.isArray(pages) ? pages : []) {
    for (const rowMatch of String(page.html || "").matchAll(/<tr class="JSContentsLine">([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1]);
      if (cells.length < 3) continue;
      const year = parseYear(stripHtml(cells[1]));
      const titleMatch = /<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(cells[2]);
      const title = titleMatch ? stripHtml(titleMatch[1]) : "";
      if (!title || !year) continue;

      const entry = { title, year, source: page.url };
      for (const key of buildLookupKeysFromValues([title])) {
        const current = yearMap.get(key);
        if (!current || year < current.year) {
          yearMap.set(key, entry);
        }
      }
    }
  }

  return yearMap;
}

function extractClaimEntityIds(entity, propertyId) {
  const claims = Array.isArray(entity?.claims?.[propertyId]) ? entity.claims[propertyId] : [];
  return claims
    .map((claim) => String(claim?.mainsnak?.datavalue?.value?.id || "").trim())
    .filter(Boolean);
}

function extractClaimTimeValues(entity, propertyId) {
  const claims = Array.isArray(entity?.claims?.[propertyId]) ? entity.claims[propertyId] : [];
  return claims
    .map((claim) => String(claim?.mainsnak?.datavalue?.value?.time || "").trim())
    .filter(Boolean);
}

function getEntityEnglishLabel(entity) {
  return String(entity?.labels?.en?.value || "").trim();
}

function getEntityEnglishAliases(entity) {
  const aliases = Array.isArray(entity?.aliases?.en) ? entity.aliases.en : [];
  return aliases
    .map((entry) => String(entry?.value || "").trim())
    .filter(Boolean);
}

async function searchWikidataByTitle(title) {
  const url = new URL(WIKIDATA_API_URL);
  url.search = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    limit: String(WIKIDATA_SEARCH_LIMIT),
    search: String(title || "").trim(),
    type: "item",
    origin: "*",
  }).toString();
  const payload = await fetchJson(url.href);
  return Array.isArray(payload?.search) ? payload.search : [];
}

async function fetchWikidataEntityMap(ids, props = "labels|aliases|claims") {
  const entitiesById = new Map();

  for (let idx = 0; idx < ids.length; idx += WIKIDATA_ENTITY_BATCH_SIZE) {
    const batch = ids.slice(idx, idx + WIKIDATA_ENTITY_BATCH_SIZE).filter(Boolean);
    if (!batch.length) continue;

    const url = new URL(WIKIDATA_API_URL);
    url.search = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      languages: "en",
      props,
      ids: batch.join("|"),
      origin: "*",
    }).toString();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const payload = await fetchJson(url.href);
        for (const [id, entity] of Object.entries(payload?.entities || {})) {
          if (entity?.missing === "") continue;
          entitiesById.set(id, entity);
        }
        break;
      } catch (error) {
        if (!isRetriableHttpError(error) || attempt >= 3) throw error;
        await sleep(1500 * (attempt + 1));
      }
    }

    if ((idx + batch.length) % (WIKIDATA_ENTITY_BATCH_SIZE * 5) === 0 || idx + batch.length >= ids.length) {
      console.log(`Wikidata entidades: ${Math.min(idx + batch.length, ids.length)}/${ids.length}`);
    }
    await sleep(180);
  }

  return entitiesById;
}

async function fetchWikidataCandidatesByTitle(titles) {
  const resultsByTitle = new Map();

  for (let idx = 0; idx < titles.length; idx += 1) {
    const title = String(titles[idx] || "").trim();
    if (!title) continue;

    let searchResults = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        searchResults = await searchWikidataByTitle(title);
        break;
      } catch (error) {
        if (!isRetriableHttpError(error) || attempt >= 3) {
          console.warn(`Wikidata omitido para "${title}": ${error.message}`);
          break;
        }
        await sleep(1500 * (attempt + 1));
      }
    }

    resultsByTitle.set(title, searchResults);
    if ((idx + 1) % WIKIDATA_PROGRESS_STEP === 0 || idx + 1 === titles.length) {
      console.log(`Wikidata busquedas: ${idx + 1}/${titles.length}`);
    }
    await sleep(120);
  }

  const itemIds = Array.from(new Set(
    [...resultsByTitle.values()]
      .flatMap((results) => results)
      .map((result) => String(result?.id || "").trim())
      .filter(Boolean)
  ));
  const entitiesById = await fetchWikidataEntityMap(itemIds);
  const referenceIds = Array.from(new Set(
    itemIds.flatMap((id) => {
      const entity = entitiesById.get(id);
      return [
        ...extractClaimEntityIds(entity, "P31"),
        ...extractClaimEntityIds(entity, "P86"),
      ];
    })
  ));
  const referenceEntities = await fetchWikidataEntityMap(referenceIds, "labels");
  const referenceLabelsById = new Map(
    [...referenceEntities.entries()].map(([id, entity]) => [id, getEntityEnglishLabel(entity)])
  );

  const candidatesByKey = new Map();
  for (const [title, searchResults] of resultsByTitle.entries()) {
    const titleKeys = buildLookupKeysFromValues([title]);
    const candidates = searchResults
      .map((result, index) => {
        const entity = entitiesById.get(String(result?.id || "").trim());
        if (!entity) return null;

        const label = getEntityEnglishLabel(entity) || String(result?.label || title).trim();
        const aliases = getEntityEnglishAliases(entity);
        return {
          title: label,
          lookupKeys: buildLookupKeysFromValues([label, ...aliases]),
          instanceLabel: extractClaimEntityIds(entity, "P31")
            .map((id) => referenceLabelsById.get(id) || "")
            .filter(Boolean)
            .join(" | "),
          composerLabels: extractClaimEntityIds(entity, "P86")
            .map((id) => referenceLabelsById.get(id) || "")
            .filter(Boolean)
            .join(" | "),
          publicationDate: extractClaimTimeValues(entity, "P577")[0] || "",
          inceptionDate: extractClaimTimeValues(entity, "P571")[0] || "",
          searchRank: index,
          searchDescription: String(result?.description || "").trim(),
        };
      })
      .filter(Boolean);

    for (const key of titleKeys) {
      if (!candidatesByKey.has(key)) candidatesByKey.set(key, []);
      candidatesByKey.get(key).push(...candidates);
    }
  }

  return candidatesByKey;
}

function chooseWikidataYear(detail, candidates) {
  const localTitleKeys = new Set(buildTitleKeys(detail));
  const localComposerTokens = composerTokensFromList(detail?.composers);
  const ranked = (Array.isArray(candidates) ? candidates : [])
    .map((candidate) => {
      const year = parseYear(candidate.publicationDate) || parseYear(candidate.inceptionDate);
      const candidateComposerTokens = composerTokensFromList(String(candidate.composerLabels || "").split("|"));
      const composerScore = overlapCount(localComposerTokens, candidateComposerTokens);
      const instanceKey = normalizeLookupKey(candidate.instanceLabel);
      const descriptionKey = normalizeLookupKey(candidate.searchDescription);
      const instancePositive = POSITIVE_INSTANCE_TOKENS.some((token) => instanceKey.includes(token));
      const instanceNegative = NEGATIVE_INSTANCE_TOKENS.some((token) => instanceKey.includes(token));
      const descriptionNegative = NEGATIVE_INSTANCE_TOKENS.some((token) => descriptionKey.includes(token));
      const titleScore = Array.isArray(candidate.lookupKeys) && candidate.lookupKeys.some((key) => localTitleKeys.has(key)) ? 3 : 0;
      const searchRankScore = Number.isFinite(candidate.searchRank) ? Math.max(0, 2 - candidate.searchRank) : 0;
      const score = (composerScore * 5) + titleScore + searchRankScore + (instancePositive ? 2 : 0) - (instanceNegative ? 6 : 0) - (descriptionNegative ? 3 : 0) + (year ? 1 : 0);

      return {
        ...candidate,
        year,
        composerScore,
        titleScore,
        score,
      };
    })
    .filter((candidate) => Number.isFinite(candidate.year))
    .sort((left, right) => right.score - left.score || left.year - right.year);

  if (!ranked.length) return null;
  if (ranked[0].composerScore > 0) return ranked[0].year;
  if (ranked[0].titleScore > 0 && ranked.length === 1 && ranked[0].score >= 4) return ranked[0].year;
  if (ranked[0].titleScore > 0 && ranked[0].score >= 5 && ranked[0].score - (ranked[1]?.score || 0) >= 2) return ranked[0].year;
  return null;
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

async function loadStandardFiles(outputDir) {
  const files = (await fs.readdir(outputDir))
    .filter((file) => file.toLowerCase().endsWith(".json"))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  const standards = [];
  for (const file of files) {
    const fullPath = path.join(outputDir, file);
    standards.push({
      file,
      fullPath,
      detail: JSON.parse(await fs.readFile(fullPath, "utf8")),
    });
  }
  return standards;
}

async function main() {
  const rootDir = process.cwd();
  const skipWikidata = process.argv.includes("--skip-wikidata");
  const outputDir = path.join(rootDir, "src", "standards-jjazzlab");
  const indexPath = path.join(rootDir, "src", "music", "jjazzlabStandardsIndex.json");
  const standards = await loadStandardFiles(outputDir);
  const pages = await discoverJazzStandardsIndexPages();
  const jazzYears = buildJazzStandardsYearMap(pages);

  let filledFromJazzStandards = 0;
  for (const standard of standards) {
    if (Number.isFinite(standard.detail?.year)) continue;
    const match = buildTitleKeys(standard.detail)
      .map((key) => jazzYears.get(key))
      .find(Boolean);
    if (!match) continue;
    standard.detail.year = match.year;
    filledFromJazzStandards += 1;
  }

  let filledFromWikidata = 0;
  const stillMissingAfterJazzStandards = standards.filter((standard) => !Number.isFinite(standard.detail?.year));

  if (!skipWikidata && stillMissingAfterJazzStandards.length) {
    const wikidataTitles = Array.from(new Set(stillMissingAfterJazzStandards.map((standard) => String(standard.detail?.title || "").trim()).filter(Boolean)));
    const wikidataCandidates = await fetchWikidataCandidatesByTitle(wikidataTitles);

    for (const standard of stillMissingAfterJazzStandards) {
      const keys = buildTitleKeys(standard.detail);
      const candidates = keys.flatMap((key) => wikidataCandidates.get(key) || []);
      const year = chooseWikidataYear(standard.detail, candidates);
      if (!year) continue;
      standard.detail.year = year;
      filledFromWikidata += 1;
    }
  }

  for (const standard of standards) {
    await fs.writeFile(standard.fullPath, `${JSON.stringify(standard.detail, null, 2)}\n`, "utf8");
  }

  const items = standards
    .map((standard) => buildIndexItem(standard.detail, standard.file))
    .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "es", { sensitivity: "base" }));

  await fs.writeFile(
    indexPath,
    `${JSON.stringify({
      collectionLabel: `${items.length} standards en la base de datos`,
      items,
    }, null, 2)}\n`,
    "utf8"
  );

  const unresolved = standards.filter((standard) => !Number.isFinite(standard.detail?.year)).length;
  console.log(`Paginas indice de JazzStandards descubiertas: ${pages.length}`);
  console.log(`Coincidencias posibles en JazzStandards: ${jazzYears.size}`);
  console.log(`Anios completados desde JazzStandards: ${filledFromJazzStandards}`);
  console.log(`Anios completados desde Wikidata: ${filledFromWikidata}`);
  console.log(`Standards que siguen sin anio: ${unresolved}`);
  console.log(`Indice actualizado: ${indexPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
