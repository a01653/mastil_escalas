import {
  buildDetectedCandidateNoteNameForPc,
  spellNoteFromChordInterval,
} from "../../music/appMusicBasics.js";

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
