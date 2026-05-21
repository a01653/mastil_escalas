# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (output to dist/)
npm run preview    # Preview production build
npm run lint       # ESLint
npm run test       # Run all Vitest tests (no watch)
npm run test:e2e              # Run Playwright E2E tests
npm run test:e2e:chord-matrix # Run slow/parametric chord matrix E2E tests on demand
npm run audit:chords          # Audit chord detection / naming regressions
npm run audit:copy-readings   # Audit Investigar en mástil → Copiar en Acorde flow
npm run audit:chord-ui-matrix # Audit chord builder UI/state/voicing consistency matrix
```

Run a single test file:
```bash
npx vitest run src/music/standardsCatalog.test.js
```

### Launching the preview server

Always use the Bash tool with `run_in_background: true`:
```bash
npm run preview
```
Then read the output file to obtain the URL (it will say `Local: http://localhost:XXXX/mastil_escalas/`).
Do NOT use shell-specific constructs like `&`, `Start-Process`, or PowerShell cmdlets to launch the preview — they cause exit 127 or spawn failures in the sandbox environment.

## Architecture

**Mástil Escalas** is a single-page React app (Spanish UI) for interactive guitar fretboard study: scales, chord voicings, jazz standards, and scale patterns (CAGED, 3NPS, pentatonic boxes).

### App structure

`src/App.jsx` is a single monolithic component (~475 KB). It imports everything from `src/music/` and renders the full UI. The file has an internal index comment at the top (~line 248) listing its 8 logical sections.

Six sections drive navigation (web panel tabs / mobile bottom nav):
- `scale` — fretboard scale display with root/3rd/5th highlighting
- `patterns` — 3NPS, CAGED, and pentatonic box patterns
- `route` — musical route through the scale (ordered by pitch, restricted to patterns)
- `chords` — chord builder with voicing generation and investigation mode
- `nearChords` — up to 4 chord slots searched within a fret window, sorted by proximity
- `standards` — jazz standards chord charts with measure-by-measure chord loading

### Music modules (`src/music/`)

| File | Responsibility |
|------|----------------|
| `appStaticData.js` | UI constants, fretboard layout dimensions, scale/chord presets, info text strings |
| `appMusicBasics.js` | Core music theory: pitch classes, interval spelling, scale construction, chord naming |
| `appVoicingStudyCore.js` | Voicing generation (triads, tetrads, drop forms, quartal), study mode analysis, dominant/substitution info |
| `appPatternRouteStaffCore.jsx` | 3NPS patterns, CAGED shapes, pentatonic boxes, musical route computation, SVG staff rendering, PDF export helpers |
| `chordDetectionEngine.js` | Detects chord readings from a set of selected pitches; also exports `noteNameToPc` and `preferSharpsFromMajorTonicPc` used by other modules |
| `standardsCatalog.js` | Parses chord symbols (`Bb6`, `F7`, etc.) into internal slot objects; parses standard chart sections/measures |
| `jjazzlabCatalog.js` | Lazy-loads JJazzLab JSON standards via `import.meta.glob`; caches promises |
| `jjazzlabParser.js` | Converts raw JJazzLab JSON format to internal chart structure |
| `musicXmlParser.js` | Parses MusicXML files from `src/musicxml/` |
| `chordDbCatalog.js` | Maps pitch class → chord DB folder key name |
| `studyRelativeChord.js` | Describes relative tertian chords for study mode |

### Data

- `src/standards-jjazzlab/*.json` — Hundreds of jazz standards in JJazzLab-derived JSON format, lazy-loaded per standard
- `src/music/jjazzlabStandardsIndex.json` — Index of all JJazzLab standards (lazy-loaded as its own chunk)
- `src/musicxml/*.musicxml` — MusicXML files for standards
- `src/music/standardsData.json` — Curated pedagogical standards with phrase/section structure

### Build chunking (vite.config.js)

The Vite build splits output into: `react-vendor`, `icons` (lucide-react), `music-core` (all `src/music/` files), and `standards-index`. JJazzLab standard JSON files are each split into their own chunk via `import.meta.glob` lazy loading.

### Pitch class conventions

Pitches are represented as integers 0–11 (C=0). Enharmonic spelling is tracked with a `preferSharps: boolean` field alongside the pitch class. The `chordDetectionEngine.js` module is the lowest-level pure module; other modules import from it but it does not import from other app modules.

## Development workflow

- Make all changes locally first.
- Before considering a delivery done, validate locally: run `npm run build`.
- Before running `npm run preview`, increment `APP_VERSION` in `src/App.jsx` so the version shown locally already reflects the change.
- At the start of each session, if a local preview hasn't been launched yet in this workspace, run the full build + preview flow once automatically even if the user hasn't asked.
- Do not change `APP_VERSION` between the local `preview` and publication — if the user asks to publish, reuse the same number.

## Mandatory validation after any code change

After any code change, especially in `src/App.jsx`, `src/music/chordDetectionEngine.js`, or any file related to chords, scales, notes, intervals, or musical UI, run:

```bash
npm test
npm run build
```

If the change affects formatting, imports, or general structure, also run:

```bash
npm run lint
```

E2E validation

If the change affects any UI flow or visual state, run:
```bash
npm run test:e2e
```

This is mandatory for changes involving:

src/App.jsx
chord builder UI
"Investigar en mástil"
"Copiar en Acorde"
"Modo estudio"
chord chips
chord names
fretboard note rendering
checkboxes for extensions or omissions
selects for tone, quality, structure, form, inversion, distance
mobile/desktop layout behavior

Manual preview does not replace E2E tests.

Musical audits

If the change affects chord detection, naming, ranking, omissions, extensions, voicings, fret-pattern analysis, or copying detected readings into the chord builder, run:

```bash
npm run audit:chords
npm run audit:copy-readings
```

If the change affects the chord builder UI, voicing generation, inversion selector, form/structure/distance filters, extension/omit checkboxes, chord chips, bass label, title naming, insufficient-note messages, or formula-vs-voicing consistency, also run:

```bash
npm run audit:chord-ui-matrix
```

Expected result for `audit:chord-ui-matrix`: 0 FAIL and 0 WARN, unless the user explicitly accepts a documented limitation.

The matrix audit must catch at least:

- FORMULA_VOICING_MISMATCH
- OMIT_NOT_PRESERVED
- TITLE_STATE_MISMATCH
- INSUFFICIENT_NOTES_MESSAGE_MISMATCH
- INVERSION_LABEL_MISMATCH
- BASS_REAL_MISMATCH
- FUNCTIONAL_LABEL_MISMATCH
- CHECKBOX_CHIP_MISMATCH

The copy-readings audit must distinguish between:

physical fret patterns, such as 1x22x3
direct note sets, such as ["D","F","A","E"]

If a test case declares a fret pattern, notes must be derived from the same analysis core used by scripts/analyzeFrets.mjs.

Do not replace a physical pattern with hardcoded notes unless the case is explicitly marked as a note-set test.

Slow chord matrix E2E

If the change deeply affects Acordes, inversions, omissions, extensions, chord chips, title naming, real bass, or copying readings, run:

```bash
npm run test:e2e:chord-matrix
```

This does not replace `npm run test:e2e`; it complements it.

Regression tests

When fixing a bug:

Add or update a test that fails before the fix and passes after it.
For UI/state bugs, add or update a Playwright E2E test.
For music logic bugs, add or update unit tests.
For detection/copy/naming bugs, add or update the relevant audit case.

Do not claim a bug is fixed only because the app works manually.

Preview

If the change affects the interface, run:
```bash
npm run preview
```

Use the Bash tool with run_in_background: true.

Do not use shell-specific constructs like &, Start-Process, or PowerShell cmdlets.

Read the preview output and report the URL.

Manual preview is useful for confirmation, but it does not replace:
```bash
npm run test:e2e
```



Work is not done if any of these commands fail.

Recommended validation flow

General changes:

```bash
npm test
npm run build
```

Music/chord/detection/naming/voicing changes:

```bash
npm run audit:chord-ui-matrix
npm run audit:copy-readings
npm run audit:chords
npm test
npm run build
npm run test:e2e
```

Deep chord builder changes (Acordes, inversions, omit, extensions, chips, title, real bass, copy readings):

```bash
npm run audit:chord-ui-matrix
npm run audit:copy-readings
npm run audit:chords
npm run audit:study
npm test
npm run build
npm run test:e2e
npm run test:e2e:chord-matrix
```

`npm run audit:chords -- --no-cache` is reserved for deeper chord-detection or physical-voicing changes because it can be slower.

If the change affects chord detection, chord naming, ranking, or visual legend:
1. Add or update tests before validating.
2. Run `npm test`.
3. Run `npm run build`.
4. Review visually in preview: `npm run preview`.

At the end of each delivery, report: which files were modified, which tests were added or changed, result of `npm test`, result of `npm run build`, result of `npm run test:e2e` when applicable, result of `npm run test:e2e:chord-matrix` when applicable, result of `npm run audit:chords` when applicable, result of `npm run audit:copy-readings` when applicable, result of `npm run audit:chord-ui-matrix` when applicable, whether `npm run lint` and `npm run preview` were run, the preview URL if active, any open preview/shells, and the updated `APP_VERSION`.

## Publication

- Never commit, tag, or push automatically after finishing a change.
- Only publish when the user asks explicitly with an order like "súbelo", "publícalo", "haz el push", or equivalent.
- When such an explicit order is given, treat it as full authorization to execute the entire publication flow without further confirmations: update version files, `git add`, create the commit, create the annotated tag, and push `main` and the tag.

### Version files to update when publishing

- `src/App.jsx` → `APP_VERSION`
- `package.json` → `version`
- `package-lock.json` → `version`

Version format: `2.93`, `2.94`, `2.95`, … Reuse the version already shown in the local preview; do not increment again.

### Commit and tag format

```
vX.XX - <short summary>
```

Annotated tag: `vX.XX`. Then push `main` and the tag.

## Priority order

1. Musical correctness
2. Consistency with the app's internal logic
3. Clarity for the user
4. Visual and functional consistency
5. Technical simplicity
6. Literal user preference, if it conflicts with any of the above

## Critical thinking and musical validation

Every change to this project must make musical sense, be functionally coherent within the app, and be consistent with the existing style — not just technically work.

Before implementing any change related to chords, scales, intervals, harmonization, fingerings, inversions, voicings, quartal structures, guide tones, tensions, or nomenclature:

- Verify the proposal is musically correct.
- Verify the nomenclature is consistent with the theory used elsewhere in the app.
- Verify the result will be understandable to a guitarist, not just technically possible.
- Verify the logic fits how other concepts are already displayed in the app.
- If there are several valid musical interpretations, state which one you'll use and why.
- If the user's proposal is theoretically dubious or incorrect, stop and warn before touching code.

**Do not implement directly** if any of these apply:
- The request contradicts basic music theory or the internal logic already used in the app.
- The requested name for an option could cause musical confusion.
- The solution fixes one case but breaks others.
- There is real ambiguity about the expected behavior.
- The implementation is technically possible but musically, pedagogically, or UX-wise wrong.
- The user is asking for something theoretically incorrect or confusing.

In those cases, explain the problem first, then propose 1 or 2 reasonable alternatives.

### Response format for changes affecting musical or functional logic

When a request affects music theory, nomenclature, visualization, UX, or core behavior, respond in this order:

1. What you understand is being asked.
2. What musical, conceptual, or consistency problem you detect, if any.
3. What option you recommend and why.
4. Only then, the concrete code changes.

### Consistency with the existing app

Before implementing any change:
- Check how the concept is already handled in the app.
- Keep consistency with nomenclature, visual structure, states, help texts, combos, and user flow.
- Avoid introducing a local solution that contradicts other areas of the page.
- Prioritize global consistency over solving only the specific case.
- If the requested change breaks existing patterns, say so and propose a more coherent alternative.

### Prohibitions

- Do not be compliant.
- Do not hide real doubts.
- Do not say something is correct if it isn't.
- Do not implement something musically incorrect without warning first.
- Do not force a technical solution that leaves an inconsistent UX.
- Do not present a convention as correct when it is really just an approximation.
- Do not change the global logic of the app to resolve an isolated case without explaining it.
- Do not close an important discussion with an overly confident answer if there are reasonable doubts.
