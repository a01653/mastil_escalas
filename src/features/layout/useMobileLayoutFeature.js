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

  // ── Overlays móviles ──────────────────────────────────────────────────────
  const [mobileTonalContextOpen, setMobileTonalContextOpen] = useState(false);
  const [mobileChordEditorOpen, setMobileChordEditorOpen] = useState(false);
  const [mobileNearChordEditorIdx, setMobileNearChordEditorIdx] = useState(null);
  const [mobileInfoPopover, setMobileInfoPopover] = useState(null);
  const mobileInfoPopoverOpen = !!mobileInfoPopover;

  function openMobileInfoPopover(event, title, text) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth || 360;
    const width = isMobileLayout
      ? Math.min(360, Math.max(240, viewportWidth - 24))
      : Math.min(620, Math.max(420, viewportWidth - 48));
    const centeredLeft = (viewportWidth - width) / 2;
    const left = Math.max(12, Math.min(centeredLeft, viewportWidth - width - 12));
    setMobileInfoPopover({
      title,
      text,
      left,
      top: rect.bottom + 8,
      width,
      arrowLeft: rect.left + rect.width / 2 - left,
    });
  }

  // Bloquea el scroll del documento mientras haya un overlay móvil abierto.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;
    if (!isMobileLayout || !(mobileInfoPopoverOpen || mobileChordEditorOpen || mobileNearChordEditorIdx != null || mobileTonalContextOpen)) return undefined;

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const body = document.body;
    const html = document.documentElement;
    const prevBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      touchAction: body.style.touchAction,
    };
    const prevHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = prevHtml.overflow;
      html.style.overscrollBehavior = prevHtml.overscrollBehavior;
      body.style.overflow = prevBody.overflow;
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.touchAction = prevBody.touchAction;
      window.scrollTo(0, scrollY);
    };
  }, [isMobileLayout, mobileInfoPopoverOpen, mobileChordEditorOpen, mobileNearChordEditorIdx, mobileTonalContextOpen]);

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
    overlays: {
      mobileTonalContextOpen, setMobileTonalContextOpen,
      mobileChordEditorOpen, setMobileChordEditorOpen,
      mobileNearChordEditorIdx, setMobileNearChordEditorIdx,
      mobileInfoPopover, setMobileInfoPopover,
      mobileInfoPopoverOpen,
      openMobileInfoPopover,
    },
  };
}
