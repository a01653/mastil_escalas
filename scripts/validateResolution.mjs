// Validación musical: Puntos de resolución — 8 casos
import { computeResolutionPoints } from "../src/features/scale-compare/scaleResolutionUtils.js";
import { computeScalePcs, buildIntervalLabelMap, rootPcFromLetterAcc } from "../src/features/scale-compare/scaleCompareUtils.js";
import { STRINGS } from "../src/music/appStaticData.js";

const NOTE_NAMES_FLAT  = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];
const NOTE_NAMES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

function pcToNote(pc, preferSharps = false) {
  return preferSharps ? NOTE_NAMES_SHARP[((pc % 12) + 12) % 12] : NOTE_NAMES_FLAT[((pc % 12) + 12) % 12];
}

function makeDerived(letter, acc, scaleName) {
  const rootPc = rootPcFromLetterAcc(letter, acc);
  return {
    row: { scaleName, color: "#fff", id: 0, rootLetter: letter, rootAcc: acc },
    rootPcRow: rootPc,
    pcs: computeScalePcs(rootPc, scaleName),
    intervalMap: buildIntervalLabelMap(rootPc, scaleName),
    preferSharps: acc === "#" || ["G#","D#","A#","E#","B#","F#","C#"].some(n => n === letter+acc),
  };
}

function printCase(n, originLabel, destLabel, origin, dest) {
  const pts = computeResolutionPoints(origin, dest, 12);
  const originPref = origin.preferSharps;
  const destPref   = dest.preferSharps;

  console.log(`\n${"═".repeat(100)}`);
  console.log(`Caso ${n}: ${originLabel} → ${destLabel}`);
  console.log(`  Origen pcs : ${[...origin.pcs].sort((a,b)=>a-b).map(p=>`${pcToNote(p,originPref)}(${p})`).join("  ")}`);
  console.log(`  Destino pcs: ${[...dest.pcs].sort((a,b)=>a-b).map(p=>`${pcToNote(p,destPref)}(${p})`).join("  ")}`);
  console.log(`${"─".repeat(100)}`);

  if (pts.length === 0) {
    console.log("  (sin conexiones)");
    return;
  }

  const hdr = [
    "Rk".padEnd(3),
    "Cuerda".padEnd(10),
    "Tr.or".padEnd(6),
    "Nota or".padEnd(8),
    "Int/orig".padEnd(9),
    "Tr.de".padEnd(6),
    "Nota de".padEnd(8),
    "Int/dest".padEnd(9),
    "Dist".padEnd(5),
    "Score".padEnd(6),
  ].join(" | ");
  console.log(`  ${hdr}`);
  console.log(`  ${"─".repeat(hdr.length)}`);

  pts.forEach((c, i) => {
    const dist = (c.distance > 0 ? "+" : "") + c.distance;
    const row = [
      String(i+1).padEnd(3),
      c.stringLabel.padEnd(10),
      String(c.originFret).padEnd(6),
      pcToNote(c.originPc, originPref).padEnd(8),
      c.originLabel.padEnd(9),
      String(c.destFret).padEnd(6),
      pcToNote(c.destPc, destPref).padEnd(8),
      c.destLabel.padEnd(9),
      dist.padEnd(5),
      String(c.score).padEnd(6),
    ].join(" | ");
    console.log(`  ${row}`);
  });
}

// ─── Casos ───────────────────────────────────────────────────────────────────

// 1. C mayor → A mayor
// Objetivos fuertes: C#=3, G#=7, A=1, E=5
printCase(1, "C Mayor", "A Mayor",
  makeDerived("C", "", "Mayor"),
  makeDerived("A", "", "Mayor")
);

// 2. C pentatónica menor → G menor natural
// Objetivos fuertes: Bb=b3, F=b7, G=1, D=5
printCase(2, "C Pentatónica menor", "G Menor natural",
  makeDerived("C", "", "Pentatónica menor"),
  makeDerived("G", "", "Menor natural")
);

// 3. A menor natural → E mayor
// Objetivos fuertes: G#=3, D#=7, E=1, B=5
printCase(3, "A Menor natural", "E Mayor",
  makeDerived("A", "", "Menor natural"),
  makeDerived("E", "", "Mayor")
);

// 4. D dórica → G mixolidia
// Objetivos fuertes: B=3, F=b7, G=1, D=5
printCase(4, "D Dórica", "G Mixolidia",
  makeDerived("D", "", "Dórica (Dorian)"),
  makeDerived("G", "", "Mixolidia (Mixolydian)")
);

// 5. E pentatónica menor → A dórica
// Objetivos: C=b3, G=b7, A=1, E=5, F#=6 característica
printCase(5, "E Pentatónica menor", "A Dórica",
  makeDerived("E", "", "Pentatónica menor"),
  makeDerived("A", "", "Dórica (Dorian)")
);

// 6. G mixolidia → C mayor
// Objetivos: E=3, B=7, C=1, G=5
printCase(6, "G Mixolidia", "C Mayor",
  makeDerived("G", "", "Mixolidia (Mixolydian)"),
  makeDerived("C", "", "Mayor")
);

// 7. B menor natural → E mixolidia
// Objetivos: G#=3, D=b7, E=1, B=5
printCase(7, "B Menor natural", "E Mixolidia",
  makeDerived("B", "", "Menor natural"),
  makeDerived("E", "", "Mixolidia (Mixolydian)")
);

// 8. F mayor → D menor natural
// Objetivos: F=b3, C=b7, D=1, A=5
printCase(8, "F Mayor", "D Menor natural",
  makeDerived("F", "", "Mayor"),
  makeDerived("D", "", "Menor natural")
);
