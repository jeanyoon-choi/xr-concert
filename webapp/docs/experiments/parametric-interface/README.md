# Parametric Interface archive

A standalone import of the SCC `parametric-interface` archive, now organised by song version. It is intentionally separate from the concert’s realtime experiment registry: it has no mobile, screen, admin, or relay role yet.

## Routes

| Route | Variation |
| --- | --- |
| `/parametric-interface` | Shared experiment navigation (date/group views, search) |
| `/parametric-interface/v1` | U2 — “You’re the Best Thing About Me” cycling through interfaces 1–6 (formerly `/whole`) |
| `/parametric-interface/v1/1`–`/6` | Standalone interface studies for v1 (formerly `/1`–`/6`) |
| `/parametric-interface/v2` | ROSÉ — “toxic till the end” cycling through interfaces 1–6 |
| `/parametric-interface/v2/1`–`/6` | Standalone interface studies for v2 |

The former `/7` lecture-note study was removed.

## Version independence

Each version lives in `components/parametric-interface/<version>/` and owns its entire code path: song model, playback, lyric timeline, interfaces, and whole cycle. A version imports nothing from a sibling version, so `v1/` or `v2/` can be deleted, moved, or rewritten without affecting the other. v2 began as a copy of v1 with only its song changed; its interfaces are expected to diverge.

Outside the version directories there is only:

- `components/parametric-interface/versions.ts` — a thin index of each version’s `version.ts` loaders, used by the catch-all route.
- `components/navigation/` — the shared experiment catalogue (also used by `/face-voronoi`), ported from the experiments-jyc SCC navigation. Dates and phrases live in `components/navigation/experiments.ts`.

## Audio and lyric timing

| Version | Audio (`public/audio/mp3/`) | Duration |
| --- | --- | --- |
| v1 | `U2_-_You_re_The_Best_Thing_About_Me_(SkySound7.com).mp3` | 225.776 s |
| v2 | `toxic_till_the_end.mp3` | 155.832 s |

Word start times were produced by separating the vocal stem with demucs (`htdemucs`) and forced-aligning the lyric text three times (whisper `turbo`, `medium.en`, and a per-line windowed `turbo` pass). Each word uses the median of the three, with monotonic order enforced. The results were checked against LRCLIB line starts and an unguided transcription. Words that every aligner collapsed to zero length use the unguided transcription time. Re-run this procedure whenever the audio file changes; timings belong to that exact recording.

## Preserved invariants

- Interfaces 1–6 keep their individual interaction contracts, including macOS menus, Gmail selection, and song playback controls.
- The catch-all route resolves only registered version paths and returns a 404 for everything else.
- This archive does not register socket events, change concert state, or make a performance-readiness claim.
