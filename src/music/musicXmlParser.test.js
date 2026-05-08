import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parseMusicXmlStandard } from "./musicXmlParser.js";

const XML_WITH_ENDINGS = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Lead Sheet</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <barline location="left"><repeat direction="forward"/></barline>
      <direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>
      <harmony><root><root-step>C</root-step></root><kind text="M7">major-seventh</kind></harmony>
    </measure>
    <measure number="2">
      <harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>
    </measure>
    <measure number="3">
      <barline location="left"><ending number="1" type="start">1.</ending></barline>
      <harmony><root><root-step>G</root-step></root><kind text="7">dominant</kind></harmony>
      <barline location="right"><ending number="1" type="stop">1.</ending><repeat direction="backward" times="2"/></barline>
    </measure>
    <measure number="4">
      <barline location="left"><ending number="2" type="start">2.</ending></barline>
      <harmony><root><root-step>F</root-step></root><kind text="m6">minor-sixth</kind></harmony>
      <barline location="right"><ending number="2" type="discontinue">2.</ending></barline>
    </measure>
    <measure number="5">
      <direction><direction-type><rehearsal>B</rehearsal></direction-type></direction>
      <harmony><root><root-step>C</root-step></root><kind text="7sus">suspended-fourth</kind></harmony>
    </measure>
  </part>
</score-partwise>`;

const XML_WITH_THREE_PASSES = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Lead Sheet</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <barline location="left"><repeat direction="forward"/></barline>
      <direction><direction-type><rehearsal>Coda</rehearsal></direction-type></direction>
      <harmony><root><root-step>F</root-step><root-alter>1</root-alter></root><kind text="m7b5">half-diminished</kind></harmony>
    </measure>
    <measure number="2">
      <direction><direction-type><words>3X</words></direction-type></direction>
      <harmony><root><root-step>E</root-step><root-alter>-1</root-alter></root><kind text="°">diminished</kind></harmony>
      <barline location="right"><repeat direction="backward" times="2"/></barline>
    </measure>
    <measure number="3">
      <direction><direction-type><rehearsal>Final</rehearsal></direction-type></direction>
      <harmony><root><root-step>C</root-step></root><kind text="M7">major-seventh</kind></harmony>
    </measure>
  </part>
</score-partwise>`;

const XML_WITH_METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Ain&apos;t Misbehavin&apos;</work-title></work>
  <identification>
    <creator type="composer">Thomas &quot;Fats&quot; Waller</creator>
    <creator type="composer">Harry Brooks</creator>
  </identification>
  <part-list><score-part id="P1"><part-name>Lead Sheet</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>
      <harmony><root><root-step>F</root-step></root><kind text="7">dominant</kind></harmony>
    </measure>
  </part>
</score-partwise>`;

const XML_WITH_REDUNDANT_SLASH_TRANSITION = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Lead Sheet</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <direction><direction-type><rehearsal>B</rehearsal></direction-type></direction>
      <harmony><root><root-step>A</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><duration>1536</duration><voice>1</voice><type>half</type></note>
      <harmony><root><root-step>D</root-step></root><kind text="7">dominant</kind></harmony>
      <note><duration>768</duration><voice>1</voice><type>quarter</type></note>
      <harmony>
        <root><root-step>D</root-step></root>
        <kind text="7">dominant</kind>
        <bass><bass-step>C</bass-step></bass>
      </harmony>
      <note><duration>768</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>C</root-step></root><kind text="m7">minor-seventh</kind></harmony>
      <note><duration>1536</duration><voice>1</voice><type>half</type></note>
      <harmony>
        <root><root-step>C</root-step></root>
        <kind text="m7">minor-seventh</kind>
        <bass><bass-step>B</bass-step><bass-alter>-1</bass-alter></bass>
      </harmony>
      <note><duration>1536</duration><voice>1</voice><type>half</type></note>
    </measure>
  </part>
</score-partwise>`;

describe("musicXmlParser", () => {
  test("extrae título y compositores del propio MusicXML", () => {
    const parsed = parseMusicXmlStandard(XML_WITH_METADATA, {
      id: "aint-misbehavin",
    });

    expect(parsed.title).toBe("Ain't Misbehavin'");
    expect(parsed.composers).toEqual([
      "Thomas \"Fats\" Waller",
      "Harry Brooks",
    ]);
  });

  test("lee la tonalidad inicial desde la armadura del MusicXML", () => {
    const parsed = parseMusicXmlStandard(`<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Lead Sheet</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <key print-object="no">
          <fifths>-2</fifths>
          <mode>minor</mode>
        </key>
      </attributes>
      <direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>
      <harmony><root><root-step>G</root-step></root><kind text="m7">minor-seventh</kind></harmony>
    </measure>
  </part>
</score-partwise>`, {
      id: "autumn-leaves",
    });

    expect(parsed.defaultKey).toBe("Gm");
  });

  test("expande primera y segunda casilla en el orden real de ejecución", () => {
    const parsed = parseMusicXmlStandard(XML_WITH_ENDINGS, {
      id: "sample",
      title: "Sample",
    });

    expect(parsed.form).toBe("A (1ª vuelta / 2ª vuelta) · B · 7 compases");
    expect(parsed.realForm.sections.map((section) => section.label)).toEqual([
      "A · 1ª vuelta",
      "A · 2ª vuelta",
      "B",
    ]);
    expect(parsed.realForm.sections[0].measures.map((measure) => measure.bar)).toEqual([1, 2, 3]);
    expect(parsed.realForm.sections[1].measures.map((measure) => measure.bar)).toEqual([1, 2, 4]);
    expect(parsed.realForm.sections[1].measures[2].chordEvents[0]).toEqual({
      display: "F-6",
      load: "Fm6",
    });
    expect(parsed.realForm.sections[2].measures[0].chordEvents[0]).toEqual({
      display: "C7sus4",
      load: "C7sus4",
    });
  });

  test("expande repeticiones simples cuando el chart marca 3X", () => {
    const parsed = parseMusicXmlStandard(XML_WITH_THREE_PASSES, {
      id: "tag",
      title: "Tag",
    });

    expect(parsed.form).toBe("Coda (1ª vuelta / 2ª vuelta / 3ª vuelta) · Final · 7 compases");
    expect(parsed.realForm.sections.map((section) => section.label)).toEqual([
      "Coda · 1ª vuelta",
      "Coda · 2ª vuelta",
      "Coda · 3ª vuelta",
      "Final",
    ]);
    expect(parsed.realForm.sections[0].measures[0].chordEvents[0]).toEqual({
      display: "F#-7b5",
      load: "F#m7b5",
    });
    expect(parsed.realForm.sections[2].measures[1].chordEvents[0]).toEqual({
      display: "Ebo",
      load: "Ebdim7",
    });
  });

  test("preserva literalmente los eventos del MusicXML cuando el compás incluye slash chords explícitos", () => {
    const parsed = parseMusicXmlStandard(XML_WITH_REDUNDANT_SLASH_TRANSITION, {
      id: "slash-transition",
      title: "Slash Transition",
    });

    expect(parsed.realForm.sections[0].measures[0].chordEvents.map((event) => event.display)).toEqual([
      "A-7",
      "D7",
      "D7/C",
    ]);
    expect(parsed.realForm.sections[0].measures[1].chordEvents.map((event) => event.display)).toEqual([
      "C-7",
      "C-7/Bb",
    ]);
  });

  test("mantiene visibles las vueltas distintas del A en el santa real", async () => {
    const raw = await readFile(new URL("../musicxml/santa-claus-is-coming-rev.musicxml", import.meta.url), "utf8");
    const parsed = parseMusicXmlStandard(raw, {
      id: "santa-claus-is-coming-to-town",
      title: "Santa Claus Is Coming To Town",
    });

    expect(parsed.form).toBe("A (1ª vuelta / 2ª vuelta) · B · A · Coda (1ª vuelta / 2ª vuelta / 3ª vuelta) · Coda · Final · 40 compases");
    expect(parsed.realForm.sections.map((section) => section.label)).toEqual([
      "A · 1ª vuelta",
      "A · 2ª vuelta",
      "B",
      "A",
      "Coda · 1ª vuelta",
      "Coda · 2ª vuelta",
      "Coda · 3ª vuelta",
      "Coda",
      "Final",
    ]);
    expect(parsed.realForm.sections[0].measures.map((measure) => measure.bar)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(parsed.realForm.sections[1].measures.map((measure) => measure.bar)).toEqual([1, 2, 3, 4, 5, 6, 9, 10]);
    expect(parsed.realForm.sections[2].measures[4].chordEvents.map((event) => event.display)).toEqual([
      "A-7",
      "D7",
      "D7/C",
    ]);
  });
});
