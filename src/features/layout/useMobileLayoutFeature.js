import { useEffect, useRef, useState } from "react";
import {
  COMPACT_LAYOUT_WIDTH_MEDIA_QUERY,
  MOBILE_LAYOUT_WIDTH_MEDIA_QUERY,
  MOBILE_SECTION_OPTIONS,
  MOBILE_SECTION_SWIPE_COMMIT_RATIO,
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

// externalSwipeGuardsRef: ref a un boolean gestionado por App.jsx
// Permite que App.jsx actualice guards síncronamente durante el render sin
// pasar closures obsoletos como parámetros de hook.
export function useMobileLayoutFeature({
  externalSwipeGuardsRef = null,
  onDesktopSectionChange = null,
} = {}) {
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

  // Cambia la sección activa (unifica lógica móvil + desktop).
  function selectBoardView(section) {
    if (isMobileLayout) {
      setMobileChordEditorOpen(false);
      if (mobileSectionTransition) {
        setMobileMenuOpen(false);
        return;
      }
      const mobileRenderedCenter = mobileSectionTransition?.fromSection || mobileActiveSection;
      const currentIdx = MOBILE_SECTION_OPTIONS.findIndex((o) => o.value === mobileRenderedCenter);
      const nextIdx = MOBILE_SECTION_OPTIONS.findIndex((o) => o.value === section);
      if (nextIdx < 0 || currentIdx < 0 || nextIdx === currentIdx) {
        setMobileActiveSection(section);
        setMobileMenuOpen(false);
        setMobileSectionMotion("none");
        resetMobileSectionSlide();
        return;
      }
      setMobileSectionTransition({
        fromSection: mobileRenderedCenter,
        targetSection: section,
        direction: nextIdx > currentIdx ? 1 : -1,
      });
      setMobileActiveSection(section);
      setMobileSectionMotion("none");
      resetMobileSectionSlide();
      setMobileMenuOpen(false);
      setMobileSectionSlideTransform(nextIdx > currentIdx ? -mobileSectionViewportWidth() : mobileSectionViewportWidth());
      return;
    }
    onDesktopSectionChange?.(section);
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

  // ── Swipe de secciones móviles ────────────────────────────────────────────
  const mobileSectionPointerRef = useRef(null);
  const mobileSectionSlideRef = useRef(null);
  const mobileSectionSuppressClickRef = useRef(false);

  function isMobileSectionSwipeIgnored(target) {
    return !!target?.closest?.("button,input,select,textarea,a,label,[role='button'],[contenteditable='true'],[data-mobile-swipe-ignore='true']");
  }

  function mobileSectionViewportWidth() {
    const el = mobileSectionSlideRef.current;
    return el?.parentElement?.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 360) || 360;
  }

  function mobileSectionCommitDistancePx() {
    return mobileSectionViewportWidth() * MOBILE_SECTION_SWIPE_COMMIT_RATIO;
  }

  function setMobileSectionSlideTransform(dx, dragging = false) {
    const el = mobileSectionSlideRef.current;
    if (!el) return;
    el.style.transition = dragging ? "none" : "";
    el.style.setProperty("--mobile-section-drag-x", `${Math.round(dx)}px`);
    el.style.opacity = dragging ? String(Math.max(0.78, 1 - Math.min(Math.abs(dx), 320) / 1100)) : "";
  }

  function resetMobileSectionSlide() {
    const el = mobileSectionSlideRef.current;
    if (!el) return;
    el.style.transition = "";
    el.style.setProperty("--mobile-section-drag-x", "0px");
    el.style.opacity = "";
  }

  function settleMobileSectionSwipe(delta) {
    const currentIdx = mobileSectionIndex();
    const nextIdx = currentIdx + delta;
    if (currentIdx < 0 || nextIdx < 0 || nextIdx >= MOBILE_SECTION_OPTIONS.length) {
      resetMobileSectionSlide();
      return;
    }
    const targetSection = MOBILE_SECTION_OPTIONS[nextIdx].value;
    setMobileSectionTransition({
      fromSection: mobileActiveSection,
      targetSection,
      direction: delta,
    });
    setMobileActiveSection(targetSection);
    setMobileSectionMotion("none");
    setMobileMenuOpen(false);
    setMobileSectionSlideTransform(delta > 0 ? -mobileSectionViewportWidth() : mobileSectionViewportWidth());
  }

  function handleMobileSectionPointerDown(e) {
    if (!isMobileLayout || mobileSectionTransition || mobileMenuOpen || mobileTonalContextOpen || mobileChordEditorOpen || mobileNearChordEditorIdx != null || externalSwipeGuardsRef?.current || mobileInfoPopover) return;
    if ((e.pointerType && e.pointerType !== "touch" && e.pointerType !== "pen") || isMobileSectionSwipeIgnored(e.target)) {
      mobileSectionPointerRef.current = null;
      return;
    }
    setMobileSectionMotion("none");
    resetMobileSectionSlide();
    mobileSectionPointerRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      dragging: false,
      verticalScroll: false,
    };
  }

  function handleMobileSectionPointerMove(e) {
    const start = mobileSectionPointerRef.current;
    if (!start || start.pointerId !== e.pointerId || start.verticalScroll) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (!start.dragging) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        start.verticalScroll = true;
        return;
      }
      if (!(Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2)) return;
      start.dragging = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }

    e.preventDefault();
    const canMove = canMoveMobileSectionBy(dx < 0 ? 1 : -1);
    const viewportWidth = mobileSectionViewportWidth();
    const maxDrag = Math.max(150, viewportWidth * 0.92);
    const boundedDx = Math.max(-maxDrag, Math.min(maxDrag, canMove ? dx : dx * 0.22));
    start.visualDx = boundedDx;
    setMobileSectionSlideTransform(boundedDx, true);
  }

  function handleMobileSectionPointerEnd(e) {
    const start = mobileSectionPointerRef.current;
    mobileSectionPointerRef.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Si el puntero ya fue liberado, no hay nada que corregir.
    }
    if (!start || start.pointerId !== e.pointerId || start.verticalScroll) {
      resetMobileSectionSlide();
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const visualDx = typeof start.visualDx === "number" ? start.visualDx : dx;
    const delta = visualDx < 0 ? 1 : -1;
    const isHorizontalSwipe = start.dragging
      && Math.abs(visualDx) > mobileSectionCommitDistancePx()
      && Math.abs(dx) > Math.abs(dy) * 1.2
      && canMoveMobileSectionBy(delta);
    if (!isHorizontalSwipe) {
      resetMobileSectionSlide();
      return;
    }

    mobileSectionSuppressClickRef.current = true;
    window.setTimeout(() => {
      mobileSectionSuppressClickRef.current = false;
    }, 250);
    settleMobileSectionSwipe(delta);
  }

  function handleMobileSectionPointerCancel(e) {
    mobileSectionPointerRef.current = null;
    setMobileSectionTransition(null);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Si el puntero ya fue liberado, no hay nada que corregir.
    }
    resetMobileSectionSlide();
  }

  function handleMobileSectionClickCapture(e) {
    if (!mobileSectionSuppressClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
  }

  function handleMobileSectionSlideTransitionEnd(e) {
    if (!isMobileLayout || e.target !== e.currentTarget || e.propertyName !== "transform") return;
    if (!mobileSectionTransition) return;
    setMobileSectionTransition(null);
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
      selectBoardView,
    },
    overlays: {
      mobileTonalContextOpen, setMobileTonalContextOpen,
      mobileChordEditorOpen, setMobileChordEditorOpen,
      mobileNearChordEditorIdx, setMobileNearChordEditorIdx,
      mobileInfoPopover, setMobileInfoPopover,
      mobileInfoPopoverOpen,
      openMobileInfoPopover,
    },
    swipe: {
      mobileSectionSlideRef,
      handleMobileSectionPointerDown,
      handleMobileSectionPointerMove,
      handleMobileSectionPointerEnd,
      handleMobileSectionPointerCancel,
      handleMobileSectionClickCapture,
      handleMobileSectionSlideTransitionEnd,
      resetMobileSectionSlide,
      setMobileSectionSlideTransform,
    },
  };
}
