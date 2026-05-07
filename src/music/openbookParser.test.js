import { describe, expect, test } from "vitest";
import { chooseOpenbookChordPart, parseOpenbookStandard } from "./openbookParser.js";

describe("openbookParser", () => {
  test("prefiere el bloque fake cuando el real lleva repeticiones más complejas", () => {
    const raw = `
% if part=='ChordsReal':
\\chordmode {
  \\repeat volta 2 {
    c1:maj7 | d:m7 | g:7 | c:maj7 |
  }
}
% endif
% if part=='ChordsFake':
\\chordmode {
  c1:maj7 | d:m7 | g:7 | c:maj7 |
}
% endif
`;

    const selected = chooseOpenbookChordPart(raw);
    expect(selected?.partName).toBe("ChordsFake");
  });

  test("convierte un bloque tipo All Of Me a compases y marcas de repetición", () => {
    const raw = `
<%
attributes['title']='All Of Me'
attributes['composer']='Seymour Simons, Gerald Marks'
attributes['copyright']='1931 Bourne Co. Copyright Renewed'
attributes['structure']='AB'
%>
% if part=='ChordsReal':
\\chordmode {
  \\myMark "A"
  \\startPart
  c1*2:maj7 | e:7 |
  a:7 | d:m |
  e:7 | a:m |
  d:7 | d1:m7 | g:7 |
  \\endPart
}
% endif
% if part=='VoiceReal':
{
  \\key c \\major
}
% endif
`;

    const parsed = parseOpenbookStandard(raw, { id: "all-of-me", titleFallback: "All Of Me" });

    expect(parsed.title).toBe("All Of Me");
    expect(parsed.composers).toEqual(["Seymour Simons", "Gerald Marks"]);
    expect(parsed.defaultKey).toBe("C");
    expect(parsed.realForm.sections).toHaveLength(1);
    expect(parsed.realForm.sections[0].label).toBe("A");
    expect(parsed.realForm.sections[0].bars).toBe("1-10");
    expect(parsed.realForm.sections[0].measures[0].chords).toEqual(["CΔ7"]);
    expect(parsed.realForm.sections[0].measures[1].repeat).toBe(true);
    expect(parsed.realForm.sections[0].measures[3].chords).toEqual(["A7"]);
    expect(parsed.realForm.sections[0].measures[4].chords).toEqual(["D-"]);
    expect(parsed.realForm.sections[0].measures[9].chords).toEqual(["G7"]);
    expect(parsed.phrases).toHaveLength(3);
    expect(parsed.phrases[0].bars).toBe("1-4");
  });

  test("mantiene compases partidos y simplifica alteraciones para la carga interna", () => {
    const raw = `
<%
attributes['title']='There Will Never Be Another You'
attributes['structure']='AB'
%>
% if part=='ChordsReal':
\\chordmode {
  \\myMark "B"
  \\startPart
  aes:maj7 | f2:m7.5- bes:7 | ees1:maj7 | g2:m7 c:7 |
  ees:maj7 d:7 | g:7 c:7 | f:m7 bes:7 | ees:maj7 |
  \\endPart
}
% endif
`;

    const parsed = parseOpenbookStandard(raw, { id: "there-will-never-be-another-you" });
    const section = parsed.realForm.sections[0];

    expect(section.measures[1].chords).toEqual(["F-7b5", "Bb7"]);
    expect(section.measures[1].chordEvents.map((event) => event.load)).toEqual(["Fm7b5", "Bb7"]);
    expect(section.measures[4].chords).toEqual(["EbΔ7", "D7"]);
  });
});
