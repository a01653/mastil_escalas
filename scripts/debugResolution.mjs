// Verificación musical detallada: C pent. menor → G menor natural
import { computeResolutionPoints, getTargetNotesFromIntervalMap } from "../src/features/scale-compare/scaleResolutionUtils.js";
import { computeScalePcs, buildIntervalLabelMap, rootPcFromLetterAcc } from "../src/features/scale-compare/scaleCompareUtils.js";
import { STRINGS } from "../src/music/appStaticData.js";

const NOTE_NAMES_FLAT = ["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"];

function pcToNote(pc) { return NOTE_NAMES_FLAT[pc]; }

function makeDerived(rootLetter, rootAcc, scaleName) {
  const rootPc = rootPcFromLetterAcc(rootLetter, rootAcc);
  return {
    row: { scaleName, color: "#fff", id: 0, rootLetter, rootAcc },
    rootPcRow: rootPc,
    pcs: computeScalePcs(rootPc, scaleName),
    intervalMap: buildIntervalLabelMap(rootPc, scaleName),
    preferSharps: false,
  };
}

const origin = makeDerived("C", "", "Pentatónica menor");
const dest   = makeDerived("G", "", "Menor natural");

console.log("=== Verificación Musical ===");
console.log(`Origen : C Pentatónica menor → pcs: ${[...origin.pcs].sort((a,b)=>a-b).map(p => `${p}(${pcToNote(p)})`).join(", ")}`);
console.log(`Destino: G Menor natural     → pcs: ${[...dest.pcs].sort((a,b)=>a-b).map(p => `${p}(${pcToNote(p)})`).join(", ")}`);
console.log();

// Mostrar targets del destino
const targets = getTargetNotesFromIntervalMap(dest.intervalMap, dest.row.scaleName);
console.log("=== Notas-objetivo de G Menor natural ===");
targets.forEach(t => {
  console.log(`  ${pcToNote(t.pc).padEnd(3)} (pc=${t.pc}) → label="${t.label}"  roleName="${t.roleName}"  score=${t.score}  isChar=${t.isCharacteristic}`);
});
console.log();

// Mostrar afinación para referencia
console.log("=== Afinación (cuerdas) ===");
STRINGS.forEach((st, sIdx) => {
  const frets = [];
  for (let f = 0; f <= 12; f++) {
    const pc = (st.pc + f) % 12;
    frets.push(`tr${f}=${pcToNote(pc)}`);
  }
  console.log(`  ${st.label.padEnd(10)} (pc base=${st.pc}=${pcToNote(st.pc)}):  ${frets.slice(0,8).join("  ")}`);
});
console.log();

// Calcular puntos de resolución
const pts = computeResolutionPoints(origin, dest, 12);

console.log("=== Puntos de resolución (top 12) ===");
console.log("Rk | Cuerda        | tr.orig | Nota orig | Interv/C | tr.dest | Nota dest | Interv/G | Dist | Score");
console.log("---|---------------|---------|-----------|----------|---------|-----------|----------|------|------");
pts.forEach((c, i) => {
  const origNote = pcToNote(c.originPc);
  const destNote = pcToNote(c.destPc);
  const dist = (c.distance > 0 ? "+" : "") + c.distance;
  console.log(
    ` ${String(i+1).padStart(2)} | ${c.stringLabel.padEnd(13)} | ${String(c.originFret).padStart(7)} | ${origNote.padEnd(9)} | ${c.originLabel.padEnd(8)} | ${String(c.destFret).padStart(7)} | ${destNote.padEnd(9)} | ${c.destLabel.padEnd(8)} | ${dist.padEnd(4)} | ${c.score}`
  );
});
console.log();

// Verificar cuerdas 1ª y 2ª en detalle
console.log("=== Detalle cuerdas 1ª y 2ª ===");
[0, 1].forEach(sIdx => {
  const st = STRINGS[sIdx];
  console.log(`\nCuerda ${st.label} (pc base=${st.pc}=${pcToNote(st.pc)}):`);
  for (let f = 0; f <= 12; f++) {
    const pc = (st.pc + f) % 12;
    const inOrigin = origin.pcs.has(pc);
    const inDest = dest.pcs.has(pc);
    if (inOrigin || inDest) {
      const origLabel = origin.intervalMap.get(pc) ?? "-";
      const destLabel = dest.intervalMap.get(pc) ?? "-";
      const flags = `${inOrigin ? "ORIGEN" : "      "} ${inDest ? "DEST  " : "      "}`;
      console.log(`  tr${String(f).padStart(2)} = ${pcToNote(pc).padEnd(3)} (pc=${pc})  ${flags}  orig/${c_root(origin)}=${origLabel.padEnd(4)}  dest/${c_root(dest)}=${destLabel}`);
    }
  }
});

function c_root(d) { return d.row.rootLetter + d.row.rootAcc; }
