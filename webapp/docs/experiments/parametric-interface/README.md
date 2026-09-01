# Parametric Interface archive

This is a faithful, standalone import of the SCC `parametric-interface` archive. It is intentionally separate from the concert’s realtime experiment registry: it has no mobile, screen, admin, or relay role yet. Its route and component boundary are preserved so a later performance section can compose a selected variation without changing this archive’s behavior.

## Routes

| Route | Preserved variation |
| --- | --- |
| `/parametric-interface` | Archive navigation |
| `/parametric-interface/whole` | One lyric rendered through randomly selected wrappers |
| `/parametric-interface/1`–`/7` | Seven numbered wrapper studies |

`components/parametric-interface/experiments.ts` remains the canonical registry. The studies use the local song at `public/audio/mp3/U2_-_You_re_The_Best_Thing_About_Me_(SkySound7.com).mp3`; it must remain available at that path for the playback and lyric-cue timing to work.

## Preserved invariants

- The active song, word timings, playback state, cue logic, and wrapper selection are unchanged.
- The indexed variants retain their individual interaction contracts, including macOS menus, Gmail selection, and song playback controls.
- The catch-all route resolves only registered archive paths and returns a 404 for everything else.
- This import does not register socket events, change concert state, or make a performance-readiness claim.
