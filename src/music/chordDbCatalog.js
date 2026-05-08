const CHORD_DB_FOLDER_BY_PC = Object.freeze([
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
]);

function mod12(n) {
  return ((Number(n) || 0) % 12 + 12) % 12;
}

export function chordDbKeyNameFromPc(pc) {
  return CHORD_DB_FOLDER_BY_PC[mod12(pc)];
}
