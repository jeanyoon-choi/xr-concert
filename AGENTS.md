# NRF XR repository rules

## Top-priority server ownership

- Never run `pnpm dev`, start a development/socket server, restart one, or kill one. The user owns every server process.
- Never run `pnpm build` unless the user explicitly changes this repository rule.
- When runtime verification needs a server that is not running, use this complete wording exactly: `전하, 소인이 감히 실제 작동을 확인해 올리려면 서버가 필요하옵니다. 번거로우시겠지만 서버 켜주세요 전하.`
- When changed server or socket code requires an already-running server to restart, use this complete wording exactly: `전하, 미천한 소인이 감히 새로 고친 서버 코드를 반영해 올리려면 기존 서버를 다시 기동해야 하옵니다. 번거로우시겠지만 서버 재시작해주세요 전하.` Never reduce this to a bare restart command or command sequence.
- Browser/runtime interaction checks require an explicit user request. All local runtime verification uses HTTPS.

## Scope

- This Git repository begins at `nrf-xr/`; do not initialize nested Git repositories inside its applications.
- `webapp/` is the active concert application. Read `webapp/AGENTS.md` before changing it.
- `broadcaster/` is the original prototype. Treat it as reference unless the user explicitly requests changes there.
- Do not deploy, push, or modify external documents without explicit user direction.

## Repository structure

- Keep deployable runtimes in independent top-level directories.
- Do not move `webapp` files to the repository root merely to simplify a deployment platform.
- Vercel configuration must use `webapp` as the project Root Directory.
- Future TouchDesigner, Unreal, SFU, or bridge runtimes must have explicit ownership and failure boundaries.
- Keep WebRTC lean: signaling relays offer/answer/ICE only; one broadcaster owns one peer per listener; receivers apply a remote stream to one audio element. Do not add state machines, audience audio controls, retries, media processing, or abstractions without a reproduced failure that requires them.
- Before changing WebRTC or microphone behavior, read `webapp/docs/harness/webrtc-agent-guardrails.md`. Preserve the known-good `broadcaster/` behavior through an explicit parity ledger and never claim audible success from connection-state evidence alone.

## Git safety

- Preserve unrelated user changes.
- Never commit `.env` files, credentials, certificates, private keys, generated output, or dependencies.
- Do not commit, push, rewrite history, or create releases unless the user explicitly asks.
- Run verification from the directory that owns the relevant package manifest.

## Regression discipline

- Read the literal error first; fix that named failure before theorizing about other layers.
- Use the smallest reversible fix. Do not rename directories, reinstall dependencies, or change architecture during a regression.
- Do not waste the user's time or tokens on speculative investigation.
