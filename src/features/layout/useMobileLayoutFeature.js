import { useEffect, useState } from "react";
import {
  COMPACT_LAYOUT_WIDTH_MEDIA_QUERY,
  MOBILE_LAYOUT_WIDTH_MEDIA_QUERY,
  MOBILE_SECTION_OPTIONS,
  NARROW_BOARD_LAYOUT_WIDTH_MEDIA_QUERY,
} from "../../music/appStaticData.js";

function useMediaQuery(query, setter) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(query);
    const sync = () => setter(media.matches);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      sync();
      return () => media.removeEventListener("change", sync);
    }
    if (typeof media.addListener === "function") {
      media.addListener(sync);
      sync();
      return () => media.removeListener(sync);
    }
    sync();
    return undefined;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useMobileLayoutFeature() {
  // ── Media queries ─────────────────────────────────────────────────────────
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isNarrowBoardLayout, setIsNarrowBoardLayout] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useMediaQuery(MOBILE_LAYOUT_WIDTH_MEDIA_QUERY, setIsMobileLayout);
  useMediaQuery(NARROW_BOARD_LAYOUT_WIDTH_MEDIA_QUERY, setIsNarrowBoardLayout);
  useMediaQuery(COMPACT_LAYOUT_WIDTH_MEDIA_QUERY, setIsCompactLayout);

  // ── Navegación móvil ──────────────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState("chords");
  const [mobileSectionTransition, setMobileSectionTransition] = useState(null);
  const [mobileSectionMotion, setMobileSectionMotion] = useState("none");

  // Cierra el menú de configuración cuando la ventana alcanza ≥1280px (xl).
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const xlMedia = window.matchMedia("(min-width: 1280px)");
    const closeMenu = () => { if (xlMedia.matches) setMobileMenuOpen(false); };
    if (typeof xlMedia.addEventListener === "function") {
      xlMedia.addEventListener("change", closeMenu);
      return () => xlMedia.removeEventListener("change", closeMenu);
    }
    if (typeof xlMedia.addListener === "function") {
      xlMedia.addListener(closeMenu);
      return () => xlMedia.removeListener(closeMenu);
    }
    return undefined;
  }, []);

  // Índice de la sección activa en la lista de navegación.
  function mobileSectionIndex() {
    return MOBILE_SECTION_OPTIONS.findIndex((option) => option.value === mobileActiveSection);
  }

  // ¿Hay sección adyacente en la dirección dada? (delta: +1 derecha, -1 izquierda)
  function canMoveMobileSectionBy(delta) {
    const idx = mobileSectionIndex();
    const nextIdx = idx + delta;
    return idx >= 0 && nextIdx >= 0 && nextIdx < MOBILE_SECTION_OPTIONS.length;
  }

  return {
    media: {
      isMobileLayout,
      isNarrowBoardLayout,
      isCompactLayout,
    },
    navigation: {
      mobileMenuOpen, setMobileMenuOpen,
      mobileActiveSection, setMobileActiveSection,
      mobileSectionTransition, setMobileSectionTransition,
      mobileSectionMotion, setMobileSectionMotion,
      mobileSectionIndex,
      canMoveMobileSectionBy,
    },
  };
}
