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
| `/parametric-interface/v2` | ROSÉ — “toxic till the end” cycling through interfaces 9, 10, then 7–8, 3, 4, 5, 6, 1, 2. v2 is the version being reworked |
| `/parametric-interface/v2/1`–`/6` | v0’s interfaces running on the ROSÉ song (v2-owned copies) |
| `/parametric-interface/v2/7`–`/10` | ROSÉ-specific studies (below) |
| `/parametric-interface/v3` | ROSÉ — interfaces placed inside 3D scenes |
| `/parametric-interface/v3/1` | `1_airport`: the v2/4 departures display on a TV in a departures hall (below) |
| `/parametric-interface/v3/2` | `2_street`: an Euljiro back alley whose projecting signs all show the sung word (below) |
| `/parametric-interface/v3/3` | `3_daechi`: the experiments-jyc Daechi-dong street, its academy signs taking the sung line one word per sign (below) |
| `/parametric-interface/v4/1` | ROSÉ — a grid of phones: seventeen chat and social apps (KakaoTalk, WhatsApp, Instagram, X, TikTok, …), each taking the sung line ([v4](./v4.md)) |
| `/parametric-interface/v4`, `/v4/2` | Default: the phones of `/v4/1` moving between apps on their own at line ends, notifications from each app on the lock lines ([v4](./v4.md)) |
| `/parametric-interface/v4/tabs` → `/v4/tab` | Controller that opens real browser windows, each running one of v2's interfaces on its clock ([v4](./v4.md)) |

The former `/7` lecture-note study was removed. Legacy `/whole` and `/1`–`/6` redirect (308) to their `v0` equivalents. On 2026-11-03 the U2 version was renamed `v1` → `v0`, and the ROSÉ v2 was copied to `v1` so that v2 can change; old `/v1` links now open the ROSÉ copy.

Page titles lead with the version path (`v2/9 · parametric-interface · NRF XR Concert`) so open tabs read their version first. `v4/tab` still sets its own live title.

## v2 studies 7–8 (2026-10-27)

The inherited interfaces 1–6 are office and information systems; they suit U2’s plain address but not ROSÉ’s subject — possession, surveillance, manipulation, and not being let go. Each new study chooses a host interface whose own grammar already performs that relation, and places the lyric only in that host’s ordinary semantic slots (no overlays, captions, or badges). Every state derives from the audio clock, so backward seeks rebuild the same screen. 3D is used only where the reference itself is spatial, with CSS 3D transforms (no WebGL dependency).

| Route | Host interface | Lyric slot and relation | Removal test |
| --- | --- | --- | --- |
| `v2/7` | macOS Messages, light | Each word arrives at its onset as its own incoming bubble from “Daniel” — double texting — with the typing indicator between words and his sidebar preview showing the latest word. One timestamp precedes the lyric; runs are separated by iMessage’s tail-and-gap grouping. | Without lyric bubbles: an ordinary Messages window ending on her “Read” receipt. |
| `v2/8` | macOS Find My, People, 3D map (2D sidebar and labels) | Cue words become place labels along a seeded route; Daniel’s pin reaches each place at its word onset and the sidebar reads “Near <word> · Now”. The camera leans toward the pin and pans ahead to the next route during a cue’s last word. 3D is earned by Find My’s own tilted city view. | Without lyric places: a contact moving on an ordinary 3D map. |

**Replaced 2026-11-03.** On the user's direction, three studies were replaced with hyper-real clones of the real services, each measured in the browser, with lyrics added afterwards on instruction:
- `v2/7`: Slack, a fictional "Fieldwork" workspace at native 1:1 size. Each sung line is posted to #production at its onset by one member, words appearing as sung. Slack's own "… is typing" shows before the next line, and the DM unread badge counts the lines.
- `v2/8`: Google Maps, Midtown Manhattan, rendered with MapLibre from OpenFreeMap (OSM) vector tiles in Google's palette.
- `v2/9`: a single New York Times article page.
The Messages and Find My builds described above are history.

Observed in the browser at 1470 × 703 (2026-10-27): both render at full viewport; `v2/8` holds 60 fps with ~470 CSS-3D faces. Corrections during review: per-cue timestamps removed from `v2/7` (Messages only stamps after long silences); `v2/8` camera made to follow the pin and pan ahead of cue changes. Find My was first built as `v2/9` and renumbered to `v2/8` after the failures below were removed.

Unresolved: whether the CSS-3D map holds frame rate on the venue machine; whether a single fictional contact name is the right cast.

## v2/9: nytimes.com homepage (2026-11-03)

The first step of the v2 rework. The host is the current nytimes.com desktop homepage, rebuilt from values measured on the live page in the browser at a 1322 px viewport, then zoomed to fit the viewport as one fixed-format page.
- **Measured from the live page:** masthead wordmark SVG path (verified against the page by hash), search glyph, section chevron, the 1200 px grid (275 / 522 / 337 columns, 33 px gutters, hairline rules), every type size, weight, line height, tracking and colour.
- **Fonts:** the site's own woff2 files (`nyt-cheltenham` 300/400/700, `nyt-franklin` 500–800, `nyt-imperial` 400), kept in `public/fonts/nyt/`, which its own `.gitignore` keeps out of git. They are proprietary: this study is for private rehearsal only, and is not for deployment.
- **Photos:** Unsplash (free license) photos with no identifiable people, cropped to each slot in `public/images/parametric-v2-9/`. Unsplash ids: picture `photo-1700716465891-9e5e9f501d7d`, feature `photo-1729673284889-6156ca7d5eed`, tiles `photo-1632973541997-971a2eb8331d` and `photo-1476718406336-bb5a9690ee2a`, row `photo-1761700971222-7b044dcd9827` and `photo-1678666716714-e5f095f0ae4a`. Real people were avoided because they would sit under lyric headlines.
- **Hidden chrome:** the search glyph, edition links and Log in button are hidden. The top bar keeps its height, so the masthead stays where the site sets it.
- **Lyric slots:** every headline on the page is the line being sung, set word by word at each onset, all at once. Every summary is the line before it.
  - Headlines take the homepage's headline case; summaries keep sentence case. Both use typographic quotes.
  - Before the first sung word, each slot keeps its own copy.
  - An earlier version stepped one line down one slot at a time. The user rejected it because the titles did not all change with the lyric.
- **Unchanged:** read times and photos.
- **Clock:** every slot comes from the audio clock, so seeking rebuilds the same page.

Observed in the browser on 2026-11-03, next to nytimes.com at the same window size.
- The first trial, a print broadsheet on a cream background, was rejected as "not NYT". The user's rule: rebuild the service's actual online interface from its served assets, not an imitation.
- A later "LIVE" bar was removed because the reference page that day had none.

## v2/10: integrated plan chart (2026-11-03, fourth build)

The grammar of the 1989 Rockwell *Integrated Space Plan* poster (grammar only; no wording reused), organised the way the poster is, and filling the screen with nothing scrolling.
- **Time runs down the sheet.** The song clock is labelled as years in both margins. Every lyric line is an element at its own start time.
- **Lanes are program areas: the song's parts.** Each has a bold heading: VERSE PROGRAMS, PRE-CHORUS TRANSITION, CHORUS — CRITICAL PATH (the central spine, heavier double-ruled elements), BRIDGE, and LEXICON (every word at its first use, in the vehicle-list grammar).
- **Connections have a reason:**
  - Each line depends on the line before it.
  - A repeated line keeps its first lane, and its occurrences are tied along a dashed recurrence rail with a rotated label. Verse rails run in the left margin, so they never cross a statement.
- **Era statements:** one per section (a pre-chorus shares its chorus's). Each is set at its section's time, in the lanes that are empty while it plays. The ring is sized by that zone and time band, and the statement is fitted inside the ring.
- **Tables:** a section schedule and a line schedule fill the right column, as the poster's tables do.
- **As the song plays:**
  - The dependencies already sung become the heavy critical path, drawn beneath the elements.
  - The element being sung takes the heavy double rule, with its sung words bold.
  - The sung word is selected in the lexicon.

**Rejected builds (same day).**
1. A scrolling, sparse poster.
2. A uniform grid of repeated words.
3. A random dense packing with whole-line labels, random lines and circles. Rejected for having no visual hierarchy, no reason for the circles' positions, and no reason for any connection.

## v3: interfaces inside 3D scenes (2026-11-03)

Direction from the NOTES doc, tab “1031_NRF XR Idea”: put the existing parametric interface inside a 3D scene (“공항 전광판 … 아래 사람들”), with Pop / parametric interface / a bit of Andreas Gursky. Interface folders in this series are named by number and place (`1_airport`, `2_street`); routes stay numeric.

**`1_airport` (`/v3/1`).**
- **Interface unchanged.** `1_airport/screen` is a copy of `v2/4`; its only edit is that `.stage` fills its mount instead of the viewport. React renders it through a portal into a 1440 × 810 element (the size the 2D study is usually seen at) that three.js `CSS3DRenderer` places on the TV, so the lyric stays in the destination slots and the type keeps its proportions.
- **Scene.** A plain 87-inch TV on a slim floor stand, 2.5 m from a camera fixed at eye height (1.58 m). Behind it: a departures hall with stone columns, beam seating, a coffered ceiling with linear luminaires, a full-height airside curtain wall and a parked widebody beyond, and terrazzo with a soft partial reflection. Three stacked layers share one camera: hall (WebGL), live display (CSS3D), TV housing (WebGL, cut open where the display shows). The scene is drawn only on resize; only the DOM display changes.

**`2_street` (`/v3/2`).** An Euljiro back alley (not a Daechi-dong main road) at blue hour, from a fixed eye-level camera: three- to six-storey buildings in paint, tile, brick and stone with aluminium windows, grilles, blinds and vinyl lettering; roll shutters and lit shop rooms; fascia signs; air-conditioner units, gas risers, utility poles and slung wires; print stock, beer crates and hand carts. Sign drawing follows the grammar of the experiments-jyc `daechi/1` street (canvas-drawn faces, invented names, Korean sign palettes).
- **Lyric slot.** The shop name on the projecting lightboxes. While the song plays, every lightbox takes the sung word at once; trade lines, phone numbers and palettes stay the shops’ own, and the fascias along the walls keep their names. Before playback the lightboxes show their own names. (First built as one word per sign, nearest first, like the departures display; changed because the far signs were too small to read, so the line was never seen whole.)
- **Performance.** All lightbox faces share one canvas atlas (resolution falling off with distance) and one merged mesh; each name change redraws only the names over cached sign bases and uploads once. Every other surface that shares a material is merged per material, matte surfaces use Lambert, and only 13 point lights remain. Measured headless at 1600 × 900, DPR 2: 81 draw calls, about 15 k triangles, under 2 ms per render.
- The scene is redrawn only when a sign changes or the frame resizes.

**`3_daechi` (`/v3/3`).** A port of experiments-jyc `apps/scc/components/mobile/daechi/1` (2026-11-02): the shader-lit academy street at 10 p.m., goldfish students and traffic, from the press photo’s raised view down the street. The fling-and-smash play is removed.
- **Lyric slot.** The academy name on every academy sign: projecting vertical stacks, floor signs, shop fascias, rooftop boards, and sidewalk stands (입간판, added outside shop doors). LED tickers and the far apartment boards keep their own text.
- **Reading order.** Signs are grouped into rows: one side of the street and one height — each floor band, the fascias, each level of the projecting stacks, the stands, the rooftops. Along a row, nearest the opening view first, sign k shows word k mod n of the current line, so every row reads the line into the street, repeated. When a word is sung its signs switch one repetition after another down the row (90 ms apart) and come up to full brightness over 0.25 s; a new line re-deals every row at once. (Earlier the signs were ranked across both sides and all kinds, which scattered the line; corrected after review.)
- **Light.** Only signs carrying a sung word burn at full brightness and glow; every other sign — lyric signs still showing their academy name, LED tickers, apartment boards — is dimmed to 24 % with no glow. All signs burn steadily: the original’s blinking, pulsing, faulty flicker and running rooftop bulbs were removed as cheap-looking (user review, 2026-11-03).
- **Lettering.** Twelve sign faces, self-hosted through `next/font` and loaded before any sign is painted: heavy and condensed gothics (Black Han Sans, Do Hyeon, Gothic A1, Noto Sans KR, Nanum Gothic, IBM Plex Sans KR), rounded (Jua, Sunflower), myeongjo serifs (Nanum Myeongjo, Noto Serif KR, Hahmlet), and a black display face (Gasoek One). Each sign’s cell has its own face and finish (plain, outlined, drop-shadowed, condensed), and neighbouring signs in a row never share a face. Latin words are set in capitals, as on Korean signage.
- **Rendering.** Lyric signs are colourless masks (red lettering, green accent, blue knockout) with one cell per kind and word position; `LYRIC_ROW_SIGN_FRAG` colours them per sign and picks the cell from the sign’s row order and the line length, so a new line touches no geometry. A word change redraws only its cells; the previous faces stay in a second texture until the ripple reaches each sign.

**Camera (`/v3/2`, `/v3/3`).** Each study carries its own `scene/viewpoint.ts`: drag to look, wheel or pinch to walk forward and back, W A S D / arrows to walk, Q / E to lower and raise, double-click to return to the opening view; the camera stays inside the street. A drag never reaches the whole cycle’s click-to-advance, and the arrow keys are taken before its → handler.

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
