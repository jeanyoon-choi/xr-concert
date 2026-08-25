import { Server } from "socket.io";
import { registerBroadcastSignaling } from "./broadcast/register-broadcast.mjs";
import { registerCameraCollageSignaling } from "./camera-collage/register-camera-collage.mjs";
import { events, roles } from "./core/events.mjs";
import { applySessionCommand, createSessionState } from "./core/session-state.mjs";
import { createExperimentRegistry } from "./experiments/index.mjs";

const FRAME_INTERVAL_MS = 1000 / 30;
const INPUTS_PER_SECOND_LIMIT = 120;

function buildPresence(io) {
  const counts = { admin: 0, mobile: 0, screen: 0, external: 0 };
  for (const socket of io.sockets.sockets.values()) {
    const role = socket.data.concertRole;
    if (role in counts) counts[role] += 1;
  }
  return { ...counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0), serverTime: Date.now() };
}

function originAllowed(origin, allowedOrigins, allowAnyOrigin) {
  if (allowAnyOrigin) return true;
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

export function createConcertRealtimeServer(httpServer, options = {}) {
  const allowedOrigins = options.allowedOrigins ?? [];
  const allowAnyOrigin = options.allowAnyOrigin ?? true;
  const experiments = createExperimentRegistry();
  const initialExperiment = experiments.values().next().value;
  let session = createSessionState({
    experimentId: initialExperiment.id,
    mode: initialExperiment.defaultMode,
  });
  const broadcastState = { broadcasterId: null, listeners: new Set() };
  const cameraCollageState = { publishers: new Set(), viewers: new Set() };

  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        const allowed = originAllowed(origin, allowedOrigins, allowAnyOrigin);
        callback(allowed ? null : new Error("origin not allowed"), allowed);
      },
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 32_768,
    transports: ["websocket", "polling"],
    connectionStateRecovery: { maxDisconnectionDuration: 10_000, skipMiddlewares: true },
  });

  function broadcastPresence() {
    io.emit(events.presence, buildPresence(io));
  }

  io.on("connection", (socket) => {
    socket.data.inputWindow = { count: 0, startedAt: Date.now() };
    socket.emit(events.hello, {
      socketId: socket.id,
      experiments: [...experiments.values()].map(({ id, label, modes }) => ({ id, label, modes: [...modes] })),
      session,
      presence: buildPresence(io),
      broadcast: {
        active: Boolean(broadcastState.broadcasterId),
        listenerCount: broadcastState.listeners.size,
      },
    });

    socket.on(events.join, ({ role } = {}) => {
      if (!roles.includes(role)) return;
      const previousRole = socket.data.concertRole;
      if (previousRole && previousRole !== role) socket.leave(`role:${previousRole}`);
      socket.data.concertRole = role;
      socket.join(`role:${role}`);
      socket.join(`experiment:${session.activeExperiment}`);
      broadcastPresence();
    });

    socket.on(events.adminCommand, (command = {}) => {
      if (socket.data.concertRole !== "admin") return;
      const experiment = experiments.get(session.activeExperiment);
      const next = applySessionCommand(session, command, experiment);
      if (next === session) {
        socket.emit(events.adminResult, { ok: false, reason: "Unsupported command" });
        return;
      }
      session = next;
      io.emit(events.session, session);
      socket.emit(events.adminResult, { ok: true, command: command.type });
    });

    socket.on(events.input, (payload = {}) => {
      if (socket.data.concertRole !== "mobile" || session.status !== "live") return;
      const now = Date.now();
      const inputWindow = socket.data.inputWindow;
      if (now - inputWindow.startedAt >= 1000) {
        inputWindow.startedAt = now;
        inputWindow.count = 0;
      }
      inputWindow.count += 1;
      if (inputWindow.count > INPUTS_PER_SECOND_LIMIT) return;
      experiments.get(session.activeExperiment)?.acceptInput(socket.id, payload, now);
    });

    registerBroadcastSignaling({ io, socket, state: broadcastState });
    registerCameraCollageSignaling({ io, socket, state: cameraCollageState });

    socket.on("disconnect", () => {
      for (const experiment of experiments.values()) experiment.removeClient(socket.id);
      broadcastPresence();
    });
  });

  const timer = setInterval(() => {
    if (session.status !== "live") return;
    const room = io.sockets.adapter.rooms.get("role:screen");
    if (!room || room.size === 0) return;
    const frame = experiments.get(session.activeExperiment)?.createFrame(Date.now());
    if (frame) io.to("role:screen").emit(events.frame, frame);
  }, FRAME_INTERVAL_MS);

  timer.unref?.();
  return {
    io,
    close() {
      clearInterval(timer);
      return io.close();
    },
    getSession: () => session,
  };
}
