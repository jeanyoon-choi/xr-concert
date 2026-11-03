# Parametric Interface archive

A standalone import of the SCC `parametric-interface` archive, now organised by song version. It is intentionally separate from the concert’s realtime experiment registry: it has no mobile, screen, admin, or relay role yet.

## Routes

| Route | Variation |
| --- | --- |
| `/parametric-interface` | Shared experiment navigation (date/group views, search) |
| `/parametric-interface/v1` | U2 — “You’re the Best Thing About Me” cycling through interfaces 1–6 (formerly `/whole`) |
| `/parametric-interface/v1/1`–`/6` | Standalone interface studies for v1 (formerly `/1`–`/6`) |
| `/parametric-interface/v2` | ROSÉ — “toxic till the end” cycling through interfaces 7–8, then 3, 4, 5, 6, 1, 2 |
| `/parametric-interface/v2/1`–`/6` | v1’s interfaces running on the ROSÉ song (v2-owned copies) |
| `/parametric-interface/v2/7`–`/8` | ROSÉ-specific studies (below) |

The former `/7` lecture-note study was removed. Legacy `/whole` and `/1`–`/6` redirect (308) to their `v1` equivalents.

## v2 studies 7–8 (2026-10-27)

The inherited interfaces 1–6 are office and information systems; they suit U2’s plain address but not ROSÉ’s subject — possession, surveillance, manipulation, and not being let go. Each new study chooses a host interface whose own grammar already performs that relation, and places the lyric only in that host’s ordinary semantic slots (no overlays, captions, or badges). Every state derives from the audio clock, so backward seeks rebuild the same screen. 3D is used only where the reference itself is spatial, with CSS 3D transforms (no WebGL dependency).

| Route | Host interface | Lyric slot and relation | Removal test |
| --- | --- | --- | --- |
| `v2/7` | macOS Messages, light | Each word arrives at its onset as its own incoming bubble from “Daniel” — double texting — with the typing indicator between words and his sidebar preview showing the latest word. One timestamp precedes the lyric; runs are separated by iMessage’s tail-and-gap grouping. | Without lyric bubbles: an ordinary Messages window ending on her “Read” receipt. |
| `v2/8` | macOS Find My, People, 3D map (2D sidebar and labels) | Cue words become place labels along a seeded route; Daniel’s pin reaches each place at its word onset and the sidebar reads “Near <word> · Now”. The camera leans toward the pin and pans ahead to the next route during a cue’s last word. 3D is earned by Find My’s own tilted city view. | Without lyric places: a contact moving on an ordinary 3D map. |

Observed in the browser at 1470 × 703 (2026-10-27): both render at full viewport; `v2/8` holds 60 fps with ~470 CSS-3D faces. Corrections during review: per-cue timestamps removed from `v2/7` (Messages only stamps after long silences); `v2/8` camera made to follow the pin and pan ahead of cue changes. Find My was first built as `v2/9` and renumbered to `v2/8` after the failures below were removed.

Unresolved: whether the CSS-3D map holds frame rate on the venue machine; whether a single fictional contact name is the right cast.

## Failure record

**2026-10-27, three ROSÉ studies (removed).** Built alongside 7 and 8 as `v2/8` membership-cancellation flow (exit-survey answers as the lyric, steps looping 1→2→3→1), `v2/10` 3D blitz chess (each word a legal move with the word as its PGN comment), and `v2/11` iPadOS lock-screen notification stack. All three rendered correctly and kept the lyric inside native slots, but the user rejected them as outside the work’s aesthetic. Recorded reading: each illustrated the song’s subject literally — a “manipulative” dark pattern, the lyric’s own chess image, “on the screen” as a lock screen — so the host became a pun on the lyric rather than a found interface whose ordinary coupling the lyric quietly displaces. The cancellation page and chess site also introduced invented brands, and the chess board’s spectacle competed with the lyric. Messages and Find My were kept: their grammar (double texting, read receipts, continuous location sharing) carries the relation without restating the words.

## Version independence

Each version lives in `components/parametric-interface/<version>/` and owns its entire code path: song model, playback, lyric timeline, interfaces, and whole cycle. A version imports nothing from a sibling version, so `v1/` or `v2/` can be deleted, moved, or rewritten without affecting the other. v2 began as a copy of v1 with only its song changed; its interfaces are expected to diverge.

Outside the version directories there is only:

- `components/parametric-interface/versions.ts` — a thin index of each version’s `version.ts` loaders, used by the catch-all route.
- `components/navigation/` — the shared experiment catalogue (also used by `/face-voronoi`), ported from the experiments-jyc SCC navigation. Dates and phrases live in `components/navigation/experiments.ts`.

## Audio and lyric timing

Each version’s `timeline/use-lyric-cue.ts` chooses the word for `currentTime + 120 ms` (`LYRIC_LEAD_MS`) to compensate for per-frame read and render delay, measured at roughly 50–300 ms behind the audio before the lead was added.

| Version | Audio (`public/audio/mp3/`) | Duration |
| --- | --- | --- |
| v1 | `U2_-_You_re_The_Best_Thing_About_Me_(SkySound7.com).mp3` | 225.776 s |
| v2 | `toxic_till_the_end.mp3` | 155.832 s |

Word start times (v1 re-timed and v2 new, 2026-10-27) were produced by separating the vocal stem with demucs (`htdemucs`) and forced-aligning the lyric text three times (whisper `turbo`, `medium.en`, and a per-line windowed `turbo` pass). Each word uses the median of the three, with monotonic order enforced; where one pass lost sync, the two agreeing passes are averaged, and a handful of documented overrides correct words every aligner stretched across an instrumental or collapsed to zero length. The results were checked against LRCLIB line starts and an unguided transcription. Words that every aligner collapsed to zero length use the unguided transcription time. Re-run this procedure whenever the audio file changes; timings belong to that exact recording.

## Preserved invariants

- Interfaces 1–6 keep their individual interaction contracts, including macOS menus, Gmail selection, and song playback controls.
- The catch-all route resolves only registered version paths and returns a 404 for everything else.
- This archive does not register socket events, change concert state, or make a performance-readiness claim.
