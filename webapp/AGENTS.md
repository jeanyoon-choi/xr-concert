# NRF XR agent rules

## Top-priority server ownership

- Never run `pnpm dev`, start the Next.js or realtime server, restart either process, or kill either process. The user owns every server process.
- Never run `pnpm build` unless the user explicitly changes this repository rule.
- When runtime verification needs a server that is not running, use this complete wording exactly: `전하, 소인이 감히 실제 작동을 확인해 올리려면 서버가 필요하옵니다. 번거로우시겠지만 서버 켜주세요 전하.`
- When changed server or socket code requires the user's already-running process to restart, use this complete wording exactly: `전하, 미천한 소인이 감히 새로 고친 서버 코드를 반영해 올리려면 기존 서버를 다시 기동해야 하옵니다. 번거로우시겠지만 서버 재시작해주세요 전하.` Never send only a restart command.
- Browser/runtime interaction checks require an explicit user request. All local runtime verification uses HTTPS.

## Scope

- The Git repository begins at `nrf-xr/`; this application remains isolated in `webapp/` as its deployable root. Do not move its files to the repository root.
- `../broadcaster` is read-only reference material. Do not import it, edit it, or make the new app depend on it.
- Do not deploy, push, or modify external documents without explicit user direction.

## Before changing code

- Read `llm.txt`, `docs/README.md`, and the document for the owned subsystem.
- For experiment changes, also read `docs/foundations/mdwa-concert.md`, `docs/foundations/design-guidelines.md`, and the experiment document.
- Trace every socket event from sender through relay to every consumer before changing its name or payload.
- Before any WebRTC or microphone change, read `docs/harness/webrtc-agent-guardrails.md` and complete its parity ledger against `../broadcaster`.
- Consider 5, 20, and 100 concurrent phones, late joins, reconnects, abandoned gestures, duplicate messages, and one failed device.

## Runtime and package management

- Local Node is `26.5.1`; accepted engines are `24.x || 26.x`; package management uses Vercel-compatible pnpm `10.34.0`.
- Keep `@types/node` on major 24 until the deployment runtime deliberately changes.
- Local device testing is HTTPS/WSS only. Do not add an HTTP convenience path.
- Never commit `.env`, certificates, private keys, TURN credentials, or future admin credentials.
- Agents may run `pnpm lint`, `pnpm typecheck`, and `pnpm test`.
- Do not start, stop, or restart the development server even when runtime testing is requested; ask the user using the exact wording above.
- Do not run browser automation unless the user explicitly requests browser testing.

## Architecture

- App Router route files stay thin. Composition belongs under `components/`; experiment behavior belongs under `experiments/<id>/`.
- Each experiment owns a unique id, room, input contract, server model, mobile presenter, screen presenter, test, and document.
- Socket servers own abstract domain state, lifecycle, time, aggregation, and permissions. They never emit color, radius, opacity, easing, layout, or animation instructions.
- High-rate mobile samples use stable interaction ids and monotonic sequence numbers. Keep latest-sample-wins aggregation bounded; never queue an unbounded sensor history.
- Smooth continuous input once at the consuming presentation boundary. Do not independently smooth on mobile, relay, and screen.
- WebRTC is for media. Socket.IO/WSS is for state, input, presence, admin commands, and WebRTC signaling.
- Preserve the proven `broadcaster/` media flow: explicit admin input selection, one captured stream, one peer per listener, offer/answer/ICE relay, and one receiver audio element. Keep diagnostics separate from transport logic. Do not add mobile audio UI or a WebRTC state machine without explicit user direction.
- Never treat signaling success, ICE `connected`, a live remote track, or resolved `play()` as proof of audible audio. Prove capture energy, RTP flow, receiver playback, and physical perception separately.
- The current WebRTC broadcaster is peer-to-peer. Do not claim it supports 100 listeners. Add an SFU adapter before expanding that promise.
- Unreal or TouchDesigner integration must consume the aggregate frame boundary. Never issue browser messages directly to individual engine actors.

## Visual and interaction design

- Read `docs/foundations/design-guidelines.md` before creating or materially changing an interface.
- Design from the participant's action and the cross-device relation, not from “XR”, “concert”, or “technology” as visual themes.
- Do not add generic AI dashboard chrome, gradients, glass cards, glow, tiny labels, fake live badges, decorative dividers, captions, or technical copy without a functional need.
- Keep participant text at 16 px or larger and touch targets at least 44 px in both dimensions.
- A mobile is an instrument, not a miniature admin panel. A screen is the collective output, not a duplicate of the mobile.
- Respect reduced motion, keyboard focus, safe-area insets, and user-gesture permission requirements.

## Experiments and documentation

- A new experiment begins as a bounded, reversible trial. State the participant situation, parameter, mapping, invariant, observed outcome, and unresolved question.
- Preserve a stable working experiment rather than silently rewriting its meaning. Add a new id or version when the tested relation changes materially.
- Put durable repo-wide notes under `docs/harness/` or `docs/foundations/`; put experiment notes under `docs/experiments/<id>/`; put rehearsal procedures under `docs/tutorials/`.
- Update `docs/README.md` and `llm.txt` when adding a durable document or experiment.

## Shorthand the user writes

- `pc` — pre-chorus (`pc1`, `pc2`: Pre-Chorus 1, 2 of “toxic till the end”; sections are listed in `components/part4/v1/song/sections.ts`).
- `yhmp` — the line “You had me participating” (the last line of each pre-chorus).

## Verification

- Protocol tests must cover validation, duplicate/stale rejection, lifecycle end, bounded aggregation, and absence of presentation fields.
- WebRTC work is incomplete until the intended admin input produces audible output on the intended physical phone; static and signaling tests alone are not sufficient.
- A load harness is not an experience test. Final venue readiness requires real-device HTTPS, Wi-Fi saturation, projector, audio, reconnect, and failure-mode checks.
- Preserve user changes and unrelated files. Keep shared-registry edits surgical.
