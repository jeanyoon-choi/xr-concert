# Part 4

The concert's part 4. Code: `components/part4/<version>/`. Song: ROSÉ, “toxic till the end”.

Like the parametric-interface archive it is standalone: no socket events, relay or server state. Phones on one page share one clock.

## v0 (2026-11-17)

A rebuild of the phones of [parametric-interface v4](../parametric-interface/v4.md) as the base for part 4's iterations. What each phone app shows, and when, is v4's and is described there. v0 changes how the code is organised and how everything is sized.

### Routes

| Route | What it is |
| --- | --- |
| `/part4` | Navigation index |
| `/part4/v0`, `/part4/v0/phones` | The phones: 1–24 (`?phones=`, default 12), 29 text interfaces, moving between apps together by lyric passage. v4's `3_mobiles`. |

Not carried over:
- v4's `1_mobiles` and `2_mobiles`, the two earlier copies that `3_mobiles` superseded. They remain at `/parametric-interface/v4/1` and `/2`.
- v4's browser windows (`tabs` → `tab`) and the eight desktop interfaces they show. They were ported and then removed on the user's direction (2026-11-17), and remain at `/parametric-interface/v4/tabs`.

### Layout

| Directory | Role |
| --- | --- |
| `song/` | The song, its timed words, and `sungLines` (the arrived lines, the last growing as typed). |
| `clock/` | `AudioSongClock` owns the one `<audio>`; `PlayOverlay` is the start button; `wall-clock.ts` maps song time to the real time of day the phones show. |
| `timeline/` | `useLyricCue` (the lyric at the clock, empty before the first word), `useSungLines`. |
| `surface/` | The sizing rule (below). |
| `phones/` | Page, grid, phone frame, `score.ts` (passages, moves, lock lines), `states.ts`, `apps/<state>/`. |

Each version directory owns all of its code and its assets (`public/part4/v0/`). The song's audio stays at `/audio/mp3/`.

### Sizing: surfaces

Every interface is drawn once, at design points, and shown at the width it is given.

- **Desktop**: `DesktopSurface` is a sheet 1440 points wide (`DESKTOP_WIDTH`) whose height follows the shape of the box it fills. The phones page's field is one.
- **Phone**: `PhoneSurface` is the 404 × 858 iOS frame (glass 390 × 844) at the width its seat gives it.
- The sheet is scaled as one unit with CSS `zoom`, not a transform, so text rasterises at the shown size.
- Inside a surface, `1px` is one design point and `100cqw` / `100cqh` are the sheet. Nothing below a surface uses `vw`/`vh`, `position: fixed`, a width media query or `window.innerWidth`. Code that needs the sheet's size reads `useSurface()`.

- Page chrome is not an interface. The options control and the play button sit outside the surface in real pixels (16 px text, 44 px targets) and are the same size in any window.

To add an interface, draw it at 1440 points (desktop) or 390 × 844 (phone) with plain `px`, and it is responsive.

### Checked (2026-11-17, headless Chrome 157 against the dev server)

- The phone grid matches v4 at 1440 × 900, 1000 × 700 and 1920 × 1080, in the verses and on a lock line. The options control and play button keep v4's fixed size.
- Playing through a passage move and a lock line in the dev build: 12 phones 58.6 fps (v4 57.4), 24 phones 55.9 fps (v4 55.6). The grid no longer re-renders every frame; a phone re-renders when a character is typed, as before.

### Unresolved

- The scaling relies on text below about 10 real pixels staying legible and unclamped. A browser with a minimum font size set (Chrome's default in some locales) will enlarge small text inside small phones.
- Most main-thread time while playing is every app re-rendering its whole thread for each typed character. Memoising past lines per app would cut it; it was left because it touches all 29 apps.
- v4's unresolved questions stand.
