import { useEffect, useState } from "react";
import {
  COMPACT_LAYOUT_WIDTH_MEDIA_QUERY,
  MOBILE_LAYOUT_WIDTH_MEDIA_QUERY,
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
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isNarrowBoardLayout, setIsNarrowBoardLayout] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  useMediaQuery(MOBILE_LAYOUT_WIDTH_MEDIA_QUERY, setIsMobileLayout);
  useMediaQuery(NARROW_BOARD_LAYOUT_WIDTH_MEDIA_QUERY, setIsNarrowBoardLayout);
  useMediaQuery(COMPACT_LAYOUT_WIDTH_MEDIA_QUERY, setIsCompactLayout);

  return {
    media: {
      isMobileLayout,
      isNarrowBoardLayout,
      isCompactLayout,
    },
  };
}
