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

// Escritorio de 1280 px: es el ancho mínimo en que se muestra la barra Menu (breakpoint xl) y
// el más estrecho posible, para que los controles salgan grandes en el PDF. Todas las capturas
// usan la misma densidad: buildPdf la necesita para imprimir la interfaz siempre al mismo tamaño.
const CAPTURE_SCALE = 1.5;
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: CAPTURE_SCALE };
const MOBILE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: CAPTURE_SCALE, isMobile: true, hasTouch: true };

// Funciones que se instalan en la página. Un «spec» localiza un elemento:
//   { sel }    selector CSS              { text }   texto exacto (el elemento más interno)
//   { prefix } texto que empieza por…
//   { title }  title o aria-label que empieza por…
//   { panel }  sección (PanelBlock) cuyo título es exactamente ese texto
// y admite además { within: spec } para buscar dentro de otro elemento, { nth } para elegir
// entre varias coincidencias, { closest: "css" } y { up: n } para subir desde la coincidencia.
const PAGE_HELPERS = `
window.__manual = (() => {
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  function find(spec) {
    const root = spec.within ? find(spec.within) : document;
    if (!root) return null;
    let matches = [];
    if (spec.sel) {
      matches = [...root.querySelectorAll(spec.sel)];
    } else if (spec.panel) {
      matches = [...root.querySelectorAll("section")].filter((s) => {
        const title = s.firstElementChild?.firstElementChild?.firstElementChild;
        return title && title.textContent.trim() === spec.panel;
      });
    } else if (spec.text || spec.prefix) {
      const same = (t) => (spec.text ? t === spec.text : t.startsWith(spec.prefix));
      const all = [...root.querySelectorAll("*")].filter((el) => same(el.textContent.trim()));
      matches = all.filter((el) => !all.some((other) => other !== el && el.contains(other)));
    } else if (spec.title) {
      matches = [...root.querySelectorAll("[title],[aria-label]")].filter((el) =>
        ["title", "aria-label"].some((attr) => (el.getAttribute(attr) || "").startsWith(spec.title)));
    }
    let el = matches.filter(visible)[spec.nth ?? 0] || null;
    if (el && spec.closest) el = el.closest(spec.closest);
    for (let i = 0; el && i < (spec.up || 0); i++) el = el.parentElement;
    return el;
  }
  function rect(spec) {
    const el = find(spec);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY };
  }
  function badge(n, spec) {
    let r = rect(spec);
    if (!r) return false;
    // «after»: justo detrás del texto, no del elemento (los títulos ocupan todo el ancho).
    if (spec.at === "after") {
      const range = document.createRange();
      range.selectNodeContents(find(spec));
      const t = range.getBoundingClientRect();
      r = { left: t.left + scrollX, top: t.top + scrollY, right: t.right + scrollX + 4, bottom: t.bottom + scrollY };
    }
    const size = 24;
    const midY = (r.top + r.bottom) / 2 - size / 2;
    const midX = (r.left + r.right) / 2 - size / 2;
    const at = spec.at || "tl";
    const pos = {
      tl: [r.left - size / 2, r.top - size / 2],
      tr: [r.right - size / 2, r.top - size / 2],
      l: [r.left - size - 3, midY],
      r: [r.right + 3, midY],
      after: [r.right + 3, midY],
      t: [midX, r.top - size - 2],
      b: [midX, r.bottom + 2],
    }[at];
    const el = document.createElement("div");
    el.className = "manual-badge";
    el.textContent = String(n);
    Object.assign(el.style, {
      position: "absolute", left: (pos[0] + (spec.dx || 0)) + "px", top: (pos[1] + (spec.dy || 0)) + "px",
      width: size + "px", height: size + "px", borderRadius: "999px", background: "#F5A623",
      color: "#0B1D2E", font: "700 13px/24px system-ui, sans-serif", textAlign: "center",
      boxShadow: "0 0 0 2px #fff, 0 1px 4px rgba(0,0,0,.35)", zIndex: 99999, pointerEvents: "none",
    });
    document.body.appendChild(el);
    return true;
  }
  const clearBadges = () => document.querySelectorAll(".manual-badge").forEach((el) => el.remove());
  return { find, rect, badge, clearBadges };
})();
`;

function describe(spec) {
  return JSON.stringify(spec);
}

async function installHelpers(page) {
  const ready = await page.evaluate(() => !!window.__manual);
  if (!ready) await page.addScriptTag({ content: PAGE_HELPERS });
}

async function locate(page, spec) {
  await installHelpers(page);
  const ok = await page.evaluate((s) => !!window.__manual.find(s), spec);
  if (!ok) throw new Error(`No se encuentra en la página: ${describe(spec)}`);
}

async function clickSpec(page, spec, wait = 800) {
  await locate(page, spec);
  await page.evaluate((s) => window.__manual.find(s).click(), spec);
  await sleep(wait);
}

async function clickTestId(page, testId, wait = 900) {
  const selector = `[data-testid="${testId}"]`;
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  await page.click(selector);
  await sleep(wait);
}

async function clickButtonByText(page, label, wait = 800) {
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
  await sleep(wait);
}

// Elige en un <select> la opción cuyo texto visible es «text».
async function selectByText(page, selector, text, wait = 700) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  const value = await page.$eval(selector, (el, t) => {
    const option = [...el.options].find((o) => o.textContent.trim() === t);
    return option ? option.value : null;
  }, text);
  if (value === null) throw new Error(`El selector ${selector} no tiene la opción «${text}»`);
  await page.select(selector, value);
  await sleep(wait);
}

async function setChecked(page, selector, checked, wait = 700) {
  await page.waitForSelector(selector, { timeout: 8000 });
  const current = await page.$eval(selector, (el) => el.checked);
  if (current !== checked) {
    await page.$eval(selector, (el) => el.click());
    await sleep(wait);
  }
}

async function typeInto(page, selector, text, wait = 500) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, text);
  await sleep(wait);
}

// La vista se alarga hasta la altura del documento: así cualquier recorte cabe sin desplazar.
async function fitViewport(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
  const current = page.viewport();
  if (current.height !== height) {
    await page.setViewport({ ...current, height: Math.max(height, 800) });
    await sleep(400);
  }
}

async function addBadges(page, marks) {
  await installHelpers(page);
  for (const [i, mark] of marks.entries()) {
    const ok = await page.evaluate((n, s) => window.__manual.badge(n, s), mark.n ?? i + 1, mark);
    if (!ok) throw new Error(`Marcador ${mark.n ?? i + 1}: no se encuentra ${describe(mark)}`);
  }
}

/**
 * Guarda el recorte de la página que abarca los elementos indicados.
 *   specs   elementos cuya unión forma el recorte
 *   until   el recorte termina justo encima de este elemento
 *   maxWidth  ancho máximo desde el borde izquierdo (para quedarse con los primeros trastes)
 *   marks   marcadores numerados que se dibujan antes de capturar y se quitan después
 */
async function shotRegion(page, name, { specs, until = null, pad = 14, maxWidth = null, marks = [] }) {
  await fitViewport(page);
  await installHelpers(page);
  if (marks.length) await addBadges(page, marks);
  const box = await page.evaluate((list, untilSpec) => {
    const rects = list.map((s) => window.__manual.rect(s));
    if (rects.some((r) => !r)) return { missing: list[rects.findIndex((r) => !r)] };
    const out = {
      left: Math.min(...rects.map((r) => r.left)), top: Math.min(...rects.map((r) => r.top)),
      right: Math.max(...rects.map((r) => r.right)), bottom: Math.max(...rects.map((r) => r.bottom)),
    };
    if (untilSpec) {
      const u = window.__manual.rect(untilSpec);
      if (!u) return { missing: untilSpec };
      out.bottom = u.top - 6;
    }
    // Los marcadores que sobresalen del recorte lo amplían.
    for (const el of document.querySelectorAll(".manual-badge")) {
      const r = el.getBoundingClientRect();
      out.left = Math.min(out.left, r.left + scrollX); out.top = Math.min(out.top, r.top + scrollY);
      out.right = Math.max(out.right, r.right + scrollX); out.bottom = Math.max(out.bottom, r.bottom + scrollY);
    }
    return out;
  }, specs, until);
  if (box.missing) throw new Error(`Captura ${name}: no se encuentra ${describe(box.missing)}`);
  const pageWidth = page.viewport().width;
  const x = Math.max(0, Math.floor(box.left - pad));
  const y = Math.max(0, Math.floor(box.top - pad));
  let width = Math.min(pageWidth, Math.ceil(box.right + pad)) - x;
  if (maxWidth) width = Math.min(width, maxWidth);
  const height = Math.ceil(box.bottom + pad) - y;
  mkdirSync(CAPTURES_DIR, { recursive: true });
  await page.screenshot({ path: resolve(CAPTURES_DIR, `${name}.png`), clip: { x, y, width, height } });
  await page.evaluate(() => window.__manual.clearBadges());
  console.log(`  ✓ ${name}.png (${width}×${height})`);
}

async function shotViewport(page, name, marks = []) {
  await page.setViewport(VIEWPORT);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(400);
  if (marks.length) await addBadges(page, marks);
  mkdirSync(CAPTURES_DIR, { recursive: true });
  await page.screenshot({ path: resolve(CAPTURES_DIR, `${name}.png`) });
  await page.evaluate(() => window.__manual.clearBadges());
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
  await installHelpers(page);
  await sleep(1200);
}

// Ancho, en píxeles CSS, de los primeros trastes del mástil de escritorio (rótulos + trastes 0–7).
const FIRST_FRETS_WIDTH = 760;

const tonal = { panel: "Contexto tonal" };
const scalePanel = { panel: "Escala" };
const configPanel = { panel: "Configuración" };
const chordCard = { sel: '[data-testid="chord-title"]', closest: "fieldset" };

async function captureGeneral(page) {
  await clickTestId(page, "nav-scale");
  await shotViewport(page, "pantalla-general", [
    { text: "Menu", at: "b" },
    { title: "Ayuda", at: "l" },
    { text: "Disponible sin conexión.", at: "after" },
    { within: tonal, text: "Contexto tonal", at: "after" },
    { within: scalePanel, text: "Escala", at: "after" },
    { prefix: "ver. ", at: "l" },
  ]);

  // Solo la zona de controles (hasta Notas extra): el panel completo ocupa todo el ancho y en
  // el PDF saldría demasiado pequeño. El resumen de la cabecera se describe en el texto.
  await shotRegion(page, "contexto-tonal", {
    specs: [tonal],
    maxWidth: 1000,
    marks: [
      { within: tonal, text: "Nota raíz", at: "l" },
      { within: tonal, text: "Notación", at: "l" },
      { within: tonal, sel: "label", nth: 1, at: "l" },
      { within: tonal, text: "Armonización", at: "l" },
      { within: tonal, text: "Notas extra", at: "l" },
      { within: tonal, text: "Grados:", at: "l" },
      { within: tonal, text: "Notas:", at: "l" },
    ],
  });

  await shotRegion(page, "escala-mastil", { specs: [scalePanel], maxWidth: FIRST_FRETS_WIDTH });

  // Notas extra: la casilla ya trae «b2»; se activa con el botón Extra.
  await clickButtonByText(page, "Extra OFF");
  await shotRegion(page, "escala-notas-extra", { specs: [scalePanel], maxWidth: FIRST_FRETS_WIDTH });
  await clickButtonByText(page, "Extra ON");

  // Casita blues: La pentatónica menor con las dos casitas.
  await selectByText(page, 'select[title="Tónica (letra)"]', "A");
  await selectByText(page, 'select[title="Selecciona una escala/preset"]', "Pentatónica menor (1 b3 4 5 b7)");
  await page.$eval('label[title="Muestra las casitas de blues sobre el mástil de escala"] input', (el) => el.click());
  await sleep(500);
  await selectByText(page, 'select[title="Elige la casita a resaltar"]', "Ambas");
  await shotRegion(page, "escala-casita", {
    specs: [{ within: tonal, text: "Casita blues", up: 1 }, scalePanel],
  });
  await page.$eval('label[title="Muestra las casitas de blues sobre el mástil de escala"] input', (el) => el.click());
  await selectByText(page, 'select[title="Selecciona una escala/preset"]', "Mayor (1 2 3 4 5 6 7)");
  await selectByText(page, 'select[title="Tónica (letra)"]', "F");
}

async function captureConfiguration(page) {
  await clickTestId(page, "nav-configuration");
  await shotRegion(page, "configuracion", {
    specs: [configPanel],
    marks: [
      { within: configPanel, text: "Preset rápido", at: "after" },
      { within: configPanel, text: "Restaurar", at: "t" },
      { within: configPanel, text: "Guardar", at: "t" },
      { within: configPanel, text: "Vista", at: "after" },
      { within: configPanel, text: "Trastes", at: "after" },
      { within: configPanel, text: "Fondo", at: "after" },
      { within: configPanel, text: "Debug", nth: 0, at: "after" },
      { within: configPanel, text: "Exportar config", at: "t" },
      { within: configPanel, text: "Importar config", at: "t" },
      { within: configPanel, text: "Restablecer", at: "t" },
      { within: configPanel, text: "Tema", at: "after" },
      { within: configPanel, text: "Colores (círculos)", at: "after" },
      { within: configPanel, text: "Colores (acordes: 7/6/9/11/13)", at: "after" },
    ],
  });

  // Notas e Intervalos son interruptores independientes: primero los dos a la vez y, después,
  // solo Notas con Ver todo. Al terminar se vuelve a la vista por defecto (solo Intervalos).
  await clickButtonByText(page, "Notas");
  await clickTestId(page, "nav-scale");
  await shotRegion(page, "escala-vista-ambas", { specs: [scalePanel], maxWidth: FIRST_FRETS_WIDTH });
  await clickTestId(page, "nav-configuration");
  await clickButtonByText(page, "Intervalos");
  await clickButtonByText(page, "Ver todo");
  await clickTestId(page, "nav-scale");
  await shotRegion(page, "escala-ver-todo", { specs: [scalePanel], maxWidth: FIRST_FRETS_WIDTH });
  await clickTestId(page, "nav-configuration");
  await clickButtonByText(page, "Ver todo");
  await clickButtonByText(page, "Intervalos");
  await clickButtonByText(page, "Notas");
}

async function captureCompare(page) {
  await clickTestId(page, "nav-scale-compare");
  const comparePanel = { sel: '[data-testid="scale-compare-panel"]' };
  await shotRegion(page, "comparar-filas", {
    specs: [{ within: comparePanel, text: "Tono", up: 3 }, { sel: '[data-testid="scale-resolution-block"]' }],
    marks: [
      { within: comparePanel, text: "Ver", at: "l" },
      { within: comparePanel, text: "Tono", at: "t" },
      { within: comparePanel, text: "Escala", at: "t" },
      { within: comparePanel, text: "Fondo", at: "t" },
      { within: comparePanel, text: "Ver", nth: 2, at: "l" },
      { within: comparePanel, text: "G Mayor", at: "after" },
      { sel: '[data-testid="scale-resolution-toggle"]', at: "r" },
    ],
  });

  await clickTestId(page, "scale-resolution-toggle");
  // Desde el bloque de resolución (las filas ya salen en la figura anterior) hasta la sexta
  // conexión de la lista: basta para explicar cómo se lee.
  const resolutionBlock = { sel: '[data-testid="scale-resolution-block"]' };
  await shotRegion(page, "comparar-resolucion", {
    specs: [resolutionBlock, { sel: '[data-testid="scale-resolution-list"] li', nth: 5 }],
    marks: [
      { sel: '[data-testid="scale-resolution-toggle"]', at: "r" },
      { within: resolutionBlock, text: "Origen:", at: "l" },
      { sel: '[data-testid="scale-resolution-swap"]', at: "r" },
      { sel: '[data-testid="scale-resolution-list"]', at: "l" },
    ],
  });
  await clickTestId(page, "scale-resolution-toggle");
}

async function captureRoute(page) {
  await clickTestId(page, "nav-route");
  const routePanel = { sel: '[data-testid="route-panel"]' };
  const header = await page.$eval('[data-testid="route-panel"]', (el) => el.textContent);
  if (!/pasos:/.test(header)) throw new Error("El panel de Ruta no muestra un recorrido calculado (falta «pasos:»)");
  const staff = { within: routePanel, text: "Pentagrama 4/4" };
  await shotRegion(page, "ruta", {
    specs: [routePanel],
    until: staff,
    marks: [
      { within: routePanel, text: "Inicio", at: "after" },
      { within: routePanel, text: "Fin", at: "after" },
      { within: routePanel, text: "Máx. notas", at: "after" },
      { within: routePanel, prefix: "Ruta: ", at: "l" },
    ],
  });
  await shotRegion(page, "ruta-pentagrama", { specs: [{ ...staff, up: 1 }] });
}

async function captureChordBuilder(page) {
  await clickTestId(page, "nav-chords");
  const chordsPanel = { panel: "Acordes" };
  await shotRegion(page, "acordes-constructor", {
    specs: [{ sel: '[data-testid="chord-detect-toggle"]' }, chordCard],
    marks: [
      { sel: '[data-testid="chord-detect-toggle"]', at: "b" },
      { within: chordCard, prefix: "F · Triada", at: "l" },
      { sel: '[data-testid="chord-chips"]', at: "l" },
      { sel: '[data-testid="voicing-filter-select"]', at: "t" },
      { title: "Copiar voicing", within: chordCard, at: "t" },
      { sel: '[data-testid="voicing-select"]', at: "t" },
      { sel: '[data-testid="select-dist"]', at: "t" },
      { within: chordCard, text: "Estudiar", at: "t" },
      { sel: '[data-testid="select-tone"]', at: "b" },
      { sel: '[data-testid="select-family"]', at: "b" },
      { sel: '[data-testid="select-quality"]', at: "b" },
      { sel: '[data-testid="select-structure"]', at: "b" },
      { sel: '[data-testid="select-form"]', at: "b" },
      { sel: '[data-testid="select-inversion"]', at: "b" },
      { within: chordCard, text: "Extensiones", at: "t" },
      { sel: '[data-testid="chord-alterations"]', at: "b" },
      { within: chordCard, text: "Omitir", at: "t" },
    ],
  });

  const fretSection = { sel: '[data-testid="chord-fretboard-section"]' };
  await shotRegion(page, "acordes-mastil", {
    specs: [{ sel: '[data-testid="chord-fretboard-header"]' }, fretSection],
    marks: [
      { sel: '[data-testid="toggle-allow-open-strings"]', at: "t" },
      { sel: '[data-testid="toggle-keep-zone"]', at: "t" },
      { title: "Mover rango 1 traste a la izquierda", within: chordsPanel, at: "b" },
      { title: "Número de trastes que abarca el rango", within: chordsPanel, at: "b" },
      { within: chordsPanel, text: "Todo el mástil", at: "t" },
      { within: fretSection, text: "X", at: "l" },
      { within: fretSection, text: "F", nth: 0, at: "l" },
    ],
  });

  // Ejemplo: Cmaj7 en Drop 2, set 2, con la 3ª (E) en el bajo. Su digitación (x7958x) abarca
  // 5 trastes: con Dist. 4 la aplicación avisa de que no hay voicings y con Dist. 5 aparece.
  // El contexto tonal pasa a Do mayor para que el estudio trate el acorde como Imaj7; se queda
  // así para el resto de capturas de acordes, Acordes cercanos y Standards.
  await selectByText(page, 'select[title="Tónica (letra)"]', "C");
  await selectByText(page, '[data-testid="select-tone"]', "C");
  await selectByText(page, '[data-testid="select-structure"]', "Cuatriada");
  await selectByText(page, '[data-testid="select-quality"]', "Mayor");
  await setChecked(page, '[data-testid="ext-7"]', true);
  await selectByText(page, '[data-testid="select-form"]', "Drop 2 Set 2");
  await selectByText(page, '[data-testid="select-inversion"]', "1ª inversión", 1500);
  const emptyNotice = { prefix: "No he encontrado voicings" };
  await shotRegion(page, "acordes-sin-voicing", {
    specs: [chordCard, emptyNotice],
    marks: [
      { within: chordCard, text: "Dist.", at: "after" },
      { ...emptyNotice, at: "l" },
    ],
  });
  await selectByText(page, '[data-testid="select-dist"]', "5", 1500);
  const voicing = await page.$eval('[data-testid="voicing-select"]', (el) => el.selectedOptions[0]?.textContent.trim() || "");
  if (!voicing) throw new Error("Cmaj7 Drop 2 Set 2 en 1ª inversión no ofrece ningún voicing con Dist. 5");
  console.log(`  · Ejemplo de acorde: Cmaj7/E Drop 2 Set 2 → ${voicing}`);
  await shotRegion(page, "acordes-drop2", { specs: [chordCard, fretSection] });
}

async function captureStudy(page) {
  await clickButtonByText(page, "Estudiar", 1500);
  const study = { sel: '[data-testid="study-toggle"]', closest: "section" };
  const comparisonCard = { within: study, text: "Selección vs voicing real", up: 1 };
  await shotRegion(page, "estudio-resumen", {
    specs: [study],
    until: comparisonCard,
    marks: [
      { within: study, text: "Exportar PDF", at: "t" },
      { sel: '[data-testid="study-toggle"]', at: "t" },
      { within: study, text: "Identidad", at: "l" },
      { within: study, text: "Compatibilidad con la escala", at: "l" },
      { within: study, text: "Dominantes externos hacia la raíz detectada", at: "l" },
      { within: study, text: "Por qué se nombra así", at: "l" },
      { within: study, text: "Construcción", at: "l" },
      { within: study, text: "Voicing actual", at: "l" },
    ],
  });
  await shotRegion(page, "estudio-tensiones", {
    specs: [comparisonCard, { within: study, text: "Reglas", up: 1 }],
    until: { within: study, text: "Sustituciones y reharmonización" },
    marks: [
      { within: study, text: "Selección vs voicing real", at: "l" },
      { within: study, text: "Tensiones según escala", at: "l" },
      { within: study, text: "Reglas", at: "l" },
      { within: study, text: "Pentagrama del voicing real", at: "l" },
    ],
  });
  await shotRegion(page, "estudio-sustituciones", {
    specs: [{ within: study, text: "Sustituciones y reharmonización", up: 1 }],
    until: { within: study, text: "Pentagrama de la familia tónica" },
    marks: [
      { within: study, text: "Diatónicas", at: "t" },
      { within: study, text: "→", at: "l" },
      { within: study, text: "Índice de la sección", at: "after" },
    ],
  });
  await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="study-toggle"]');
    if (toggle && toggle.textContent.trim() === "Ocultar") toggle.click();
  });
  await sleep(400);
}

// Modo Manual con un patrón escrito: x3x253 (C-A-E-G), las notas de C6 y de Am7/C.
const MANUAL_PATTERN = "x3x253";

async function captureManualMode(page) {
  await clickButtonByText(page, "Manual");
  await typeInto(page, '[data-testid="chord-detect-pattern-input"]', MANUAL_PATTERN);
  await clickTestId(page, "chord-detect-apply-btn", 1200);

  const readingSelector = '[data-testid="detected-chord-list"] [data-testid^="detected-chord-name-"]';
  try {
    await page.waitForSelector(readingSelector, { visible: true, timeout: 8000 });
  } catch {
    throw new Error(`Modo Manual: tras aplicar ${MANUAL_PATTERN} no aparece ninguna lectura en «Posibles acordes»`);
  }
  const readings = await page.$$eval(readingSelector, (els) => els.map((el) => el.textContent.trim()));
  console.log(`  · Modo Manual: lecturas propuestas ${readings.map((r) => `«${r}»`).join(", ")}`);

  const chordsPanel = { panel: "Acordes" };
  const manualFretboard = { sel: '[data-testid="chord-detect-cell-0-0"]', closest: "div.rounded-xl" };
  await shotRegion(page, "manual-seleccion", {
    specs: [{ sel: '[data-testid="chord-detect-toggle"]' }, manualFretboard],
    marks: [
      { sel: '[data-testid="chord-detect-toggle"]', at: "b" },
      { title: "Copiar voicing", within: chordsPanel, at: "l" },
      { title: "Activar sonido al pulsar", within: chordsPanel, at: "t" },
      { title: "Reproducir la selección actual", within: chordsPanel, at: "t" },
      { title: "Reproducir todo el voicing", within: chordsPanel, at: "t" },
      { sel: '[data-testid="chord-detect-clear-btn"]', at: "t" },
      { title: "Estudiar acorde", within: chordsPanel, at: "t" },
      { title: "Intenta conservar la lectura funcional", at: "b" },
      { title: "Usa el acorde de referencia", at: "b" },
      { sel: '[data-testid="chord-detect-pattern-input"]', at: "b" },
      { sel: '[data-testid="chord-detect-apply-btn"]', at: "b" },
    ],
  });

  const list = { sel: '[data-testid="detected-chord-list"]', closest: "div.rounded-xl" };
  await shotRegion(page, "manual-lecturas", {
    specs: [list],
    marks: [
      { sel: '[data-testid^="detected-chord-principal-"]', at: "r" },
      { sel: '[data-testid^="detected-copy-"]', at: "l" },
      { within: list, prefix: "→ Cercano", at: "l" },
      { sel: '[data-testid="detected-oracle-toggle"]', at: "l" },
    ],
  });

  await page.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (btn.textContent.trim() !== "Manual") continue;
      for (const sibling of btn.parentElement.querySelectorAll("button")) {
        if (sibling.textContent.trim() === "Auto") { sibling.click(); return; }
      }
    }
  });
  await sleep(600);
}

async function captureChordFamilies(page) {
  // Cuartal: solo la fila de controles. El título conserva el nombre del acorde terciario
  // anterior (Cmaj7), que no describe las notas cuartales, y no debe aparecer en el manual.
  await selectByText(page, '[data-testid="select-family"]', "Cuartal");
  await shotRegion(page, "acordes-cuartal", {
    specs: [{ within: chordCard, text: "Tono" }, { within: chordCard, text: "Tipo cuartal", up: 1 }],
  });
  await selectByText(page, '[data-testid="select-family"]', "Notas guía");
  await shotRegion(page, "acordes-notas-guia", { specs: [chordCard] });
  await selectByText(page, '[data-testid="select-family"]', "Terciaria");
}

async function captureNearChords(page) {
  await clickTestId(page, "nav-near-chords");
  const panel = { sel: '[data-testid="near-chords-panel"]' };
  const slot0 = { sel: '[data-testid="near-slot-0"]' };
  await shotRegion(page, "cercanos-cabecera", {
    specs: [{ within: panel, text: "Acordes cercanos", up: 2 }, slot0],
    marks: [
      { sel: '[data-testid="near-style-select"]', at: "b" },
      { sel: '[data-testid="near-progression-select"]', at: "b" },
      { title: "Activa o desactiva el ajuste automático", at: "b" },
      { within: panel, text: "Tonalidades diatónicas estrictas de los acordes activos:", at: "l" },
      { sel: '[data-testid="near-slot-0-title"]', at: "l" },
      { within: slot0, text: "Permitir cuerdas al aire", at: "b" },
      { within: slot0, text: "Estudiar", at: "b" },
      { within: slot0, title: "Fondo:", at: "b" },
      { within: slot0, text: "Activo", at: "b" },
      { within: slot0, title: "Selecciona una digitación concreta", at: "b" },
    ],
  });

  for (const i of [1, 2, 3]) await setChecked(page, `[data-testid="near-slot-${i}-enabled"]`, true, 900);
  const board = { within: panel, text: "Mástil: acordes cercanos", closest: "section" };
  await shotRegion(page, "cercanos-mastil", { specs: [board] });
  await shotRegion(page, "cercanos-huecos", { specs: [{ sel: '[data-testid="near-slot-1"]' }] });

  await clickTestId(page, "key-analyzer-toggle");
  await typeInto(page, '[data-testid="key-analyzer-input"]', "Dm7 | G7 | Cmaj7 | A7");
  await clickTestId(page, "key-analyzer-btn", 1000);
  await shotRegion(page, "cercanos-analizador", { specs: [{ sel: '[data-testid="key-analyzer"]' }] });
  await clickTestId(page, "key-analyzer-toggle");
}

async function captureStandards(page) {
  await clickTestId(page, "nav-standards");
  await page.waitForSelector('[data-testid="standards-list"]', { timeout: 8000 });
  const catalog = { sel: '[data-testid="standards-catalog-panel"]' };
  await typeInto(page, 'input[title="Título"]', "autumn", 900);
  await shotRegion(page, "standards-catalogo", {
    specs: [{ within: catalog, text: "Catálogo", up: 2 }, { sel: '[data-testid="standards-list"] button', nth: 4 }],
    marks: [
      { sel: 'input[title="Título"]', at: "l" },
      { sel: 'input[title="Compositor"]', at: "r" },
      { sel: 'input[title="Año"]', at: "l" },
      { sel: 'input[title="Tono"]', at: "r" },
      { sel: '[data-testid="standards-list"] button', at: "l" },
    ],
  });

  const opened = await page.evaluate(() => {
    const item = [...document.querySelectorAll('[data-testid="standards-list"] button')]
      .find((b) => b.textContent.includes("Autumn Leaves"));
    if (!item) return false;
    item.click();
    return true;
  });
  if (!opened) throw new Error("No se encuentra «Autumn Leaves» en el catálogo filtrado");
  await page.waitForSelector('[data-testid="standards-chart-panel"]', { timeout: 8000 });
  await sleep(900);

  // Los cuatro primeros cambios de la forma: el ii-V-I-IV de Autumn Leaves.
  const picked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-testid="standards-chart-panel"] [title^="Añadir"]')].slice(0, 4);
    buttons.forEach((b) => b.click());
    return buttons.map((b) => b.textContent.trim());
  });
  if (picked.length < 4) throw new Error("La forma de Autumn Leaves no ofrece cuatro cambios seleccionables");
  console.log(`  · Standards: selección ${picked.join(" · ")}`);
  await sleep(800);
  const chart = { sel: '[data-testid="standards-chart-panel"]' };
  await shotRegion(page, "standards-forma", {
    specs: [{ panel: "Autumn Leaves" }, { within: chart, text: "Selección del chart real", up: 2 }],
    until: { within: chart, text: "Compases 1-8", nth: 1, up: 2 },
    marks: [
      { within: chart, text: "Selección del chart real", at: "l" },
      { within: chart, text: "Cargar selección", at: "t" },
      { within: chart, text: "Limpiar", at: "t" },
      { within: chart, sel: '[title^="Quitar"]', nth: 4, at: "tr" },
      { within: chart, text: "Compases 1-8", at: "r" },
    ],
  });

  // Cargar selección no cambia de sección: deja un aviso y los acordes en Acordes cercanos.
  await clickButtonByText(page, "Cargar selección", 1200);
  await locate(page, { prefix: "Autumn Leaves · selección del chart real: cargado en Acordes cercanos" });
  await clickTestId(page, "nav-near-chords", 1500);
  const board = { within: { sel: '[data-testid="near-chords-panel"]' }, text: "Mástil: acordes cercanos", closest: "section" };
  await shotRegion(page, "standards-cargado", { specs: [board] });
}

async function captureHelp(page) {
  await clickSpec(page, { title: "Ayuda" }, 800);
  const modal = { text: "Abrir el manual en PDF", closest: "div.max-w-5xl" };
  await shotRegion(page, "ayuda", {
    specs: [{ ...modal }],
    until: { within: modal, text: "Mástil de escala" },
    marks: [{ text: "Abrir el manual en PDF", at: "l" }],
  });
  await clickButtonByText(page, "Cerrar");
}

// Tres vistas de móvil, una junto a otra, en una sola imagen.
async function captureMobile(browser, appUrl) {
  const page = await browser.newPage();
  await page.setViewport(MOBILE_VIEWPORT);
  await freshPage(page, appUrl);
  const shots = [];
  const take = async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(500);
    shots.push((await page.screenshot({ encoding: "base64" })));
  };
  await clickTestId(page, "mobile-nav-scale");
  await take();
  await clickTestId(page, "mobile-nav-chords", 1200);
  await take();
  await clickSpec(page, { title: "Abrir configuración" }, 900);
  await take();
  await page.close();

  const sheet = await browser.newPage();
  await sheet.setViewport({ width: 3 * 390 + 4 * 24, height: 844 + 48, deviceScaleFactor: CAPTURE_SCALE });
  await sheet.setContent(`<html><body style="margin:0;padding:24px;display:flex;gap:24px;background:#fff">
    ${shots.map((b64) => `<img src="data:image/png;base64,${b64}" style="width:390px;height:844px;border-radius:18px;box-shadow:0 0 0 1px #cbd5e1">`).join("")}
  </body></html>`);
  await sleep(300);
  await sheet.screenshot({ path: resolve(CAPTURES_DIR, "movil.png") });
  await sheet.close();
  console.log("  ✓ movil.png");
}

async function captureAll(page, appUrl) {
  await freshPage(page, appUrl);
  await captureGeneral(page);
  await captureConfiguration(page);
  await captureCompare(page);
  await captureRoute(page);
  await captureChordBuilder(page);
  await captureStudy(page);
  await captureManualMode(page);
  await captureChordFamilies(page);
  await captureNearChords(page);
  await captureStandards(page);
  await captureHelp(page);
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
    await captureMobile(browser, appUrl);
  } finally {
    await browser.close();
  }
}

// ─── PDF (Pandoc + XeLaTeX) ──────────────────────────────────────────────────

const IMAGE_RE = /!\[[^\]\n]*\]\((capturas\/[a-z0-9-]+\.png)\)/g;

// Tamaño impreso de las capturas: cada píxel CSS de la interfaz ocupa PT_PER_CSS_PX puntos, de
// modo que el texto de la aplicación sale siempre al mismo cuerpo. Las capturas más anchas que la
// caja de texto, o más altas que MAX_FIGURE_HEIGHT_PT, se reducen hasta caber.
const PT_PER_CSS_PX = 0.5;
const TEXT_WIDTH_PT = 446;
const MAX_FIGURE_HEIGHT_PT = 500;

function pngSize(file) {
  const data = readFileSync(file);
  if (data.toString("ascii", 12, 16) !== "IHDR") throw new Error(`${basename(file)} no es un PNG válido`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function figureWidthPt(file) {
  const { width, height } = pngSize(file);
  const widthPt = (width / CAPTURE_SCALE) * PT_PER_CSS_PX;
  const heightPt = (height / CAPTURE_SCALE) * PT_PER_CSS_PX;
  const factor = Math.min(1, TEXT_WIDTH_PT / widthPt, MAX_FIGURE_HEIGHT_PT / heightPt);
  return (widthPt * factor).toFixed(1);
}

// Los pies de figura se numeran a mano en el Markdown («Figura N.»): deben ser correlativos y
// toda referencia «figura N» del texto debe apuntar a una figura existente.
function checkFigureNumbers(body) {
  const numbers = [...body.matchAll(/^\*Figura (\d+)\./gm)].map((m) => Number(m[1]));
  numbers.forEach((n, i) => {
    if (n !== i + 1) throw new Error(`Numeración de figuras: se esperaba «Figura ${i + 1}» y aparece «Figura ${n}»`);
  });
  const images = [...body.matchAll(IMAGE_RE)].length;
  if (images !== numbers.length) throw new Error(`Hay ${images} capturas y ${numbers.length} pies de figura`);
  for (const m of body.matchAll(/\bfiguras? (\d+)(?: y (\d+))?/gi)) {
    for (const n of [m[1], m[2]].filter(Boolean).map(Number)) {
      if (n < 1 || n > numbers.length) throw new Error(`El texto cita la figura ${n}, que no existe`);
    }
  }
}

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
  checkFigureNumbers(body);

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
    // Las tablas de marcadores de las figuras (Nº | Control | Qué hace) llevan una primera
    // columna mínima para el número.
    latex = latex.replace(/\\begin\{longtable\}\[\]\{@\{\}([lcr]+)@\{\}\}([\s\S]*?\\endhead)/g, (_m, cols, head) => {
      const count = cols.length;
      const markers = /^\s*Nº &/m.test(head);
      const fractions = count === 2 ? [0.32, 0.68]
        : count === 3 ? (markers ? [0.06, 0.27, 0.67] : [0.22, 0.6, 0.18])
          : Array(count).fill(1 / count);
      const padding = (2 * count - 2) / count;
      const specs = fractions
        .map((part) => `>{\\raggedright\\arraybackslash}p{\\dimexpr${part.toFixed(6)}\\linewidth-${padding.toFixed(6)}\\tabcolsep\\relax}`)
        .join("");
      return `\\begin{longtable}[]{@{}${specs}@{}}${head}`;
    });
    // Cada sección empieza con espacio suficiente para no quedar huérfana al pie.
    latex = latex.replace(/^(\\hypertarget\{[^\n]+\}\{%\s*\\section|\\section)/gm, "\\Needspace{3.5cm}\n$1");
    // Cada captura con su pie forma una figura flotante: LaTeX la coloca donde quepa sin dejar
    // huecos y \FloatBarrier (placeins) impide que salga de su sección. El ancho sale del tamaño
    // real de la captura (figureWidthPt) y las capturas se leen de ../manuals/capturas.
    latex = latex.replace(
      /^(?:\\pandocbounded\{)?\\includegraphics(?:\[[^\]]*\])?\{capturas\/([a-z0-9-]+\.png)\}\}?\s*\n\s*\n\\emph\{Figura (\d+)\.\s*(.*)\}\s*$/gm,
      (_m, file, number, caption) => [
        "\\begin{figure}[!htbp]",
        "\\centering",
        `\\manualcapture{${figureWidthPt(resolve(CAPTURES_DIR, file))}pt}{../manuals/capturas/${file}}`,
        `\\caption*{\\textbf{Figura ${number}.} ${caption}}`,
        "\\end{figure}",
      ].join("\n"),
    );
    if (/\\includegraphics(\[[^\]]*\])?\{capturas\//.test(latex)) {
      throw new Error("Hay capturas sin pie «*Figura N. …*» justo debajo; no se pueden convertir en figuras");
    }

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
