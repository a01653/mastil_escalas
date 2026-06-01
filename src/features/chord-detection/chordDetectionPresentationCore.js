import {
  buildDetectedCandidateNoteNameForPc,
  mod12,
  spellNoteFromChordInterval,
} from "../../music/appMusicBasics.js";
import { buildDetectedCandidateBadgeItems as buildDetectedCandidateBadgeItemsPure } from "../../music/chordDetectionEngine.js";

export function buildChordDetectStaffEvents({
  selectedNotes,
  selectedCandidate,
  preferSharps,
}) {
  if (!Array.isArray(selectedNotes) || !selectedNotes.length) return [];

  const orderedNotes = [...selectedNotes].sort((a, b) => a.pitch - b.pitch);

  return [{
    notes: orderedNotes.map((note) => note.pitch),
    spelledNotes: orderedNotes.map((note) => buildDetectedCandidateNoteNameForPc(note.pc, selectedCandidate, preferSharps)),
  }];
}

export function buildChordDetectSelectedCandidateNotesText({
  selectedCandidate,
  preferSharps,
}) {
  if (!selectedCandidate) return "";

  const coreNotes = Array.isArray(selectedCandidate.visibleNotes)
    ? selectedCandidate.visibleNotes.filter(Boolean)
    : [];
  const noteText = Array.from(new Set(coreNotes)).join(", ");
  if (selectedCandidate.externalBassInterval == null) return noteText;

  const bassName = spellNoteFromChordInterval(
    selectedCandidate.rootPc,
    selectedCandidate.externalBassInterval,
    selectedCandidate.preferSharps ?? preferSharps
  );

  return noteText ? `${noteText} · bajo en ${bassName}` : `bajo en ${bassName}`;
}

export function buildChordDetectSelectedCandidateBadgeItems({
  selectedCandidate,
  preferSharps,
}) {
  return buildDetectedCandidateBadgeItemsPure(selectedCandidate, preferSharps);
}

export function buildChordDetectSelectedCandidateBassNote({
  selectedCandidate,
  preferSharps,
}) {
  if (!selectedCandidate) return null;

  const prefer = selectedCandidate.preferSharps ?? preferSharps;
  const bassInterval = selectedCandidate.externalBassInterval != null
    ? selectedCandidate.externalBassInterval
    : mod12(selectedCandidate.bassPc - selectedCandidate.rootPc);

  return spellNoteFromChordInterval(selectedCandidate.rootPc, bassInterval, prefer);
}
