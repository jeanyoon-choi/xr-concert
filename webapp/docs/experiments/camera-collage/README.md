# Camera Collage / Study 2

## Proposition

Can several front-camera phones form one immediate projection collage while Study 1 remains untouched?

## Stable routes and baseline

| Route | Purpose |
| --- | --- |
| `/screen` and `/screen/1` | Preserved Wave / Particle baseline (Study 1) |
| `/mobile` and `/mobile/1` | Preserved Wave / Particle mobile baseline (Study 1) |
| `/screen/2` | Camera-collage projection (Study 2) |
| `/mobile/2` | Front-camera publisher (Study 2) |

The only changed relation is the input: a mobile phone publishes its front-camera video instead of a touch stream. Wave / Particle session state, audio broadcast, and the original `/mobile` and `/screen` implementations remain independent invariants.

## Flow

```text
mobile /mobile/2 --user starts front camera--> one local MediaStream
  -> one RTCPeerConnection per ready /screen/2
  -> `camera-collage:*` offer / answer / ICE over WSS
  -> remote video track into one projection tile per mobile
```

The realtime relay owns only publisher and viewer membership plus targeted signaling authorization. It does not receive, mix, encode, or lay out video. `/screen/2` owns its grid and derives a full-screen one-tile layout when one mobile is publishing.

## Trial contract

- Mobile role: Front/Back selector chooses the preferred camera before capture and replaces the active video track when changed; no audio track is captured.
- Screen role: one `/screen/2` browser is the intended viewer for this trial.
- Capture constraint: front-facing camera preferred, 640×480 ideal (960×720 maximum), 15 fps ideal (24 fps maximum).
- Server state: a set of active mobile publishers and a set of ready collage screens. It is cleared on stop or socket disconnect.
- Signaling: only an active publisher can offer or send ICE to a ready collage screen; only that screen can answer or send ICE back.
- Presentation: `/screen/2` is always an 8×5, 40-tile output grid. It never expands a camera tile. Active camera streams repeat across those 40 equal tiles in arrival order: one stream appears in all 40 tiles; two streams alternate; 40 streams each occupy one tile. The screen keeps one hidden source video per unique incoming stream and composites the 40 tiles into one capped-resolution canvas at 30 fps, rather than mounting duplicate video decoders for repetitions. No names, camera metadata, or connection chrome are rendered.

## Failure boundary

- Camera permission denied or capture failure affects only that mobile.
- A mobile stop/disconnect removes only its own tile.
- A projection reload rejoins as a viewer; publishing phones keep their local camera capture.
- WebRTC video failure does not alter Wave / Particle or microphone-broadcast state.
- The existing HTTPS trust requirement still applies on iPhone. A certificate warning must be resolved before testing camera access or WSS.

## Scope limit

This is a local P2P collage trial, not a 20–40 camera deployment claim. The output scaffold has 40 visible positions; it renders at most 40 incoming cameras. With one screen, each mobile encodes and sends one peer connection; adding screens multiplies that upload work. A later cross-network or 20–40-phone installation needs TURN and an SFU/compositor design, evaluated separately after this direct device test.

## Rehearsal record

No device observation has been claimed by static checks. Test `/screen/2` and `/mobile/2` over trusted HTTPS: begin with one phone (one full-screen tile), then add phones, stop one, and reload the screen. Record the observed tile count, latency, dropped video, and phone heat/battery before extending this experiment.
