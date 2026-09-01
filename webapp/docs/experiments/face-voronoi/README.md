# Face Voronoi archive

This is a faithful, standalone import of the three SCC `face-voronoi` studies. It is not yet a concert realtime experiment; it shares no state with `/mobile`, `/screen`, `/admin`, or the relay. The imported studies retain their own model, renderer, controls, and local visual materials for later composition into a performance section.

## Routes

| Route | Preserved study |
| --- | --- |
| `/face-voronoi` | Redirects to `/face-voronoi/1` |
| `/face-voronoi/1` | Living portrait territories with an optional final seam |
| `/face-voronoi/2` | Population pulse with monochrome, face, and politician renderers |
| `/face-voronoi/3` | Pointer-warped material field with colour, monochrome, and portrait-gradient modes |

Only `1`, `2`, and `3` are valid routes; retired `/4` and `/5` remain 404s.

## Preserved invariants

- Each numbered study owns independent Voronoi state; models are not merged merely because they use related geometry.
- Display-mode changes remain renderer-only: they do not reset the corresponding simulation state.
- Portraits and politician images are local materials under `public/images/face-voronoi/`; the politician source ledger remains beside the study component. No remote portrait request is introduced.
- The WebGL material field retains its pointer warp order, feature trajectory, individual gradient modes, and renderer teardown.
