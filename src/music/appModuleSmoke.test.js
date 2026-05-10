import { describe, expect, test } from "vitest";

import * as AppStaticData from "./appStaticData.js";
import * as AppMusicBasics from "./appMusicBasics.js";
import * as AppVoicingStudyCore from "./appVoicingStudyCore.js";
import * as AppPatternRouteStaffCore from "./appPatternRouteStaffCore.jsx";

describe("app module smoke", () => {
  test("exports the mobile swipe ratio used by App", () => {
    expect(AppStaticData.MOBILE_SECTION_SWIPE_COMMIT_RATIO).toBe(0.5);
  });

  test("loads the shared music modules without import-cycle regressions", () => {
    expect(Array.isArray(AppMusicBasics.CHORD_FORMS)).toBe(true);
    expect(Array.isArray(AppMusicBasics.ROMAN_DEGREES)).toBe(true);
    expect(typeof AppVoicingStudyCore.positionFormLabel).toBe("function");
  });

  test("keeps token parsing compatible with comma-separated inputs", () => {
    expect(AppMusicBasics.parseTokensToIntervals({ input: "1, b3, 5, 6", rootPc: 0 })).toEqual([0, 3, 7, 9]);
  });

  test("formats staff pitch accidentals and escapes html safely", () => {
    expect(AppPatternRouteStaffCore.spelledPitchFromNameAndMidi("F#", 66)).toMatchObject({
      letter: "F",
      accidental: "\u266F",
    });
    expect(AppPatternRouteStaffCore.escapeHtml(`A&B<"'>`)).toBe("A&amp;B&lt;&quot;&#39;&gt;");
  });
});
