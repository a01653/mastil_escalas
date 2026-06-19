import { mod12 } from "./appMusicBasics.js";

// Degree format: { semitones, quality, ext7, structure }
// quality: "maj" | "min" | "dom" | "hdim" | "dim" | "aug"
//   "maj"  → major triad; when ext7=true → major 7th (Cmaj7)
//   "min"  → minor triad; when ext7=true → minor 7th (Dm7)
//   "dom"  → dominant base (maj 3rd + min 7th when ext7=true); G7
//   "hdim" → half-diminished (min 3rd + dim 5th + min 7th when ext7=true); Dm7b5
//   "dim"  → diminished triad / dim7 when ext7=true
// structure: "triad" | "tetrad"
// mode: "major" | "minor" — intended tonal context (used to detect parallel borrowing in the UI)

// ── Style catalog ─────────────────────────────────────────────────────────────
export const NEAR_CHORDS_STYLES = [
  { id: "all",      label: "Todos",            colorClass: "bg-slate-100 text-slate-700 border-slate-200" },
  { id: "pop",      label: "Pop",              colorClass: "bg-sky-100 text-sky-800 border-sky-200" },
  { id: "rock",     label: "Rock",             colorClass: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "jazz",     label: "Jazz",             colorClass: "bg-violet-100 text-violet-800 border-violet-200" },
  { id: "blues",    label: "Blues",            colorClass: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "soul",     label: "Soul / R&B",       colorClass: "bg-rose-100 text-rose-800 border-rose-200" },
  { id: "funk",     label: "Funk",             colorClass: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200" },
  { id: "folk",     label: "Folk / Country",   colorClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "cinematic","label": "Menor / Cinemático", colorClass: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "flamenco", label: "Flamenco / Andaluz", colorClass: "bg-red-100 text-red-800 border-red-200" },
  { id: "modal",    label: "Modal",            colorClass: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  { id: "gospel",   label: "Gospel",           colorClass: "bg-amber-100 text-amber-800 border-amber-200" },
  { id: "latin",    label: "Latin / Bossa",    colorClass: "bg-teal-100 text-teal-800 border-teal-200" },
  { id: "metal",    label: "Metal",            colorClass: "bg-zinc-200 text-zinc-800 border-zinc-300" },
];

export const DEFAULT_NEAR_PROGRESSION_STYLE_ID = "all";

// ── Progression catalog ───────────────────────────────────────────────────────
export const NEAR_CHORDS_PROGRESSIONS = [

  // ── POP ───────────────────────────────────────────────────────────────────
  {
    id: "I-ii-IV-V",
    style: "pop",
    mode: "major",
    label: "I – ii – IV – V",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 2, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-V-vi-IV",
    style: "pop",
    mode: "major",
    label: "I – V – vi – IV · Pop",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "vi-IV-I-V",
    style: "pop",
    mode: "major",
    label: "vi – IV – I – V · Pop relativo",
    degrees: [
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-vi-IV-V",
    style: "pop",
    mode: "major",
    label: "I – vi – IV – V · 50s",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-IV-vi-V",
    style: "pop",
    mode: "major",
    label: "I – IV – vi – V · Pop moderno",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-V-vi-iii",
    style: "pop",
    mode: "major",
    label: "I – V – vi – iii · Pop extendido",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 4, quality: "min", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-V-IV-V",
    style: "pop",
    mode: "major",
    label: "I – V – IV – V · Pop/Rock",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-IV-V",
    style: "pop",
    mode: "major",
    label: "I – IV – V",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
    substitute: { semitones: 9, quality: "min", ext7: false, structure: "triad" },
  },
  {
    id: "I-V-vi",
    style: "pop",
    mode: "major",
    label: "I – V – vi",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
    ],
    substitute: { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
  },
  {
    id: "vi-IV-I",
    style: "pop",
    mode: "major",
    label: "vi – IV – I",
    degrees: [
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
    ],
    substitute: { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
  },

  // ── ROCK ──────────────────────────────────────────────────────────────────
  {
    id: "I-bVII-IV-I",
    style: "rock",
    mode: "major",
    label: "I – bVII – IV – I · Rock modal",
    degrees: [
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-IV-V-IV",
    style: "rock",
    mode: "major",
    label: "I – IV – V – IV · Rock clásico",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-bVII-bVI-bVII",
    style: "rock",
    mode: "major",
    label: "I – bVII – bVI – bVII · Rock mayor/modal",
    degrees: [
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bVII-bVI-bVII",
    style: "rock",
    mode: "minor",
    label: "i – bVII – bVI – bVII · Rock menor",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-V-bVII-IV",
    style: "rock",
    mode: "major",
    label: "I – V – bVII – IV · Rock épico",
    degrees: [
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5,  quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bVI-bIII-bVII-rock",
    style: "rock",
    mode: "minor",
    label: "i – bVI – bIII – bVII · Rock menor épico",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 3,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },

  // ── JAZZ ──────────────────────────────────────────────────────────────────
  // Jazz mayor — cuatriadas por defecto
  {
    id: "ii7-V7-Imaj7",
    style: "jazz",
    mode: "major",
    label: "ii7 – V7 – Imaj7 · Jazz mayor",
    degrees: [
      { semitones: 2, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj",  ext7: true, structure: "tetrad" },
    ],
    substitute: { semitones: 9, quality: "dom", ext7: true, structure: "tetrad" },
  },
  {
    id: "ii7-V7-Imaj7-VI7",
    style: "jazz",
    mode: "major",
    label: "ii7 – V7 – Imaj7 – VI7 · Jazz turnaround",
    degrees: [
      { semitones: 2, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj",  ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "dom",  ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "Imaj7-vi7-ii7-V7",
    style: "jazz",
    mode: "major",
    label: "Imaj7 – vi7 – ii7 – V7 · Rhythm changes",
    degrees: [
      { semitones: 0, quality: "maj",  ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "iii7-VI7-ii7-V7",
    style: "jazz",
    mode: "major",
    label: "iii7 – VI7 – ii7 – V7 · Turnaround jazz",
    degrees: [
      { semitones: 4, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "ii-V-I-vi",
    style: "jazz",
    mode: "major",
    label: "ii7 – V7 – I – vi7 · Jazz turnaround",
    degrees: [
      { semitones: 2, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj",  ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "min",  ext7: true, structure: "tetrad" },
    ],
  },
  // Jazz menor
  {
    id: "iiø7-V7-i7",
    style: "jazz",
    mode: "minor",
    label: "iiø7 – V7 – i7 · Jazz menor",
    degrees: [
      { semitones: 2, quality: "hdim", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "min",  ext7: true, structure: "tetrad" },
    ],
    substitute: { semitones: 8, quality: "maj", ext7: true, structure: "tetrad" },
  },
  {
    id: "iiø7-V7-i7-VImaj7",
    style: "jazz",
    mode: "minor",
    label: "iiø7 – V7 – i7 – VImaj7 · Jazz menor turnaround",
    degrees: [
      { semitones: 2, quality: "hdim", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 8, quality: "maj",  ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "i7-iv7-iiø7-V7",
    style: "jazz",
    mode: "minor",
    label: "i7 – iv7 – iiø7 – V7 · Menor cadencial",
    degrees: [
      { semitones: 0, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "hdim", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "ii-V-I",
    style: "jazz",
    mode: "major",
    label: "ii7 – V7 – Imaj7 · Jazz 3 acordes",
    degrees: [
      { semitones: 2, quality: "min",  ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom",  ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj",  ext7: true, structure: "tetrad" },
    ],
    substitute: { semitones: 9, quality: "dom", ext7: true, structure: "tetrad" },
  },

  // ── BLUES ─────────────────────────────────────────────────────────────────
  {
    id: "I7-IV7-I7-V7",
    style: "blues",
    mode: "major",
    label: "I7 – IV7 – I7 – V7 · Blues básico",
    degrees: [
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "I7-IV7-I7-I7",
    style: "blues",
    mode: "major",
    label: "I7 – IV7 – I7 – I7 · Blues inicio",
    degrees: [
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "IV7-IV7-I7-I7",
    style: "blues",
    mode: "major",
    label: "IV7 – IV7 – I7 – I7 · Blues medio",
    degrees: [
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "V7-IV7-I7-V7",
    style: "blues",
    mode: "major",
    label: "V7 – IV7 – I7 – V7 · Blues turnaround",
    degrees: [
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "i7-iv7-i7-V7-blues",
    style: "blues",
    mode: "minor",
    label: "i7 – iv7 – i7 – V7 · Blues menor",
    degrees: [
      { semitones: 0, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },

  // ── SOUL / R&B ────────────────────────────────────────────────────────────
  {
    id: "Imaj7-vi7-ii7-V7-soul",
    style: "soul",
    mode: "major",
    label: "Imaj7 – vi7 – ii7 – V7 · Soul turnaround",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "Imaj7-IVmaj7-iii7-vi7",
    style: "soul",
    mode: "major",
    label: "Imaj7 – IVmaj7 – iii7 – vi7 · Neo soul",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 4, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "min", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "vi7-ii7-V7-Imaj7",
    style: "soul",
    mode: "major",
    label: "vi7 – ii7 – V7 – Imaj7 · R&B resolución",
    degrees: [
      { semitones: 9, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "Imaj7-bVIImaj7-IVmaj7-iv7",
    style: "soul",
    mode: "major",
    label: "Imaj7 – bVIImaj7 – IVmaj7 – iv7 · Soul modal",
    degrees: [
      { semitones: 0,  quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 10, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "min", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "i7-bVIImaj7-bVImaj7-V7",
    style: "soul",
    mode: "minor",
    label: "i7 – bVIImaj7 – bVImaj7 – V7 · R&B menor",
    degrees: [
      { semitones: 0,  quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 10, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 8,  quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 7,  quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },

  // ── FUNK ──────────────────────────────────────────────────────────────────
  {
    id: "i7-IV7-i7-IV7",
    style: "funk",
    mode: "minor",
    label: "i7 – IV7 – i7 – IV7 · Funk dórico",
    degrees: [
      { semitones: 0, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "I7-IV7-bVII7-IV7",
    style: "funk",
    mode: "major",
    label: "I7 – IV7 – bVII7 – IV7 · Funk dominante",
    degrees: [
      { semitones: 0,  quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 10, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "i7-bVII7-IV7-i7",
    style: "funk",
    mode: "minor",
    label: "i7 – bVII7 – IV7 – i7 · Funk modal",
    degrees: [
      { semitones: 0,  quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 10, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0,  quality: "min", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "I7-IV7-I7-bVII7",
    style: "funk",
    mode: "major",
    label: "I7 – IV7 – I7 – bVII7 · Funk básico",
    degrees: [
      { semitones: 0,  quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0,  quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 10, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },

  // ── FOLK / COUNTRY ────────────────────────────────────────────────────────
  {
    id: "I-IV-V-I",
    style: "folk",
    mode: "major",
    label: "I – IV – V – I · Folk básico",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-V-IV-I",
    style: "folk",
    mode: "major",
    label: "I – V – IV – I · Country",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-vi-IV-V-folk",
    style: "folk",
    mode: "major",
    label: "I – vi – IV – V · Folk/50s",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-IV-I-V",
    style: "folk",
    mode: "major",
    label: "I – IV – I – V · Country clásico",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "vi-V-IV-I",
    style: "folk",
    mode: "major",
    label: "vi – V – IV – I · Folk descendente",
    degrees: [
      { semitones: 9, quality: "min", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
    ],
  },

  // ── MENOR / CINEMÁTICO ────────────────────────────────────────────────────
  {
    id: "i-bVI-bIII-bVII",
    style: "cinematic",
    mode: "minor",
    label: "i – bVI – bIII – bVII · Menor épica",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 3,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-VI-III-VII",
    style: "cinematic",
    mode: "minor",
    label: "i – bVI – bIII – bVII · Menor épica (alt)",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 3,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-iv-v-i",
    style: "cinematic",
    mode: "minor",
    label: "i – iv – v – i · Menor natural",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "min", ext7: false, structure: "triad" },
      { semitones: 7, quality: "min", ext7: false, structure: "triad" },
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-iv-V-i",
    style: "cinematic",
    mode: "minor",
    label: "i – iv – V – i · Menor armónica",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "min", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bVI-iv-V",
    style: "cinematic",
    mode: "minor",
    label: "i – bVI – iv – V · Cinemático menor",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 8, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5, quality: "min", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bII-bVI-V",
    style: "cinematic",
    mode: "minor",
    label: "i – bII – bVI – V · Oscuro / frigio-armónico",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 1, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 8, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-iv-v",
    style: "cinematic",
    mode: "minor",
    label: "i – iv – v · Menor",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "min", ext7: false, structure: "triad" },
      { semitones: 7, quality: "min", ext7: false, structure: "triad" },
    ],
    substitute: { semitones: 0, quality: "min", ext7: false, structure: "triad" },
  },
  {
    id: "i-bVI-bVII",
    style: "cinematic",
    mode: "minor",
    label: "i – bVI – bVII · Menor épica",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
    substitute: { semitones: 0, quality: "min", ext7: false, structure: "triad" },
  },

  // ── FLAMENCO / ANDALUZ ────────────────────────────────────────────────────
  {
    id: "i-bVII-bVI-V",
    style: "flamenco",
    mode: "minor",
    label: "i – bVII – bVI – V · Cadencia andaluza",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7,  quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "iv-bIII-bII-I-frigio",
    style: "flamenco",
    mode: "minor",
    label: "iv – bIII – bII – I · Andaluz frigio",
    degrees: [
      { semitones: 5, quality: "min", ext7: false, structure: "triad" },
      { semitones: 3, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 1, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bII-i-bII",
    style: "flamenco",
    mode: "minor",
    label: "i – bII – i – bII · Frigio vamp",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 1, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 1, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-bII-I-bVII",
    style: "flamenco",
    mode: "major",
    label: "I – bII – I – bVII · Frigio mayor/flamenco",
    degrees: [
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 1,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },

  // ── MODAL ─────────────────────────────────────────────────────────────────
  {
    id: "I-bVII-IV-I-mixo",
    style: "modal",
    mode: "major",
    label: "I – bVII – IV – I · Mixolidio",
    degrees: [
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-IV-i-IV",
    style: "modal",
    mode: "minor",
    label: "i – IV – i – IV · Dórico",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 5, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "I-II-I-II",
    style: "modal",
    mode: "major",
    label: "I – II – I – II · Lidio",
    degrees: [
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 2, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 2, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bII-i-bVII-frigio",
    style: "modal",
    mode: "minor",
    label: "i – bII – i – bVII · Frigio",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 1,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bVII-iv-i",
    style: "modal",
    mode: "minor",
    label: "i – bVII – iv – i · Eólico",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 5,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
    ],
  },

  // ── GOSPEL ────────────────────────────────────────────────────────────────
  {
    id: "Imaj7-IVmaj7-Imaj7-V7",
    style: "gospel",
    mode: "major",
    label: "Imaj7 – IVmaj7 – Imaj7 – V7 · Gospel básico",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "Imaj7-III7-vi7-II7",
    style: "gospel",
    mode: "major",
    label: "Imaj7 – III7 – vi7 – II7 · Gospel turnaround",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 4, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "Imaj7-VI7-ii7-V7",
    style: "gospel",
    mode: "major",
    label: "Imaj7 – VI7 – ii7 – V7 · Gospel/Jazz",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "IVmaj7-iv7-Imaj7-VI7",
    style: "gospel",
    mode: "major",
    label: "IVmaj7 – iv7 – Imaj7 – VI7 · Gospel cromático",
    degrees: [
      { semitones: 5, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },

  // ── LATIN / BOSSA ─────────────────────────────────────────────────────────
  {
    id: "Imaj7-vi7-ii7-V7-bossa",
    style: "latin",
    mode: "major",
    label: "Imaj7 – vi7 – ii7 – V7 · Bossa",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 9, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 2, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "ii7-V7-Imaj7-Imaj7",
    style: "latin",
    mode: "major",
    label: "ii7 – V7 – Imaj7 – Imaj7 · Bossa cadencial",
    degrees: [
      { semitones: 2, quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 7, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "i7-iv7-bVII7-bIIImaj7",
    style: "latin",
    mode: "minor",
    label: "i7 – iv7 – bVII7 – bIIImaj7 · Latin menor",
    degrees: [
      { semitones: 0,  quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 5,  quality: "min", ext7: true, structure: "tetrad" },
      { semitones: 10, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 3,  quality: "maj", ext7: true, structure: "tetrad" },
    ],
  },
  {
    id: "Imaj7-I7-IVmaj7-iv7",
    style: "latin",
    mode: "major",
    label: "Imaj7 – I7 – IVmaj7 – iv7 · Bossa intercambio modal",
    degrees: [
      { semitones: 0, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 0, quality: "dom", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "maj", ext7: true, structure: "tetrad" },
      { semitones: 5, quality: "min", ext7: true, structure: "tetrad" },
    ],
  },

  // ── METAL ─────────────────────────────────────────────────────────────────
  {
    id: "i-bVI-bVII-i",
    style: "metal",
    mode: "minor",
    label: "i – bVI – bVII – i · Metal menor",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bII-bVII-i",
    style: "metal",
    mode: "minor",
    label: "i – bII – bVII – i · Metal frigio",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 1,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bVI-bII-V",
    style: "metal",
    mode: "minor",
    label: "i – bVI – bII – V · Metal oscuro",
    degrees: [
      { semitones: 0, quality: "min", ext7: false, structure: "triad" },
      { semitones: 8, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 1, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7, quality: "maj", ext7: false, structure: "triad" },
    ],
  },
  {
    id: "i-bVII-bVI-V-metal",
    style: "metal",
    mode: "minor",
    label: "i – bVII – bVI – V · Metal clásico menor",
    degrees: [
      { semitones: 0,  quality: "min", ext7: false, structure: "triad" },
      { semitones: 10, quality: "maj", ext7: false, structure: "triad" },
      { semitones: 8,  quality: "maj", ext7: false, structure: "triad" },
      { semitones: 7,  quality: "maj", ext7: false, structure: "triad" },
    ],
  },
];

export const DEFAULT_NEAR_PROGRESSION_ID = "I-ii-IV-V";

// ── Helpers ───────────────────────────────────────────────────────────────────

export function findNearProgression(id) {
  return NEAR_CHORDS_PROGRESSIONS.find((p) => p.id === id) ?? null;
}

export function getStyleById(styleId) {
  return NEAR_CHORDS_STYLES.find((s) => s.id === styleId) ?? null;
}

export function getProgressionsForStyle(styleId) {
  if (!styleId || styleId === "all") return NEAR_CHORDS_PROGRESSIONS;
  return NEAR_CHORDS_PROGRESSIONS.filter((p) => p.style === styleId);
}

// Scale names that belong to the minor family.
// Used by getProgressionParallelLabel to detect parallel borrowing.
const MINOR_MODE_SCALE_NAMES = new Set([
  "Menor natural", "Menor armónica", "Menor melódica",
  "Dórico", "Frigio", "Locrio", "Eólico",
  "Pentatónica menor", "Pentatónica menor + blue note",
]);

/**
 * Returns a contextual hint when a progression mode doesn't match the active scale family.
 * - Minor progression over a major scale → "usa [tonicName] menor paralelo"
 * - Major progression over a minor scale → "usa [tonicName] mayor paralelo"
 * Returns null when the progression and scale are in the same family, or when the progression
 * is not found.
 */
export function getProgressionParallelLabel(progressionId, scaleName, tonicNoteName) {
  const prog = findNearProgression(progressionId);
  if (!prog) return null;
  const scaleIsMinor = MINOR_MODE_SCALE_NAMES.has(scaleName) || scaleName.toLowerCase().includes("menor");
  const progressionIsMinor = prog.mode === "minor";
  if (progressionIsMinor && !scaleIsMinor) {
    return `usa ${tonicNoteName} menor paralelo`;
  }
  if (!progressionIsMinor && scaleIsMinor) {
    return `usa ${tonicNoteName} mayor paralelo`;
  }
  return null;
}

/**
 * Resolve a progression to 4 slot patches given the tonic pitch class.
 * 3-chord progressions use their `substitute` field for slot 4.
 * Returns null if the progressionId is not found.
 */
export function resolveProgressionDegrees(progressionId, tonicPc, preferSharps) {
  const progression = findNearProgression(progressionId);
  if (!progression) return null;

  const { degrees, substitute } = progression;
  const allDegrees =
    degrees.length >= 4
      ? degrees.slice(0, 4)
      : [...degrees, substitute ?? degrees[degrees.length - 1]];

  return allDegrees.map((deg) => ({
    rootPc: mod12(tonicPc + deg.semitones),
    quality: deg.quality,
    suspension: "none",
    structure: deg.structure ?? "triad",
    inversion: "all",
    form: "open",
    positionForm: "open",
    ext7: deg.ext7 ?? false,
    ext6: false,
    ext9: false,
    ext11: false,
    ext13: false,
    spellPreferSharps: preferSharps,
  }));
}
