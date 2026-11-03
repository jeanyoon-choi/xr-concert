# Schematic

The concert drawn as one circuit: projector, audience phones, local performers, and remote performers on a single schematic that shows **where sound leaves a device into the room** (copper) and **where signal travels between devices** (water). It is the candidate for the Part 2 projection in "1. Multi-Modal Interaction" ("System Diagram showing real-time conversation status").

Study 1 is design only. It is a standalone page outside the realtime registry; it has no socket, WebRTC, or sync code.

## Routes

| Route | Study |
| --- | --- |
| `/schematic` | Navigation index |
| `/schematic/1` | Scripted circuit with Parts 0–3 |
| `/schematic/2` | One direct trace per sender → receiver; select senders to send along their own traces |
| `/schematic/3` | Copy of Study 2, the base for the next iteration |

## Sources

- NRF XR Music & Tech Sheet, column 1: Part 1 central audio → mobiles; Part 2 remote–local conversation; Part 3 face mesh-up.
- Meeting Note 0813: remote–local conversation does not play simultaneously; it starts from a user phone, then remote, then local.
- NRF_June.pdf p.8 floor plan: projection on top, on-stage performers, remote embodiment frames at the stage sides, PA speakers, audience below; remote drawn as a dotted circle.
- Make Lab.pdf: network delay as distance (30 ms ≈ 10 m); Sheet reference for Part 2: the WarGames war-room display.

## Structure

```text
components/schematic/1/
  model/topology.ts   counts → nodes, ports, wires (pure)
  model/score.ts      part + time → Activity (pure, scripted)
  model/path.ts       polyline helpers
  view/               SVG symbols and renderer
  index.tsx           clock, part selection, controls
```

- Counts are configuration: local 1–5, remote 0–4, phones 1–120. Remotes alternate left/right; each has a delay line whose number of turns follows its latency.
- `score.ts` returns only what is active (flows, packets, sounding, lit). A later live adapter replaces it by producing the same `Activity` from real presence and peer state; the renderer does not change.
- Every wire routes through one of two hubs: Mixer (audio) or Server (network).
- On-screen text is limited to device names (Performer n, Remote performer n, Mixer, Server, Laptop, Projection) and remote delay in ms. Speakers are unlabeled. No part captions or turn readouts.

## Parts

| Part | Activity |
| --- | --- |
| 0 | Idle wiring only |
| 1 | Laptop → Server → phones; phones join over 14 s and sound |
| 2 | Turns: phone → Remote performer 1 → Performer 1 → Remote performer 2 → Performer 2 …; one at a time; performer sound → Mixer → speakers; remote video → frames |
| 3 | All performers sound; phones send faces → Server → projection over 8 s |

## Controls

Keys `0`–`3` part, `[` `]` local, `;` `'` remote, `p` phones preset, `h` or the Options button toggles the options panel (hidden by default). Query: `?local=3&remote=2&phones=60&latency=20,30`.

## Study 2

`components/schematic/2/circuit.ts` wires one dedicated trace per sender → receiver pair directly, like a printed schematic, with no hub blocks; every trace is visible at rest. Parallel traces keep a fixed pitch (tightened only when a bundle would overflow). Below the stage the band stacks a speaker bundle and then one bundle per remote; inside a bundle the nearest performer takes the highest lane, and corridor columns nest (lower lane, outer column), so a bundle never crosses itself. Phones rise through per-row lanes, turn outward on their own band lane, and climb their own projection column. Visible text is performer labels only.

Any number of senders can be selected at once, each in its own shade (local copper family, remote ochre family, phones water). A wavefront travels along the sender's traces at 640 units/s; on release a tail follows from the sender at the same speed, so traces drain in order. Study 1's rings mark direction: a sender emits solid rings expanding outward; a reached receiver shows dashed rings closing inward in the sender's colour. A performer can show both. The empty field releases all. Speakers and the projection only receive.

| Sender | Receivers | Source |
| --- | --- | --- |
| Phone | Projection | Sheet Part 3: faces → projection |
| Local performer ↔ remote performer | Each other | Sheet Part 2: remote–local conversation |
| Local / remote performer | Speakers | NRF_June p.8: PA speakers | The Options button opens local, remote, and phone counts.

## Open questions

- Which edges the projected version keeps when the live adapter arrives.
- Whether the turn readout belongs on the projection or only on the operator view.
