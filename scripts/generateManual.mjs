/**
 * Genera el manual de usuario de Mástil Escalas en PDF (XeLaTeX, A4 vertical).
 *
 * Fuentes versionadas:
 *   docs/manuals/USO.md                 texto del manual
 *   docs/manuals/capturas/*.png         capturas de la aplicación
 *   docs/latex/manual-template.tex      plantilla Pandoc (portada, índice, estilo)
 *
 * Salidas versionadas:
 *   docs/latex/Manual_Uso_Mastil_Escalas.tex y .pdf   PDF fuente del manual
 *   public/ayuda/mastil_escalas_manual.pdf            copia que abre el botón de ayuda
 *
 * Requisitos: Pandoc 3.x y XeLaTeX en el PATH. Las capturas necesitan además Chrome y el
 * servidor preview sirviendo la compilación actual:
 *   npm run build && npm run preview
 *
 * Uso:
 *   npm run generate:manual                       capturas + PDF
 *   node scripts/generateManual.mjs --solo-pdf    reutiliza las capturas existentes
 *   node scripts/generateManual.mjs --solo-capturas
 *   node scripts/generateManual.mjs [--url http://localhost:4174/mastil_escalas/]
 */

import http from "http";
import { spawnSync } from "child_process";
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { basename, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "docs", "manuals", "USO.md");
const CAPTURES_DIR = resolve(ROOT, "docs", "manuals", "capturas");
const TEMPLATE = resolve(ROOT, "docs", "latex", "manual-template.tex");
const LATEX_DIR = resolve(ROOT, "docs", "latex");
const DOC_NAME = "Manual_Uso_Mastil_Escalas";
const APP_PDF = resolve(ROOT, "public", "ayuda", "mastil_escalas_manual.pdf");

const COVER_TITLE = "Manual de uso";
const COVER_SUBTITLE = "Escalas, rutas y acordes sobre el mástil de la guitarra";

const CHROME_PATHS = [
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const args = process.argv.slice(2);
const ONLY_PDF = args.includes("--solo-pdf");
const ONLY_CAPTURES = args.includes("--solo-capturas");
const CUSTOM_URL = (() => {
  const idx = args.indexOf("--url");
  return idx >= 0 ? args[idx + 1] : null;
})();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkPort(port) {
  return new Promise((done) => {
    const req = http.get(`http://localhost:${port}/mastil_escalas/`, (res) => {
      done(res.statusCode < 400);
      res.resume();
    });
    req.on("error", () => done(false));
    req.setTimeout(2000, () => { req.destroy(); done(false); });
  });
}

async function findAppUrl() {
  if (CUSTOM_URL) return CUSTOM_URL;
  for (const port of [4173, 4174, 4175, 4176, 4185, 4186]) {
    if (await checkPort(port)) return `http://localhost:${port}/mastil_escalas/`;
  }
  return null;
}

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

function readAppVersion() {
  const src = readFileSync(resolve(ROOT, "src", "App.jsx"), "utf-8");
  const m = src.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  if (!m) throw new Error("No se encuentra APP_VERSION en src/App.jsx");
  return m[1];
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, { encoding: "utf-8", ...options });
  if (result.error) {
    throw new Error(`No se puede ejecutar «${command}»: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} terminó con error:\n${(result.stdout || "").slice(-4000)}\n${(result.stderr || "").slice(-3000)}`);
  }
  return result;
}

// ─── Capturas ────────────────────────────────────────────────────────────────

// Escritorio ≥ 1280 px: la barra Menu solo se muestra a partir del breakpoint xl.
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1.25 };

async function clickTestId(page, testId) {
  const selector = `[data-testid="${testId}"]`;
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  await page.click(selector);
  await sleep(900);
}

async function clickButtonByText(page, label) {
  const ok = await page.evaluate((lbl) => {
    for (const btn of document.querySelectorAll("button")) {
      if (btn.textContent.trim() === lbl && !btn.disabled) {
        btn.click();
        return true;
      }
    }
    return false;
  }, label);
  if (!ok) throw new Error(`No se encuentra el botón «${label}»`);
  await sleep(800);
}

async function shot(page, name) {
  mkdirSync(CAPTURES_DIR, { recursive: true });
  const path = resolve(CAPTURES_DIR, `${name}.png`);
  await page.screenshot({ path });
  console.log(`  ✓ ${name}.png`);
}

async function shotElement(page, selector, name) {
  const handle = await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  mkdirSync(CAPTURES_DIR, { recursive: true });
  await handle.screenshot({ path: resolve(CAPTURES_DIR, `${name}.png`) });
  console.log(`  ✓ ${name}.png`);
}

async function freshPage(page, appUrl) {
  await page.goto(appUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.goto(appUrl, { waitUntil: "networkidle2", timeout: 30000 });
  // Solo para las capturas: oculta el botón «dbg» que el servidor de desarrollo añade al
  // selector de voicings. No modifica la aplicación.
  await page.addStyleTag({
    content: 'button[title="Copiar debug voicings (solo DEV)"] { display: none !important; }',
  });
  await sleep(1200);
}

// Panel de Ruta completo (controles, recorrido en el mástil y escalas activas). El pentagrama
// queda debajo y no cabe en una captura legible junto al resto, así que se oculta un momento.
async function captureRoutePanel(page) {
  const selector = '[data-testid="route-panel"]';
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  const state = await page.evaluate((sel) => {
    const panel = document.querySelector(sel);
    const label = [...panel.querySelectorAll("div")].find((d) => d.textContent.trim() === "Pentagrama 4/4");
    const staffBlock = label ? label.parentElement : null;
    if (staffBlock) staffBlock.style.display = "none";
    return { hasRoute: /pasos:/.test(panel.textContent), hidStaff: !!staffBlock };
  }, selector);
  if (!state.hasRoute) {
    throw new Error("El panel de Ruta no muestra un recorrido calculado (falta «pasos:» en la cabecera)");
  }
  await sleep(300);
  await shotElement(page, selector, "ruta");
  if (state.hidStaff) {
    await page.evaluate((sel) => {
      const panel = document.querySelector(sel);
      const label = [...panel.querySelectorAll("div")].find((d) => d.textContent.trim() === "Pentagrama 4/4");
      if (label) label.parentElement.style.display = "";
    }, selector);
  }
}

// Modo Manual con un F mayor (xx3211: F-A-C-F) marcado con clics reales sobre el mástil.
// Cuerdas del mástil: 0 = 1ª (mi agudo) … 5 = 6ª (mi grave).
const MANUAL_CHORD_CELLS = [
  { sIdx: 3, fret: 3 }, // 4ª cuerda, traste 3: F
  { sIdx: 2, fret: 2 }, // 3ª cuerda, traste 2: A
  { sIdx: 1, fret: 1 }, // 2ª cuerda, traste 1: C
  { sIdx: 0, fret: 1 }, // 1ª cuerda, traste 1: F
];

async function captureManualMode(page) {
  await clickButtonByText(page, "Manual");

  for (const { sIdx, fret } of MANUAL_CHORD_CELLS) {
    const selector = `[data-testid="chord-detect-cell-${sIdx}-${fret}"]`;
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 8000 });
    } catch {
      throw new Error(`Modo Manual: no se encuentra la celda ${selector} del mástil`);
    }
    await page.click(selector);
    await sleep(250);
  }

  const readingSelector = '[data-testid="detected-chord-list"] [data-testid^="detected-chord-name-"]';
  try {
    await page.waitForSelector(readingSelector, { visible: true, timeout: 8000 });
  } catch {
    throw new Error("Modo Manual: tras marcar F-A-C-F no aparece ninguna lectura en «Posibles acordes»");
  }
  const reading = await page.$eval(readingSelector, (el) => el.textContent.trim());
  if (!reading) throw new Error("Modo Manual: la primera lectura propuesta está vacía");
  console.log(`  · Modo Manual: lectura propuesta «${reading}»`);

  // Vista algo más alta para que entren a la vez la cabecera, el mástil con las notas y las lecturas.
  await page.setViewport({ ...VIEWPORT, height: 1100 });
  await page.evaluate(() => {
    const cell = document.querySelector('[data-testid="chord-detect-cell-0-0"]');
    cell.scrollIntoView({ block: "start" });
    window.scrollBy(0, -220);
  });
  await sleep(300);
  // Si la primera lectura queda por debajo del borde, baja lo justo.
  await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    if (r.bottom > window.innerHeight - 24) window.scrollBy(0, r.bottom - window.innerHeight + 48);
  }, readingSelector);
  await sleep(300);
  const visible = await page.$eval(readingSelector, (el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= window.innerHeight;
  });
  if (!visible) throw new Error("Modo Manual: la lectura propuesta no cabe en la captura");
  await shot(page, "acordes-manual");
  await page.setViewport(VIEWPORT);
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function captureAll(page, appUrl) {
  await freshPage(page, appUrl);

  await clickTestId(page, "nav-scale");
  await shot(page, "escala");

  await clickTestId(page, "nav-scale-compare");
  await shot(page, "comparar");

  await clickTestId(page, "nav-route");
  await captureRoutePanel(page);

  await clickTestId(page, "nav-chords");
  await shot(page, "acordes");

  // Estudio del acorde principal: el botón «Estudiar» de la cabecera del mástil.
  await clickButtonByText(page, "Estudiar");
  await page.evaluate(() => {
    document.querySelector('[data-testid="study-toggle"]')?.scrollIntoView({ block: "start" });
  });
  await sleep(500);
  await shot(page, "acordes-estudio");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="study-toggle"]');
    if (toggle && toggle.textContent.trim() === "Ocultar") toggle.click();
  });
  await sleep(400);

  // Modo Manual del selector Auto / Manual de la cabecera de Acordes.
  await captureManualMode(page);
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (btn.textContent.trim() !== "Manual") continue;
      for (const hermano of btn.parentElement.querySelectorAll("button")) {
        if (hermano.textContent.trim() === "Auto") { hermano.click(); return; }
      }
    }
  });
  await sleep(400);

  await clickTestId(page, "nav-near-chords");
  await shot(page, "cercanos");

  await clickTestId(page, "nav-standards");
  await page.waitForSelector('[data-testid="standards-list"]', { timeout: 8000 });
  await shot(page, "standards");

  const opened = await page.evaluate(() => {
    const item = document.querySelector('[data-testid="standards-list"] button');
    if (!item) return false;
    item.click();
    return true;
  });
  if (!opened) throw new Error("No se encuentra ningún standard en [data-testid=\"standards-list\"]");
  await page.waitForSelector('[data-testid="standards-chart-panel"]', { timeout: 8000 });
  await sleep(800);
  await shot(page, "standards-forma");

  await clickTestId(page, "nav-configuration");
  await shot(page, "configuracion");
}

async function captureManual() {
  const puppeteer = (await import("puppeteer-core")).default;

  const appUrl = await findAppUrl();
  if (!appUrl) {
    throw new Error("No se detecta servidor preview. Ejecuta primero:  npm run build && npm run preview");
  }
  console.log(`App URL: ${appUrl}`);

  const chromePath = findChrome();
  if (!chromePath) throw new Error("No se encuentra Chrome. Instala Google Chrome.");

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    console.log("Capturando secciones…");
    await captureAll(page, appUrl);
  } finally {
    await browser.close();
  }
}

// ─── PDF (Pandoc + XeLaTeX) ──────────────────────────────────────────────────

const IMAGE_RE = /!\[[^\]\n]*\]\((capturas\/[a-z0-9-]+\.png)\)/g;

function buildPdf() {
  const appVersion = readAppVersion();
  const edition = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  // El primer encabezado de nivel 1 es el título del documento: va en la portada.
  const body = readFileSync(SOURCE, "utf-8").replace(/^# [^\n]+\n/, "");
  const captures = [...new Set([...body.matchAll(IMAGE_RE)].map((m) => m[1]))];
  const missing = captures.filter((c) => !existsSync(resolve(CAPTURES_DIR, basename(c))));
  if (missing.length) {
    throw new Error(`Faltan capturas en docs/manuals/capturas: ${missing.map((c) => basename(c)).join(", ")}`);
  }

  const work = mkdtempSync(join(tmpdir(), "mastil-manual-"));
  try {
    const mdPath = join(work, "body.md");
    writeFileSync(mdPath, body, "utf-8");
    const texRaw = join(work, `${DOC_NAME}.raw.tex`);

    console.log("Pandoc…");
    // «##» pasa a \chapter y «###» a \section, numerados como en el DTS (clase report).
    run("pandoc", [
      mdPath, "--from=gfm", "--to=latex", "--standalone", "--no-highlight",
      "--shift-heading-level-by=-1", "--top-level-division=chapter", "--columns=10000",
      `--template=${TEMPLATE}`, `--output=${texRaw}`,
      `--variable=covertitle:${COVER_TITLE}`, `--variable=coversubtitle:${COVER_SUBTITLE}`,
      `--variable=headtitle:${COVER_TITLE}`, `--variable=appversion:${appVersion}`,
      `--variable=edition:${edition}`,
    ], { cwd: ROOT });

    let latex = readFileSync(texRaw, "utf-8");

    // Tablas: primera columna estrecha, segunda ancha; el texto se ajusta dentro de la celda.
    latex = latex.replace(/\\begin\{longtable\}\[\]\{@\{\}([lcr]+)@\{\}\}/g, (_m, cols) => {
      const count = cols.length;
      const fractions = count === 2 ? [0.32, 0.68] : Array(count).fill(1 / count);
      const padding = (2 * count - 2) / count;
      const specs = fractions
        .map((part) => `>{\\raggedright\\arraybackslash}p{\\dimexpr${part.toFixed(6)}\\linewidth-${padding.toFixed(6)}\\tabcolsep\\relax}`)
        .join("");
      return `\\begin{longtable}[]{@{}${specs}@{}}`;
    });
    // Cada sección empieza con espacio suficiente para no quedar huérfana al pie.
    latex = latex.replace(/^(\\hypertarget\{[^\n]+\}\{%\s*\\section|\\section)/gm, "\\Needspace{3.5cm}\n$1");
    // Las capturas se leen de ../manuals/capturas, igual que en el repositorio.
    latex = latex.replace(
      /\\includegraphics(\[[^\]]*\])?\{capturas\//g,
      "\\includegraphics[width=\\linewidth,height=0.44\\textheight,keepaspectratio]{../manuals/capturas/",
    );
    // Cada captura reserva espacio para ella y su pie, de modo que no se separen. Captura y pie
    // no llevan la sangría de párrafo: la captura ocupa todo el ancho de la caja de texto.
    latex = latex.replace(/^(\\pandocbounded\{)?\\includegraphics/gm, (m) => `\\Needspace{11.5cm}\n\\noindent${m}`);
    latex = latex.replace(/^\\emph\{Figura \d+\./gm, (m) => `\\noindent${m}`);

    const buildDir = join(work, "docs", "latex");
    const captureDir = join(work, "docs", "manuals", "capturas");
    mkdirSync(buildDir, { recursive: true });
    mkdirSync(captureDir, { recursive: true });
    for (const c of captures) copyFileSync(resolve(CAPTURES_DIR, basename(c)), join(captureDir, basename(c)));
    const texName = `${DOC_NAME}.tex`;
    writeFileSync(join(buildDir, texName), latex, "utf-8");

    // Tres pasadas para resolver índice y referencias.
    for (let i = 1; i <= 3; i++) {
      console.log(`XeLaTeX (${i}/3)…`);
      run("xelatex", ["-interaction=nonstopmode", "-halt-on-error", "-output-directory=.", texName], { cwd: buildDir });
    }

    const log = readFileSync(join(buildDir, `${DOC_NAME}.log`), "utf-8");
    const issues = ["Overfull \\hbox", "Overfull \\vbox", "Missing character", "Float too large", "undefined references"]
      .filter((item) => log.includes(item));
    if (issues.length) {
      const lines = log.split("\n");
      const details = lines
        .map((line, i) => (issues.some((issue) => line.includes(issue)) ? lines.slice(i, i + 5).join("\n") : null))
        .filter(Boolean)
        .join("\n");
      throw new Error(`Problemas LaTeX: ${issues.join(", ")}\n${details}`);
    }

    mkdirSync(LATEX_DIR, { recursive: true });
    mkdirSync(dirname(APP_PDF), { recursive: true });
    copyFileSync(join(buildDir, texName), resolve(LATEX_DIR, texName));
    copyFileSync(join(buildDir, `${DOC_NAME}.pdf`), resolve(LATEX_DIR, `${DOC_NAME}.pdf`));
    copyFileSync(join(buildDir, `${DOC_NAME}.pdf`), APP_PDF);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  console.log(`\n✓ PDF fuente:   docs/latex/${DOC_NAME}.pdf`);
  console.log(`✓ PDF de la app: public/ayuda/mastil_escalas_manual.pdf (versión ${appVersion}, edición ${edition})`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (ONLY_PDF && ONLY_CAPTURES) throw new Error("--solo-pdf y --solo-capturas son incompatibles");
  if (!ONLY_PDF) await captureManual();
  if (!ONLY_CAPTURES) buildPdf();
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
