# Testing and rehearsal gates

## Static gate

`pnpm check` runs lint, TypeScript, and Node protocol tests. It must pass before a device rehearsal.

Current pure tests cover:

- ordered lifecycle acceptance;
- duplicate and malformed input rejection;
- clamping;
- collective parameter aggregation;
- explicit end and stale expiry;
- absence of presentation fields in the server frame;
- revisioned admin state and new reset epochs.
- broadcaster authorization, listener opt-in, signaling target isolation, and disconnect cleanup.
- camera-collage publisher/viewer authorization, signaling target isolation, and publisher cleanup.

## Transport gate

With the relay already running, `pnpm test:load` creates a configurable number of real Socket.IO clients and sends bounded 25 Hz streams. Start at 20, then run 50 and 100 clients on the exact rehearsal network. Record CPU, memory, Socket.IO disconnects, screen cadence, and Wi-Fi behavior.

The load script does not start a concert session and therefore does not assert artistic output. It exercises connection and ingress transport. A future production-authenticated harness may add controlled session state, but credentials must not be embedded in the script.

## Real-device gate

For every release candidate:

1. Open `/admin`, `/screen`, and `/mobile` on their intended device classes.
2. Confirm HTTPS trust without a browser warning.
3. Start, pause, resume, change each visual reading, and reset.
4. Use at least five simultaneous phones with overlapping gestures.
5. Kill one phone mid-gesture and confirm its contribution disappears.
6. Reload screen only; then admin only; then one phone only.
7. Start and stop microphone broadcast with multiple opted-in listeners.
8. Remove internet while preserving the LAN.
9. Disconnect the future renderer or projector input and verify the web screen fallback.
10. Observe from the back of the venue for legibility and from the audience area for gesture comprehension.

## Evidence language

- A unit test establishes a code invariant.
- A load run establishes behavior under that synthetic traffic on that machine/network.
- A rehearsal observation establishes what happened in that physical setup.
- None of these alone proves artistic meaning, audience comprehension, or production scalability.
- For WebRTC audio, signaling, ICE connection, remote-track delivery, and `play()` resolution are separate intermediate facts. Only a moving source meter plus increasing RTP and audible output on the physical target establishes end-to-end success. Follow `webrtc-agent-guardrails.md`.
