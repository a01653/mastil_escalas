import { useRef, useState } from "react";
import * as AppMusicBasics from "../../music/appMusicBasics.js";

const { preferSharpsFromMajorTonicPc } = AppMusicBasics;

export function useChordBuilderState() {
  // -- Tertian -----------------------------------------------------------
  const [chordRootPc, setChordRootPc] = useState(5); // F
  const [chordSpellPreferSharps, setChordSpellPreferSharps] = useState(() => preferSharpsFromMajorTonicPc(5));
  const [chordFamily, setChordFamily] = useState("tertian");
  const [chordQuality, setChordQuality] = useState("maj");
  const [chordSuspension, setChordSuspension] = useState("none");
  const [chordStructure, setChordStructure] = useState("triad");
  const [chordInversion, setChordInversion] = useState("all");
  const [chordForm, setChordForm] = useState("open");
  const [chordPositionForm, setChordPositionForm] = useState("open");
  const [chordExt7, setChordExt7] = useState(false);
  const [chordExt6, setChordExt6] = useState(false);
  const [chordExt9, setChordExt9] = useState(false);
  const [chordExt11, setChordExt11] = useState(false);
  const [chordExt13, setChordExt13] = useState(false);
  const [chordOmit, setChordOmit] = useState("none");
  const [chordCopyNotice, setChordCopyNotice] = useState(null);
  const [chordCopiedEntry, setChordCopiedEntry] = useState(null); // { voicing, fingerprint } — patrón físico copiado

  // -- Quartal -----------------------------------------------------------
  const [chordQuartalType, setChordQuartalType] = useState("pure");
  const [chordQuartalVoices, setChordQuartalVoices] = useState("4");
  const [chordQuartalSpread, setChordQuartalSpread] = useState("closed");
  const [chordQuartalReference, setChordQuartalReference] = useState("root");
  const [chordQuartalScaleName, setChordQuartalScaleName] = useState("Mayor");
  const [chordQuartalVoicingIdx, setChordQuartalVoicingIdx] = useState(0);
  const [chordQuartalSelectedFrets, setChordQuartalSelectedFrets] = useState(null);

  // -- Guide tones -------------------------------------------------------
  const [guideToneQuality, setGuideToneQuality] = useState("maj7");
  const [guideToneForm, setGuideToneForm] = useState("closed");
  const [guideToneInversion, setGuideToneInversion] = useState("all");
  const [guideToneVoicingIdx, setGuideToneVoicingIdx] = useState(0);
  const [guideToneSelectedFrets, setGuideToneSelectedFrets] = useState(null);

  // -- Voicing selection -------------------------------------------------
  const [chordVoicingIdx, setChordVoicingIdx] = useState(0);
  const [chordSelectedFrets, setChordSelectedFrets] = useState(null);
  const [chordMaxDist, setChordMaxDist] = useState(4);
  const [chordAllowOpenStrings, setChordAllowOpenStrings] = useState(false);

  // -- Refs --------------------------------------------------------------
  const lastChordVoicingRef = useRef(null);
  const skipChordVoicingRefSyncRef = useRef(false);
  const pendingChordRestoreRef = useRef({ active: false, frets: null });
  const pendingChordCopyResolutionRef = useRef(null);
  const lastGuideToneVoicingRef = useRef(null);

  return {
    state: {
      chordRootPc, setChordRootPc,
      chordSpellPreferSharps, setChordSpellPreferSharps,
      chordFamily, setChordFamily,
      chordQuality, setChordQuality,
      chordSuspension, setChordSuspension,
      chordStructure, setChordStructure,
      chordInversion, setChordInversion,
      chordForm, setChordForm,
      chordPositionForm, setChordPositionForm,
      chordExt7, setChordExt7,
      chordExt6, setChordExt6,
      chordExt9, setChordExt9,
      chordExt11, setChordExt11,
      chordExt13, setChordExt13,
      chordOmit, setChordOmit,
      chordCopyNotice, setChordCopyNotice,
      chordCopiedEntry, setChordCopiedEntry,
      chordQuartalType, setChordQuartalType,
      chordQuartalVoices, setChordQuartalVoices,
      chordQuartalSpread, setChordQuartalSpread,
      chordQuartalReference, setChordQuartalReference,
      chordQuartalScaleName, setChordQuartalScaleName,
      chordQuartalVoicingIdx, setChordQuartalVoicingIdx,
      chordQuartalSelectedFrets, setChordQuartalSelectedFrets,
      guideToneQuality, setGuideToneQuality,
      guideToneForm, setGuideToneForm,
      guideToneInversion, setGuideToneInversion,
      guideToneVoicingIdx, setGuideToneVoicingIdx,
      guideToneSelectedFrets, setGuideToneSelectedFrets,
      chordVoicingIdx, setChordVoicingIdx,
      chordSelectedFrets, setChordSelectedFrets,
      chordMaxDist, setChordMaxDist,
      chordAllowOpenStrings, setChordAllowOpenStrings,
    },
    refs: {
      lastChordVoicingRef,
      skipChordVoicingRefSyncRef,
      pendingChordRestoreRef,
      pendingChordCopyResolutionRef,
      lastGuideToneVoicingRef,
    },
  };
}
