# Parametric Interface archive

A standalone import of the SCC `parametric-interface` archive, now organised by song version. It is intentionally separate from the concert’s realtime experiment registry: it has no mobile, screen, admin, or relay role yet.

## Routes

| Route | Variation |
| --- | --- |
| `/parametric-interface` | Shared experiment navigation (date/group views, search) |
| `/parametric-interface/v0` | U2 — “You’re the Best Thing About Me” cycling through interfaces 1–6 (formerly `/whole`, then `/v1`) |
| `/parametric-interface/v0/1`–`/6` | Standalone interface studies for v0 (formerly `/1`–`/6`, then `/v1/1`–`/6`) |
| `/parametric-interface/v1` | Frozen copy of v2 as it stood on 2026-11-03, before the newspaper rework: ROSÉ cycling through 7–8, then 3, 4, 5, 6, 1, 2 |
| `/parametric-interface/v1/1`–`/8` | The same studies as v2/1–/8 at that date (v1-owned copies) |
| `/parametric-interface/v2` | ROSÉ — “toxic till the end” cycling through interface 9, then 7–8, 3, 4, 5, 6, 1, 2. v2 is the version being reworked |
| `/parametric-interface/v2/1`–`/6` | v0’s interfaces running on the ROSÉ song (v2-owned copies) |
| `/parametric-interface/v2/7`–`/9` | ROSÉ-specific studies (below) |
| `/parametric-interface/v3` | ROSÉ — interfaces placed inside 3D scenes |
| `/parametric-interface/v3/1` | `1_airport`: the v2/4 departures display on a TV in a departures hall (below) |
| `/parametric-interface/v3/2` | `2_street`: an Euljiro back alley whose projecting signs all show the sung word (below) |
| `/parametric-interface/v4` | ROSÉ — one compositional state: six browser windows and six phones, each taking the sung line into its own interface ([v4](./v4.md)) |
| `/parametric-interface/v4/mobiles` | Phone grid: Messages, an assistant chat or the lock screen per seat, as the score assigns ([v4](./v4.md)) |
| `/parametric-interface/v4/tabs` → `/v4/tab` | Controller that opens real browser windows (search, news, street poster), each following the song ([v4](./v4.md)) |

The former `/7` lecture-note study was removed. Legacy `/whole` and `/1`–`/6` redirect (308) to their `v0` equivalents. On 2026-11-03 the U2 version was renamed `v1` → `v0`, and the ROSÉ v2 was copied to `v1` so that v2 can change; old `/v1` links now open the ROSÉ copy.

Page titles lead with the version path (`v2/9 · parametric-interface · NRF XR Concert`) so open tabs read their version first. `v4/tab` still sets its own live title.

## v2 studies 7–8 (2026-10-27)

The inherited interfaces 1–6 are office and information systems; they suit U2’s plain address but not ROSÉ’s subject — possession, surveillance, manipulation, and not being let go. Each new study chooses a host interface whose own grammar already performs that relation, and places the lyric only in that host’s ordinary semantic slots (no overlays, captions, or badges). Every state derives from the audio clock, so backward seeks rebuild the same screen. 3D is used only where the reference itself is spatial, with CSS 3D transforms (no WebGL dependency).

| Route | Host interface | Lyric slot and relation | Removal test |
| --- | --- | --- | --- |
| `v2/7` | macOS Messages, light | Each word arrives at its onset as its own incoming bubble from “Daniel” — double texting — with the typing indicator between words and his sidebar preview showing the latest word. One timestamp precedes the lyric; runs are separated by iMessage’s tail-and-gap grouping. | Without lyric bubbles: an ordinary Messages window ending on her “Read” receipt. |
| `v2/8` | macOS Find My, People, 3D map (2D sidebar and labels) | Cue words become place labels along a seeded route; Daniel’s pin reaches each place at its word onset and the sidebar reads “Near <word> · Now”. The camera leans toward the pin and pans ahead to the next route during a cue’s last word. 3D is earned by Find My’s own tilted city view. | Without lyric places: a contact moving on an ordinary 3D map. |

Observed in the browser at 1470 × 703 (2026-10-27): both render at full viewport; `v2/8` holds 60 fps with ~470 CSS-3D faces. Corrections during review: per-cue timestamps removed from `v2/7` (Messages only stamps after long silences); `v2/8` camera made to follow the pin and pan ahead of cue changes. Find My was first built as `v2/9` and renumbered to `v2/8` after the failures below were removed.

Unresolved: whether the CSS-3D map holds frame rate on the venue machine; whether a single fictional contact name is the right cast.

## v2/9: newspaper front page (2026-11-03)

The first step of the v2 rework. The host is a broadsheet front page in the grammar of The New York Times: masthead with its two ears, volume/date/price folio between rules, six justified columns with hairline column rules, and stories that jump inside (“Continued on Page A16”). There are no photographs. The masthead is set in Times New Roman because no blackletter face is installed locally.

- **Lyric slot.** Only the headlines. The line being sung is the banner across columns 1–4, set word by word at each onset (unsung words keep their space but are hidden, so the banner never reflows). The banner size comes from the line's length (`clamp(3.4cqw, 230cqw / chars, 6.2cqw)`), so short lines run larger. Each earlier line moves down one headline slot: banner → second story → the right-hand column's lead → three briefs. A slot keeps its own headline until a line reaches it. Lyric headlines take the paper's headline case (minor words lowercase).
- **Unchanged.** Bodies, bylines, datelines and jumps stay the page's own invented city news, kept neutral so no headline puns on the song (see the failure record).
- **Clock.** Every slot comes from `cueIndex` and the audio clock, so seeking backward rebuilds the same page.
- **Removal test.** Without the lyric: an ordinary front page with six stories.

Not yet observed in a browser.

## v3: interfaces inside 3D scenes (2026-11-03)

Direction from the NOTES doc, tab “1031_NRF XR Idea”: put the existing parametric interface inside a 3D scene (“공항 전광판 … 아래 사람들”), with Pop / parametric interface / a bit of Andreas Gursky. Interface folders in this series are named by number and place (`1_airport`, `2_street`); routes stay numeric.

**`1_airport` (`/v3/1`).**
- **Interface unchanged.** `1_airport/screen` is a copy of `v2/4`; its only edit is that `.stage` fills its mount instead of the viewport. React renders it through a portal into a 1440 × 810 element (the size the 2D study is usually seen at) that three.js `CSS3DRenderer` places on the TV, so the lyric stays in the destination slots and the type keeps its proportions.
- **Scene.** A plain 87-inch TV on a slim floor stand, 2.5 m from a camera fixed at eye height (1.58 m). Behind it: a departures hall with stone columns, beam seating, a coffered ceiling with linear luminaires, a full-height airside curtain wall and a parked widebody beyond, and terrazzo with a soft partial reflection. Three stacked layers share one camera: hall (WebGL), live display (CSS3D), TV housing (WebGL, cut open where the display shows). The scene is drawn only on resize; only the DOM display changes.

**`2_street` (`/v3/2`).** An Euljiro back alley (not a Daechi-dong main road) at blue hour, from a fixed eye-level camera: three- to six-storey buildings in paint, tile, brick and stone with aluminium windows, grilles, blinds and vinyl lettering; roll shutters and lit shop rooms; fascia signs; air-conditioner units, gas risers, utility poles and slung wires; print stock, beer crates and hand carts. Sign drawing follows the grammar of the experiments-jyc `daechi/1` street (canvas-drawn faces, invented names, Korean sign palettes).
- **Lyric slot.** The shop name on the projecting lightboxes. While the song plays, every lightbox takes the sung word at once; trade lines, phone numbers and palettes stay the shops’ own, and the fascias along the walls keep their names. Before playback the lightboxes show their own names. (First built as one word per sign, nearest first, like the departures display; changed because the far signs were too small to read, so the line was never seen whole.)
- **Performance.** All lightbox faces share one canvas atlas (resolution falling off with distance) and one merged mesh; each name change redraws only the names over cached sign bases and uploads once. Every other surface that shares a material is merged per material, matte surfaces use Lambert, and only 13 point lights remain. Measured headless at 1600 × 900, DPR 2: 81 draw calls, about 15 k triangles, under 2 ms per render.
- The scene is redrawn only when a sign changes or the frame resizes.

**Corrections during review (2026-11-03).** The first `1_airport` hung a 19 m board high on a wall and looked down on it from 46 m with a slow dolly. The user rejected it: a departures screen is met at human height, the camera must stand at human height, and the display must not move. Lens blur on the hall and a camera sway were also tried and removed (a Gursky still is sharp throughout and static), as was a “Departures 출발” totem header (read as provincial; the TV is now plain).

**Open: people.** Procedural figures (instanced capsules, then articulated lathe bodies) read as toys at eye level. The three.js example rigs were tried next: `Soldier.glb` is an armoured sci-fi figure, and retargeting its Walk and Idle clips onto `Michelle.glb` (the only plausible traveller) failed to give a correct pose in three attempts. Even working, one cloned figure would not make a crowd. `1_airport` currently has no people. A credible crowd needs several distinct scanned or Mixamo characters, each with its own in-place walk and idle clips.

## Failure record

**2026-10-27, three ROSÉ studies (removed).** Built alongside 7 and 8 as `v2/8` membership-cancellation flow (exit-survey answers as the lyric, steps looping 1→2→3→1), `v2/10` 3D blitz chess (each word a legal move with the word as its PGN comment), and `v2/11` iPadOS lock-screen notification stack. All three rendered correctly and kept the lyric inside native slots, but the user rejected them as outside the work’s aesthetic. Recorded reading: each illustrated the song’s subject literally — a “manipulative” dark pattern, the lyric’s own chess image, “on the screen” as a lock screen — so the host became a pun on the lyric rather than a found interface whose ordinary coupling the lyric quietly displaces. The cancellation page and chess site also introduced invented brands, and the chess board’s spectacle competed with the lyric. Messages and Find My were kept: their grammar (double texting, read receipts, continuous location sharing) carries the relation without restating the words.

## Version independence

Each version lives in `components/parametric-interface/<version>/` and owns its entire code path: song model, playback, lyric timeline, interfaces, and whole cycle. A version imports nothing from a sibling version, so `v0/`, `v1/`, `v2/` or `v3/` can be deleted, moved, or rewritten without affecting the other. v2 began as a copy of v0 (then named v1) with only its song changed; the current v1 is a copy of v2 taken on 2026-11-03; its interfaces are expected to diverge. v3 began as a copy of v2’s song, playback and timeline; `three` is a package dependency, not shared version code.

Outside the version directories there is only:

- `components/parametric-interface/versions.ts` — a thin index of each version’s `version.ts` loaders, used by the catch-all route.
- `components/navigation/` — the shared experiment catalogue (also used by `/face-voronoi`), ported from the experiments-jyc SCC navigation. Dates and phrases live in `components/navigation/experiments.ts`.

## Audio and lyric timing

Each version’s `timeline/use-lyric-cue.ts` chooses the word for `currentTime + 120 ms` (`LYRIC_LEAD_MS`) to compensate for per-frame read and render delay, measured at roughly 50–300 ms behind the audio before the lead was added.

| Version | Audio (`public/audio/mp3/`) | Duration |
| --- | --- | --- |
| v0 | `U2_-_You_re_The_Best_Thing_About_Me_(SkySound7.com).mp3` | 225.776 s |
| v1, v2 | `toxic_till_the_end.mp3` | 155.832 s |

Word start times (v1 re-timed and v2 new, 2026-10-27) were produced by separating the vocal stem with demucs (`htdemucs`) and forced-aligning the lyric text three times (whisper `turbo`, `medium.en`, and a per-line windowed `turbo` pass). Each word uses the median of the three, with monotonic order enforced; where one pass lost sync, the two agreeing passes are averaged, and a handful of documented overrides correct words every aligner stretched across an instrumental or collapsed to zero length. The results were checked against LRCLIB line starts and an unguided transcription. Words that every aligner collapsed to zero length use the unguided transcription time. Re-run this procedure whenever the audio file changes; timings belong to that exact recording.

## Preserved invariants

- Interfaces 1–6 keep their individual interaction contracts, including macOS menus, Gmail selection, and song playback controls.
- The catch-all route resolves only registered version paths and returns a 404 for everything else.
- This archive does not register socket events, change concert state, or make a performance-readiness claim.
