import { describe, expect, test } from "vitest";
import { parseJJazzLabStandard } from "./jjazzlabParser.js";

describe("jjazzlabParser", () => {
  test("convierte un chart JJazzLab a secciones, compases y frases de estudio", () => {
    const raw = `
<Song resolves-to="SongSP" spName="all-of-me" spTempo="142">
  <spChordLeadSheet class="ChordLeadSheetImpl" resolves-to="ChordLeadSheetImplSP">
    <spItems>
      <CLI__SectionImpl resolves-to="CLI_SectionImplSP" spName="A" spTs="FOUR_FOUR" spBarIndex="0" />
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="CM7" spOriginalName="CM7" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[0:0]"/>
      </CLI__ChordSymbolImpl>
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="CM7" spOriginalName="CM7" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[1:0]"/>
      </CLI__ChordSymbolImpl>
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="Dm7" spOriginalName="Dm7" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[2:0]"/>
      </CLI__ChordSymbolImpl>
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="G7" spOriginalName="G7" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[2:2]"/>
      </CLI__ChordSymbolImpl>
      <CLI__SectionImpl resolves-to="CLI_SectionImplSP" spName="B" spTs="FOUR_FOUR" spBarIndex="3" />
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="CM7" spOriginalName="CM7" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[3:0]"/>
      </CLI__ChordSymbolImpl>
    </spItems>
  </spChordLeadSheet>
</Song>
`;

    const parsed = parseJJazzLabStandard(raw, { id: "all-of-me", titleFallback: "All Of Me" });

    expect(parsed.title).toBe("All Of Me");
    expect(parsed.form).toBe("AB · 4 compases");
    expect(parsed.realForm.sections).toHaveLength(2);
    expect(parsed.realForm.sections[0].bars).toBe("1-3");
    expect(parsed.realForm.sections[0].measures[0].chords).toEqual(["CΔ7"]);
    expect(parsed.realForm.sections[0].measures[1].repeat).toBe(true);
    expect(parsed.realForm.sections[0].measures[2].chords).toEqual(["D-7", "G7"]);
    expect(parsed.phrases).toHaveLength(2);
    expect(parsed.phrases[0].bars).toBe("1-3");
  });

  test("mantiene la grafía visible y simplifica la carga interna en tensiones, slash y acordes no soportados", () => {
    const raw = `
<Song resolves-to="SongSP" spName="changes" spTempo="142">
  <spChordLeadSheet class="ChordLeadSheetImpl" resolves-to="ChordLeadSheetImplSP">
    <spItems>
      <CLI__SectionImpl resolves-to="CLI_SectionImplSP" spName="A" spTs="FOUR_FOUR" spBarIndex="0" />
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="BbM7/D" spOriginalName="BbM7/D" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[0:0]"/>
      </CLI__ChordSymbolImpl>
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="G7b9" spOriginalName="G7b9" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[1:0]"/>
      </CLI__ChordSymbolImpl>
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="Cm7M" spOriginalName="Cm7M" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[2:0]"/>
      </CLI__ChordSymbolImpl>
      <CLI__ChordSymbolImpl resolves-to="CLI_ChordSymbolSP">
        <spChord resolves-to="ExtChordSymbolSP" spName="Fdim" spOriginalName="Fdim" />
        <spPos resolves-to="PositionSP" spVERSION="2" spPos="[3:0]"/>
      </CLI__ChordSymbolImpl>
    </spItems>
  </spChordLeadSheet>
</Song>
`;

    const section = parseJJazzLabStandard(raw, { id: "changes" }).realForm.sections[0];

    expect(section.measures[0].chordEvents[0]).toEqual({
      display: "BbΔ7/D",
      load: "Bbmaj7",
    });
    expect(section.measures[1].chordEvents[0]).toEqual({
      display: "G7b9",
      load: "G7",
    });
    expect(section.measures[2].chordEvents[0]).toEqual({
      display: "C-Δ7",
      load: "Cm",
    });
    expect(section.measures[3].chordEvents[0]).toEqual({
      display: "Fo",
      load: "Fdim7",
    });
  });
});
