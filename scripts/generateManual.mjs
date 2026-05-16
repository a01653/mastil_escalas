/**
 * Genera el manual de usuario de Mástil Escalas en PDF.
 *
 * Requiere que el servidor preview esté corriendo:
 *   npm run build && npm run preview
 *
 * Uso:
 *   npm run generate:manual
 *   node scripts/generateManual.mjs [--url http://localhost:4174/mastil_escalas/]
 *
 * Salida: manual/mastil_escalas_manual.pdf  +  manual/manual.html
 */

import puppeteer from "puppeteer-core";
import http from "http";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "manual");

const CHROME_PATHS = [
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

const CUSTOM_URL = (() => {
  const idx = process.argv.indexOf("--url");
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/mastil_escalas/`, (res) => {
      resolve(res.statusCode < 400);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function findAppUrl() {
  if (CUSTOM_URL) return CUSTOM_URL;
  for (const port of [4173, 4174, 4175, 4176]) {
    if (await checkPort(port)) return `http://localhost:${port}/mastil_escalas/`;
  }
  return null;
}

function findChrome() {
  for (const p of CHROME_PATHS) {
    try { readFileSync(p); return p; } catch { /* not found */ }
  }
  return null;
}

async function clickNavButton(page, label) {
  await page.evaluate((lbl) => {
    for (const btn of document.querySelectorAll("button")) {
      if (btn.textContent.trim().includes(lbl) && !btn.disabled) {
        btn.click();
        return;
      }
    }
  }, label);
  await sleep(900);
}

async function shot(page, name, fullPage = false) {
  const path = resolve(OUT_DIR, `${name}.png`);
  await page.screenshot({ path, fullPage });
  const data = readFileSync(path).toString("base64");
  return { path, data };
}

// ─── Capturas ────────────────────────────────────────────────────────────────

async function captureAll(page, appUrl) {
  await page.goto(appUrl, { waitUntil: "networkidle2", timeout: 30000 });
  await sleep(1200);

  // 1. Escala
  await clickNavButton(page, "Escala");
  const escala = await shot(page, "01_escala");

  // 2. Patrones
  await clickNavButton(page, "Patrones");
  const patrones = await shot(page, "02_patrones");

  // 3. Ruta
  await clickNavButton(page, "Ruta");
  const ruta = await shot(page, "03_ruta");

  // 4. Acordes
  await clickNavButton(page, "Acordes");
  await sleep(400);
  const acordes = await shot(page, "04_acordes");

  // 5. Acordes – abrir Modo Estudio ("Ver análisis")
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      const t = btn.textContent.trim();
      if (t === "Ver análisis" || t === "Ocultar") { btn.click(); return; }
    }
  });
  await sleep(800);
  const estudio = await shot(page, "05_acordes_estudio", true);

  // cerrar Modo Estudio si está abierto
  await page.evaluate(() => {
    for (const btn of document.querySelectorAll("button")) {
      if (btn.textContent.trim() === "Ocultar") { btn.click(); return; }
    }
  });
  await sleep(400);

  // 6. Acordes – Investigar en mástil (es un checkbox, no un button)
  await page.evaluate(() => {
    // Buscar el input checkbox con label "Investigar en mástil"
    for (const input of document.querySelectorAll("input[type='checkbox']")) {
      const label = input.closest("label") || input.parentElement;
      if (label && label.textContent.includes("Investigar")) {
        input.click();
        return;
      }
    }
    // Fallback: buscar la label directamente
    for (const label of document.querySelectorAll("label")) {
      if (label.textContent.includes("Investigar")) {
        label.click();
        return;
      }
    }
  });
  await sleep(800);
  const investigar = await shot(page, "06_acordes_investigar");

  // desactivar Investigar
  await page.evaluate(() => {
    for (const input of document.querySelectorAll("input[type='checkbox']")) {
      const label = input.closest("label") || input.parentElement;
      if (label && label.textContent.includes("Investigar") && input.checked) {
        input.click();
        return;
      }
    }
  });
  await sleep(400);

  // 7. Acordes cercanos
  await clickNavButton(page, "Acordes cercanos");
  const cercanos = await shot(page, "07_cercanos");

  // 8. Standards
  await clickNavButton(page, "Standards");
  await sleep(600);
  const standards = await shot(page, "08_standards");

  // 9. Standards – seleccionar un standard para ver el chart
  await page.evaluate(() => {
    const selects = document.querySelectorAll("select");
    for (const sel of selects) {
      if (sel.options.length > 1) {
        sel.value = sel.options[1].value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        return;
      }
    }
  });
  await sleep(1000);
  const standardsChart = await shot(page, "09_standards_chart");

  return { escala, patrones, ruta, acordes, estudio, investigar, cercanos, standards, standardsChart };
}

// ─── HTML del manual ─────────────────────────────────────────────────────────

function img(data, alt) {
  return `<img src="data:image/png;base64,${data}" alt="${alt}" class="screenshot" />`;
}

function buildHtml(shots, appUrl, appVersion) {
  const today = new Date().toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" });
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Mástil Escalas — Manual de uso v${appVersion}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --accent:  #1e4fa8;
    --accent2: #2563eb;
    --muted:   #64748b;
    --border:  #cbd5e1;
    --body-bg: #f8fafc;
    --text:    #1e293b;
  }

  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: var(--text);
    background: var(--body-bg);
  }

  /* ── Página ── */
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: white;
    padding: 18mm 18mm 18mm 22mm;
    page-break-after: always;
  }
  .page:last-of-type { page-break-after: auto; }

  /* ── Portada ── */
  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    min-height: 260mm;
    gap: 8px;
  }
  .cover-logo {
    font-size: 9pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent2);
    margin-bottom: 20px;
  }
  .cover h1 {
    font-size: 28pt;
    font-weight: 800;
    color: var(--accent);
    line-height: 1.15;
    margin-bottom: 6px;
  }
  .cover .subtitle {
    font-size: 14pt;
    color: var(--muted);
    margin-bottom: 32px;
  }
  .cover .meta {
    font-size: 9.5pt;
    color: var(--muted);
    line-height: 1.8;
  }
  .cover-rule {
    width: 60px;
    height: 4px;
    background: var(--accent2);
    border-radius: 2px;
    margin-bottom: 28px;
  }

  /* ── Índice ── */
  .toc { list-style: none; }
  .toc li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 0;
    border-bottom: 1px dotted var(--border);
    font-size: 10.5pt;
  }
  .toc li .toc-num {
    font-weight: 600;
    color: var(--accent);
    min-width: 26px;
  }
  .toc li .toc-title { flex: 1; padding: 0 8px; }
  .toc li .toc-page { color: var(--muted); font-size: 9.5pt; }
  .toc-section { margin: 18px 0 6px; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }

  /* ── Headings ── */
  h1.section-title {
    font-size: 20pt;
    font-weight: 800;
    color: var(--accent);
    margin-bottom: 4px;
    padding-bottom: 6px;
    border-bottom: 3px solid var(--accent2);
  }
  h2 {
    font-size: 13pt;
    font-weight: 700;
    color: var(--accent);
    margin: 20px 0 8px;
  }
  h3 {
    font-size: 11pt;
    font-weight: 700;
    color: var(--text);
    margin: 16px 0 6px;
  }
  .section-subtitle {
    font-size: 10pt;
    color: var(--muted);
    margin-bottom: 14px;
  }

  /* ── Párrafos y listas ── */
  p { margin-bottom: 10px; }
  ul, ol { padding-left: 20px; margin-bottom: 10px; }
  li { margin-bottom: 4px; }

  /* ── Capturas ── */
  .screenshot {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,.08);
    display: block;
    margin: 12px 0 6px;
  }
  .screenshot-caption {
    font-size: 8.5pt;
    color: var(--muted);
    text-align: center;
    margin-bottom: 14px;
    font-style: italic;
  }

  /* ── Cajas de descripción numerada ── */
  .callout-list { margin: 10px 0 16px; }
  .callout-list li {
    display: grid;
    grid-template-columns: 22px 1fr;
    gap: 6px;
    margin-bottom: 6px;
    font-size: 10pt;
  }
  .callout-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent2);
    color: white;
    font-size: 8pt;
    font-weight: 700;
    flex-shrink: 0;
    margin-top: 2px;
  }

  /* ── Nota / consejo ── */
  .note {
    background: #eff6ff;
    border-left: 3px solid var(--accent2);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 10pt;
    margin: 10px 0;
  }
  .note strong { color: var(--accent); }

  /* ── Tabla ── */
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  th { background: var(--accent); color: white; padding: 6px 8px; text-align: left; font-size: 9.5pt; }
  td { padding: 5px 8px; border-bottom: 1px solid var(--border); }
  tr:nth-child(even) td { background: #f8fafc; }

  /* ── Impresión ── */
  @page { size: A4; margin: 0; }
  @media print {
    body { background: white; }
    .page { margin: 0; box-shadow: none; page-break-after: always; }
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ PORTADA -->
<div class="page">
  <div class="cover">
    <div class="cover-logo">Manual de usuario</div>
    <h1>Mástil Escalas</h1>
    <div class="subtitle">Escalas, patrones, rutas y acordes para guitarra</div>
    <div class="cover-rule"></div>
    <div class="meta">
      Versión ${appVersion}<br />
      ${today}<br />
      <span style="color:#94a3b8">${appUrl}</span>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ ÍNDICE -->
<div class="page">
  <h1 class="section-title">Índice</h1>
  <p style="margin-top:12px;color:var(--muted);font-size:10pt">Este manual describe todas las secciones de la aplicación con capturas reales de pantalla.</p>

  <div class="toc-section">General</div>
  <ul class="toc">
    <li><span class="toc-num">1</span><span class="toc-title">Introducción — ¿qué es Mástil Escalas?</span><span class="toc-page">3</span></li>
    <li><span class="toc-num">2</span><span class="toc-title">Contexto tonal — Raíz y escala activa</span><span class="toc-page">3</span></li>
  </ul>

  <div class="toc-section">Secciones principales</div>
  <ul class="toc">
    <li><span class="toc-num">3</span><span class="toc-title">Escala — diapasón con resaltado de grados</span><span class="toc-page">4</span></li>
    <li><span class="toc-num">4</span><span class="toc-title">Patrones — 3NPS, CAGED y cajas pentatónicas</span><span class="toc-page">5</span></li>
    <li><span class="toc-num">5</span><span class="toc-title">Ruta musical</span><span class="toc-page">6</span></li>
    <li><span class="toc-num">6</span><span class="toc-title">Acordes — constructor, digitaciones y Modo Estudio</span><span class="toc-page">7</span></li>
    <li><span class="toc-num">7</span><span class="toc-title">Acordes cercanos — búsqueda por proximidad</span><span class="toc-page">10</span></li>
    <li><span class="toc-num">8</span><span class="toc-title">Standards — charts de jazz</span><span class="toc-page">11</span></li>
  </ul>

  <div class="toc-section">Herramientas</div>
  <ul class="toc">
    <li><span class="toc-num">9</span><span class="toc-title">Consola de diagnóstico (mastilDebug)</span><span class="toc-page">12</span></li>
    <li><span class="toc-num">10</span><span class="toc-title">Analizar digitaciones desde terminal (acorde.bat)</span><span class="toc-page">12</span></li>
  </ul>
</div>

<!-- ═══════════════════════════════════════════════════════ INTRO + CONTEXTO TONAL -->
<div class="page">
  <h1 class="section-title">1 — Introducción</h1>
  <div class="section-subtitle">¿Qué es Mástil Escalas?</div>

  <p>
    <strong>Mástil Escalas</strong> es una aplicación web interactiva para guitarristas que quieren
    explorar escalas, patrones de posición, rutas melódicas y acordes sobre el diapasón real.
    Funciona en el navegador, sin instalación, y está optimizada tanto para escritorio como para móvil.
  </p>

  <p>La aplicación se organiza en <strong>seis secciones principales</strong> accesibles desde el menú
  superior (escritorio) o la barra inferior (móvil):</p>

  <table>
    <tr><th>Sección</th><th>Qué hace</th></tr>
    <tr><td><strong>Escala</strong></td><td>Muestra el diapasón completo con las notas de la escala activa, resaltando raíz, 3ª y 5ª.</td></tr>
    <tr><td><strong>Patrones</strong></td><td>Visualiza los patrones 3NPS, CAGED y cajas pentatónicas sobre el diapasón.</td></tr>
    <tr><td><strong>Ruta</strong></td><td>Recorre la escala en orden de altura y la restringe a los patrones activos.</td></tr>
    <tr><td><strong>Acordes</strong></td><td>Constructor de acordes con digitaciones reales, Modo Estudio y modo Investigar en mástil.</td></tr>
    <tr><td><strong>Acordes cercanos</strong></td><td>Busca digitaciones de hasta 4 acordes dentro de una ventana de trastes.</td></tr>
    <tr><td><strong>Standards</strong></td><td>Charts armónicos de standards de jazz para trabajar el repertorio.</td></tr>
  </table>

  <h1 class="section-title" style="margin-top:24px">2 — Contexto tonal</h1>
  <div class="section-subtitle">Raíz y escala activa — afectan a todas las secciones</div>

  <p>
    El <strong>Contexto tonal</strong> es el ajuste global más importante de la app.
    Aparece en el panel lateral de configuración (escritorio) y en el menú hamburguesa (móvil).
    Afecta simultáneamente a Escala, Patrones, Ruta y al contexto armónico de Acordes y Acordes cercanos.
  </p>

  <ul>
    <li><strong>Tono (raíz)</strong>: la nota tónica de referencia. Por defecto C.</li>
    <li><strong>Escala</strong>: tipo de escala (Mayor, Menor natural, Dorico, Pentatónica mayor, etc.).</li>
    <li><strong>#/b</strong>: grafía de las alteraciones. En modo Auto usa la armadura natural de la tonalidad; se puede forzar a sostenidos o bemoles.</li>
    <li><strong>Trastes visibles</strong>: rango del diapasón mostrado (p.ej. trastes 0-12).</li>
    <li><strong>Vista</strong>: muestra las celdas del mástil como <em>Notas</em> (nombre de nota) o <em>Intervalos</em> (grado respecto a la raíz).</li>
  </ul>

  <div class="note">
    <strong>Consejo:</strong> cambia el Tono y la Escala primero, antes de explorar el resto de secciones.
    Todo lo demás se actualiza automáticamente.
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ ESCALA -->
<div class="page">
  <h1 class="section-title">3 — Escala</h1>
  <div class="section-subtitle">Diapasón completo con resaltado de grados</div>

  ${img(shots.escala.data, "Sección Escala")}
  <div class="screenshot-caption">Sección Escala — diapasón con raíz, 3ª y 5ª resaltadas</div>

  <p>
    La sección <strong>Escala</strong> muestra el diapasón de guitarra en su totalidad
    (o el rango de trastes elegido en el Contexto tonal). Cada celda contiene el nombre de la nota
    o su intervalo según la vista activa.
  </p>

  <h3>Colores de los grados</h3>
  <ul class="callout-list">
    <li><span class="callout-num">●</span><span><strong>Raíz (1)</strong>: color más intenso (azul oscuro por defecto). Es la tónica de la escala.</span></li>
    <li><span class="callout-num">●</span><span><strong>3ª</strong>: segundo color de acento. Indica la calidad mayor o menor de la escala.</span></li>
    <li><span class="callout-num">●</span><span><strong>5ª</strong>: tercer color de acento. Nota de estabilidad armónica.</span></li>
    <li><span class="callout-num">●</span><span><strong>Resto de notas</strong>: color neutro (gris/azul claro). Notas de paso y tensiones.</span></li>
    <li><span class="callout-num">●</span><span><strong>Notas fuera de escala</strong>: no aparecen (celdas vacías).</span></li>
  </ul>

  <h3>Extras (notas adicionales)</h3>
  <p>
    Bajo la selección de escala hay un campo <strong>Extras</strong> que permite añadir notas
    individuales al diapasón sin cambiar la escala base. Útil para mostrar tensiones cromáticas
    (p.ej. b9, #11) o notas de paso sobre la escala activa.
  </p>

  <h3>Vista Notas / Intervalos</h3>
  <p>
    El selector <strong>Vista</strong> (en Contexto tonal o en el propio panel) alterna entre
    mostrar el nombre de la nota (C, D, Eb…) o el intervalo relativo a la raíz (1, 2, b3, 4, 5…).
    La vista por intervalos es especialmente útil para ver la estructura de la escala
    independientemente de la tonalidad.
  </p>
</div>

<!-- ═══════════════════════════════════════════════════════ PATRONES -->
<div class="page">
  <h1 class="section-title">4 — Patrones</h1>
  <div class="section-subtitle">3NPS, CAGED y cajas pentatónicas</div>

  ${img(shots.patrones.data, "Sección Patrones")}
  <div class="screenshot-caption">Sección Patrones — cada patrón resalta su posición en el diapasón</div>

  <p>
    La sección <strong>Patrones</strong> divide el diapasón en posiciones de digitación sistemáticas.
    Cada patrón se activa individualmente y se muestra sobre el diapasón con un color propio.
  </p>

  <h3>Tipos de patrones disponibles</h3>
  <table>
    <tr><th>Tipo</th><th>Número</th><th>Para qué sirve</th></tr>
    <tr><td><strong>3NPS</strong> (3 notas por cuerda)</td><td>7 posiciones</td><td>Escalas de 7 notas (Mayor, Menor, Modos). Cubre todo el mástil con posiciones simétricas.</td></tr>
    <tr><td><strong>CAGED</strong></td><td>5 posiciones (C-A-G-E-D)</td><td>Posiciones derivadas de las 5 formas de acorde abierto. Relaciona acordes y escala.</td></tr>
    <tr><td><strong>Cajas pentatónicas</strong></td><td>5 posiciones (Caja 1-5)</td><td>Escalas pentatónicas mayor/menor. Las más usadas en blues, rock y pop.</td></tr>
  </table>

  <h3>Uso típico</h3>
  <ul>
    <li>Selecciona la <strong>escala y tonalidad</strong> en Contexto tonal.</li>
    <li>Activa uno o varios patrones haciendo clic en los botones numerados.</li>
    <li>El diapasón muestra solo las notas de ese patrón, en su color.</li>
    <li>Al activar varios patrones a la vez, puedes ver cómo se conectan en el mástil.</li>
  </ul>

  <div class="note">
    <strong>Nota:</strong> para escalas pentatónicas la app muestra las 5 cajas pentatónicas.
    Para escalas de 7 notas (Mayor, Dórico, etc.) muestra los 7 patrones 3NPS y las 5 posiciones CAGED.
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ RUTA -->
<div class="page">
  <h1 class="section-title">5 — Ruta musical</h1>
  <div class="section-subtitle">Recorre la escala en orden de altura, restringida a patrones</div>

  ${img(shots.ruta.data, "Sección Ruta")}
  <div class="screenshot-caption">Sección Ruta — notas de la escala ordenadas por altura y posición en el mástil</div>

  <p>
    La <strong>Ruta musical</strong> toma las notas de la escala activa y las ordena por altura
    (de grave a agudo o viceversa), mostrando una secuencia de posiciones en el diapasón que
    puedes seguir nota a nota.
  </p>

  <h3>Diferencia con Escala y Patrones</h3>
  <ul>
    <li><strong>Escala</strong>: muestra <em>dónde</em> están todas las notas, sin orden.</li>
    <li><strong>Patrones</strong>: muestra <em>qué posición de mano</em> agrupar las notas.</li>
    <li><strong>Ruta</strong>: muestra <em>en qué orden</em> tocar las notas para subir/bajar por la escala, usando la posición de mano más lógica para cada momento.</li>
  </ul>

  <h3>Controles</h3>
  <ul>
    <li><strong>Ascendente / Descendente</strong>: dirección del recorrido.</li>
    <li><strong>Patrón activo</strong>: la ruta se restringe a las notas del patrón seleccionado en la sección Patrones. Si no hay patrón activo, usa todas las notas de la escala.</li>
    <li><strong>Avanzar / Retroceder</strong>: navega nota a nota con los botones de flecha o teclado.</li>
  </ul>

  <div class="note">
    <strong>Uso pedagógico:</strong> activa un patrón 3NPS, ve a Ruta y recorre la posición de grave a agudo.
    Es la forma más directa de interiorizar el fingering completo de una posición.
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ ACORDES -->
<div class="page">
  <h1 class="section-title">6 — Acordes</h1>
  <div class="section-subtitle">Constructor, digitaciones reales, Modo Estudio e Investigar en mástil</div>

  ${img(shots.acordes.data, "Sección Acordes")}
  <div class="screenshot-caption">Sección Acordes — editor superior, mástil con voicing y panel de resumen</div>

  <p>
    La sección <strong>Acordes</strong> es la más compleja de la app. Combina un constructor
    de acordes, un diapasón con digitaciones reales, un análisis teórico (Modo Estudio)
    y un modo de investigación libre sobre el mástil.
  </p>

  <h2>6.1 — Editor de acorde</h2>
  <p>El panel superior define el acorde que quieres construir:</p>

  <ul class="callout-list">
    <li><span class="callout-num">1</span><span><strong>Tono</strong>: nota raíz del acorde (C, C#, D, Eb…).</span></li>
    <li><span class="callout-num">2</span><span><strong>Calidad / Sus</strong>: color armónico base — mayor (maj), menor (m), dominante (7), semidisminuido (m7b5), disminuido, etc. También incluye acordes sus2 y sus4.</span></li>
    <li><span class="callout-num">3</span><span><strong>Estructura</strong>: número de voces y tipo de voicing — tríada, cuatriada, drop 2, drop 3, drop 2+4, notas guía, cuartal, etc.</span></li>
    <li><span class="callout-num">4</span><span><strong>Inversión</strong>: qué nota queda en el bajo — fundamental, 1ª inversión (3ª en el bajo), 2ª inversión (5ª en el bajo), etc.</span></li>
    <li><span class="callout-num">5</span><span><strong>Extensiones</strong>: casillas 6, 7, 9, 11, 13 para añadir tensiones al acorde según la estructura activa.</span></li>
    <li><span class="callout-num">6</span><span><strong>Dist.</strong>: distancia máxima en semitonos entre la nota más baja y la más alta del voicing (controla la apertura).</span></li>
  </ul>

  <h2>6.2 — Mástil del acorde</h2>
  <ul class="callout-list">
    <li><span class="callout-num">1</span><span><strong>Voicing X/Y</strong>: selector que indica qué digitación concreta estás viendo (X de las Y encontradas). Usa las flechas o el desplegable para navegar.</span></li>
    <li><span class="callout-num">2</span><span><strong>Cuerdas al aire</strong>: si está activo, los voicings pueden incluir cuerdas abiertas sin contarlas para la distancia.</span></li>
    <li><span class="callout-num">3</span><span>El mástil muestra la digitación real con los <strong>números de traste</strong> sobre cada cuerda. Las notas se colorean según el grado (raíz, 3ª, 5ª, 7ª…).</span></li>
  </ul>
</div>

<!-- ═══════════════════════════════════════════════════════ MODO ESTUDIO -->
<div class="page">
  <h1 class="section-title">6.3 — Modo Estudio</h1>
  <div class="section-subtitle">Análisis armónico del acorde en el contexto de la escala activa</div>

  ${img(shots.estudio.data, "Modo Estudio")}
  <div class="screenshot-caption">Modo Estudio — análisis del voicing activo en relación con la escala</div>

  <p>
    El <strong>Modo Estudio</strong> analiza el acorde activo (el que tienes construido en el editor)
    en relación con la escala del Contexto tonal. Se abre y cierra con el botón <em>Ver análisis</em>.
  </p>

  <h3>Información que muestra</h3>
  <ul class="callout-list">
    <li><span class="callout-num">1</span><span><strong>Diatónico / No diatónico</strong>: si el acorde pertenece completamente a la escala activa o tiene notas fuera de ella (con cuáles y qué intervalo representan).</span></li>
    <li><span class="callout-num">2</span><span><strong>Función armónica</strong>: grado que ocupa en la escala (Imaj7, IIm7, V7, VIm7…) o si es un dominante secundario, sustituto tritonal, backdoor dominant, etc.</span></li>
    <li><span class="callout-num">3</span><span><strong>Sustituciones diatónicas</strong>: acordes de la misma escala con función similar que se pueden intercambiar.</span></li>
    <li><span class="callout-num">4</span><span><strong>Sustituciones cromáticas / jazz</strong>: ii-V-I de destino, sustituto tritonal, upper structures.</span></li>
    <li><span class="callout-num">5</span><span><strong>Análisis del voicing</strong>: tensiones presentes, notas reales en el voicing actual y su relación con la escala.</span></li>
    <li><span class="callout-num">6</span><span><strong>Exportar PDF</strong>: genera un resumen imprimible del análisis visible.</span></li>
  </ul>

  <div class="note">
    <strong>Ejemplo:</strong> con Contexto tonal C Mayor y acorde G7 activo, el Modo Estudio mostrará:
    diatónico ✓, función V7 de C Mayor, ii-V-I sugerido Dm7–G7–Cmaj7, sustituto tritonal Db7,
    upper structure A mayor/G7, y backdoor bVII7 = F7.
  </div>

  <h1 class="section-title" style="margin-top:28px">6.4 — Investigar en mástil</h1>
  <div class="section-subtitle">Selección libre de notas para identificar acordes</div>

  ${img(shots.investigar.data, "Investigar en mástil")}
  <div class="screenshot-caption">Investigar en mástil — el editor queda bloqueado y puedes seleccionar notas libremente</div>

  <p>
    El modo <strong>Investigar en mástil</strong> invierte el flujo habitual: en lugar de construir
    un acorde y ver las digitaciones, <em>tú marcas notas directamente en el diapasón</em> y la app
    propone qué acorde es.
  </p>

  <ul class="callout-list">
    <li><span class="callout-num">1</span><span>El editor de acorde queda <strong>bloqueado</strong> mientras estás en este modo.</span></li>
    <li><span class="callout-num">2</span><span>Haz clic en cualquier celda del mástil para <strong>seleccionar o deseleccionar</strong> una nota. Puedes seleccionar hasta una nota por cuerda.</span></li>
    <li><span class="callout-num">3</span><span>La sección <strong>Lecturas posibles</strong> lista todos los acordes compatibles con las notas seleccionadas, ordenados por probabilidad.</span></li>
    <li><span class="callout-num">4</span><span><strong>Copiar en Acorde</strong>: carga la lectura elegida de vuelta en el constructor, para seguir editando desde ahí.</span></li>
    <li><span class="callout-num">5</span><span>Para salir del modo investigación, pulsa <em>Salir</em> o haz clic en el mismo botón que abrió el modo.</span></li>
  </ul>
</div>

<!-- ═══════════════════════════════════════════════════════ ACORDES CERCANOS -->
<div class="page">
  <h1 class="section-title">7 — Acordes cercanos</h1>
  <div class="section-subtitle">Busca y compara digitaciones de varios acordes dentro de una ventana de trastes</div>

  ${img(shots.cercanos.data, "Sección Acordes cercanos")}
  <div class="screenshot-caption">Acordes cercanos — hasta 4 acordes buscados en un rango del mástil</div>

  <p>
    <strong>Acordes cercanos</strong> permite buscar simultáneamente hasta <strong>4 acordes</strong>
    dentro de una ventana de trastes y los ordena por proximidad al primer acorde activo.
    Es la herramienta ideal para construir progresiones con movimiento de voz eficiente.
  </p>

  <h3>Controles principales</h3>
  <ul class="callout-list">
    <li><span class="callout-num">1</span><span><strong>Ranura 1–4</strong>: cada ranura define un acorde independiente (tono, calidad, estructura, inversión). Las ranuras se activan/desactivan individualmente.</span></li>
    <li><span class="callout-num">2</span><span><strong>Ventana de trastes</strong>: rango del mástil donde se buscan las digitaciones (p.ej. trastes 4–9).</span></li>
    <li><span class="callout-num">3</span><span><strong>Proximidad</strong>: el primer acorde activo ancla la búsqueda; los demás se ordenan por distancia media entre sus notas y las de ese acorde de referencia.</span></li>
    <li><span class="callout-num">4</span><span><strong>Auto escala</strong>: si está activo, las ranuras se rellenan automáticamente con los acordes diatónicos de la escala activa (IIm7, V7, Imaj7…). Con Auto escala OFF cada ranura es editable manualmente.</span></li>
    <li><span class="callout-num">5</span><span><strong>Cargar en Acordes</strong>: pasa la digitación seleccionada de una ranura a la sección Acordes para análisis más detallado.</span></li>
  </ul>

  <div class="note">
    <strong>Flujo recomendado para un ii-V-I en C:</strong>
    activa Auto escala con C Mayor, la app rellenará automáticamente Dm7 – G7 – Cmaj7.
    Mueve la ventana de trastes para encontrar la posición del mástil con mejor conducción de voces.
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ STANDARDS -->
<div class="page">
  <h1 class="section-title">8 — Standards</h1>
  <div class="section-subtitle">Charts armónicos de jazz y repertorio pedagógico</div>

  ${img(shots.standards.data, "Sección Standards — selector")}
  <div class="screenshot-caption">Sección Standards — selección del tema</div>

  ${img(shots.standardsChart.data, "Standards — chart de un tema")}
  <div class="screenshot-caption">Chart de un standard — compases con los cambios de acorde</div>

  <p>
    La sección <strong>Standards</strong> reúne charts armónicos sin melodía de temas de jazz,
    organizados por secciones y compases. Está pensada para trabajar repertorio dentro del flujo
    de análisis de esta app.
  </p>

  <h3>Fuentes de datos</h3>
  <ul>
    <li><strong>Charts reales</strong> (JJazzLab): forma completa compás a compás con todos los cambios de acorde tal como aparecen en los libros de repertorio.</li>
    <li><strong>Reducción pedagógica</strong>: versión simplificada que aísla las funciones principales (ii-V-I, cadencias), ideal para empezar a estudiar el tema.</li>
  </ul>

  <h3>Flujo de trabajo con Standards</h3>
  <ul class="callout-list">
    <li><span class="callout-num">1</span><span><strong>Selecciona el tema</strong> en el desplegable. La app carga el chart y el tono original del estándar.</span></li>
    <li><span class="callout-num">2</span><span><strong>Navega los compases</strong>: cada celda muestra el acorde del compás. Haz clic para seleccionarlo.</span></li>
    <li><span class="callout-num">3</span><span><strong>Carga en Acordes cercanos</strong>: selecciona hasta 4 compases y pulsa <em>Cargar en Cercanos</em>. La app abre la sección Acordes cercanos con esos acordes precargados para buscar digitaciones.</span></li>
    <li><span class="callout-num">4</span><span><strong>Tono</strong>: puedes transponer el tema a cualquier tonalidad con el selector de Tono. La app reescribe todos los símbolos del chart.</span></li>
  </ul>

  <div class="note">
    <strong>Consejo:</strong> usa Standards + Acordes cercanos juntos. Selecciona un ii-V-I del chart,
    cárgalo en Cercanos y busca digitaciones en la posición del mástil que estés trabajando.
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ HERRAMIENTAS -->
<div class="page">
  <h1 class="section-title">9 — Consola de diagnóstico</h1>
  <div class="section-subtitle">window.mastilDebug — disponible en desarrollo o con ?debug=1</div>

  <p>
    En modo desarrollo (<code>npm run dev</code>) o añadiendo <code>?debug=1</code> a la URL
    en producción, se activa el objeto <code>window.mastilDebug</code> con dos funciones de análisis:
  </p>

  <table>
    <tr><th>Función</th><th>Uso</th></tr>
    <tr>
      <td><code>analyzeNotes(names, bass?)</code></td>
      <td>Analiza un conjunto de notas por nombre e imprime todas las lecturas posibles.<br />
      <code>window.mastilDebug.analyzeNotes(["C","E","G","B"])</code></td>
    </tr>
    <tr>
      <td><code>analyzeFrets(tab)</code></td>
      <td>Analiza una digitación en formato LowE→HighE.<br />
      <code>window.mastilDebug.analyzeFrets("x32010")</code><br />
      <code>window.mastilDebug.analyzeFrets("x-10-9-8-7-x")</code></td>
    </tr>
  </table>

  <p>
    Ambas funciones imprimen en consola las lecturas detectadas, la nota primaria, los scores de
    ranking y los intervalos visibles / ausentes.
  </p>

  <h1 class="section-title" style="margin-top:28px">10 — Analizar digitaciones desde terminal</h1>
  <div class="section-subtitle">acorde.bat y npm run analyze:frets</div>

  <p>
    Para analizar digitaciones sin abrir el navegador, la app incluye dos opciones de terminal:
  </p>

  <table>
    <tr><th>Método</th><th>Uso</th></tr>
    <tr>
      <td><strong>acorde.bat</strong> (Windows)</td>
      <td>Desde la carpeta del proyecto:<br /><code>acorde x5555x</code><br /><code>acorde 3x343x</code></td>
    </tr>
    <tr>
      <td><strong>npm run analyze:frets</strong></td>
      <td><code>npm run analyze:frets -- x32010</code><br /><code>npm run analyze:frets -- x-10-9-8-7-x</code></td>
    </tr>
  </table>

  <h3>Formato de digitación</h3>
  <ul>
    <li>Orden de cuerdas: <strong>6 (LowE) → 1 (HighE)</strong>.</li>
    <li><code>x</code> = cuerda silenciada.</li>
    <li>Un carácter por cuerda para trastes 0–9: <code>x32010</code> = C Mayor abierto.</li>
    <li>Separado por <code>-</code>, <code>,</code> o espacio para trastes de 2 dígitos: <code>x-10-9-8-7-x</code>.</li>
  </ul>

  <h3>Salida</h3>
  <p>El script imprime en consola: patrón, notas detectadas, bajo real, acorde primario y
  lista completa de lecturas posibles con fórmula, raíz, bajo y score de ranking.</p>

  <div class="note" style="margin-top:24px">
    <strong>Versión de este manual:</strong> ${appVersion} — generado automáticamente el ${today}.
    Los contenidos y capturas corresponden al estado de la aplicación en esa versión.
  </div>
</div>

</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const appUrl = await findAppUrl();
  if (!appUrl) {
    console.error("\x1b[33mError: no se detecta servidor preview en puertos 4173-4176.\x1b[0m");
    console.error("Ejecuta primero:  npm run build && npm run preview");
    process.exit(1);
  }
  console.log(`\x1b[36mApp URL: ${appUrl}\x1b[0m`);

  const chromePath = findChrome();
  if (!chromePath) {
    console.error("\x1b[33mNo se encuentra Chrome. Instala Google Chrome.\x1b[0m");
    process.exit(1);
  }
  console.log(`\x1b[36mChrome: ${chromePath}\x1b[0m`);

  // Leer APP_VERSION del bundle o del fuente
  let appVersion = "?";
  try {
    const src = readFileSync(resolve(ROOT, "src", "App.jsx"), "utf-8");
    const m = src.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    if (m) appVersion = m[1];
  } catch { /* ignore */ }

  console.log("\x1b[1mLanzando Puppeteer…\x1b[0m");
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

    console.log("Capturando secciones…");
    const shots = await captureAll(page, appUrl);

    const steps = Object.keys(shots);
    console.log(`  ✓ ${steps.length} capturas: ${steps.join(", ")}`);

    const html = buildHtml(shots, appUrl, appVersion);
    const htmlPath = resolve(OUT_DIR, "manual.html");
    writeFileSync(htmlPath, html);
    console.log(`  ✓ HTML: ${htmlPath}`);

    console.log("Generando PDF…");
    const pdfPage = await browser.newPage();
    await pdfPage.setViewport({ width: 1200, height: 900 });
    await pdfPage.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
    await sleep(1500);

    const pdfPath = resolve(OUT_DIR, "mastil_escalas_manual.pdf");
    await pdfPage.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    console.log(`\n\x1b[32m✓ Manual generado:\x1b[0m ${pdfPath}`);
    console.log(`\x1b[2m  HTML fuente:       ${htmlPath}\x1b[0m`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
