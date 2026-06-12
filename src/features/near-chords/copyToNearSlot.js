import { mod12 } from "../../music/chordDetectionEngine.js";

/**
 * Mapea un candidato detectado en "Posibles acordes" a un patch de near slot.
 *
 * Preserva la entidad musical (root, calidad, extensiones, bajo slash) y
 * descarta cualquier posición física del mástil (selFrets = null).
 *
 * Con inversion="all" el motor de acordes cercanos buscará cualquier digitación
 * disponible en la zona del mástil. El bajo slash (slashBassPc) añade un filtro
 * posterior: solo se muestran voicings con esa nota en el bajo.
 */
export function buildNearSlotPatchFromDetectedCandidate(candidate) {
  if (!candidate?.uiPatch) return null;
  const p = candidate.uiPatch;

  if (p.family === "quartal") {
    return {
      enabled: true,
      family: "quartal",
      rootPc: p.rootPc,
      spellPreferSharps: !!p.spellPreferSharps,
      quartalType: p.quartalType || "pure",
      quartalVoices: p.quartalVoices || "4",
      quartalSpread: p.quartalSpread || "closed",
      quartalReference: p.quartalReference || "root",
      slashBassPc: null,
      selFrets: null,
    };
  }

  if (p.family === "guide_tones") {
    return {
      enabled: true,
      family: "guide_tones",
      rootPc: p.rootPc,
      spellPreferSharps: !!p.spellPreferSharps,
      guideToneQuality: p.guideToneQuality || "maj7",
      guideToneForm: p.guideToneForm || "closed",
      guideToneInversion: "all",
      slashBassPc: null,
      selFrets: null,
    };
  }

  // tertian (default)
  // externalBassInterval es null cuando el bajo es un tono del acorde (inversión normal,
  // e.g. Asus2/E donde E es la 5ª). Para conservar el bajo en todos los casos —
  // inversión o slash externo — usamos bassPc directamente: si difiere de la raíz,
  // hay un bajo distinto que debe preservarse.
  const slashBassPc = (typeof candidate.bassPc === "number" && mod12(candidate.bassPc) !== mod12(p.rootPc))
    ? mod12(candidate.bassPc)
    : null;

  return {
    enabled: true,
    family: "tertian",
    rootPc: p.rootPc,
    quality: p.quality,
    suspension: p.suspension || "none",
    structure: p.structure || "triad",
    inversion: "all",
    form: p.form || "open",
    positionForm: p.positionForm || "open",
    ext7: !!p.ext7,
    ext6: !!p.ext6,
    ext9: !!p.ext9,
    ext11: !!p.ext11,
    ext13: !!p.ext13,
    omit: "none",
    spellPreferSharps: !!p.spellPreferSharps,
    slashBassPc,
    selFrets: null,
  };
}
