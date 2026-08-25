export const realtimeEvents = {
  join: "concert:join",
  hello: "concert:hello",
  presence: "concert:presence",
  session: "concert:session",
  input: "concert:input",
  frame: "concert:frame",
  adminCommand: "concert:admin:command",
  adminResult: "concert:admin:result",
  broadcastClaim: "broadcast:claim",
  broadcastState: "broadcast:state",
  listenerRequest: "broadcast:listener:request",
  listenerLeave: "broadcast:listener:leave",
  offer: "broadcast:offer",
  answer: "broadcast:answer",
  ice: "broadcast:ice",
  broadcastStop: "broadcast:stop",
  broadcastDiagnostic: "broadcast:diagnostic",
  cameraCollagePublish: "camera-collage:publish",
  cameraCollageUnpublish: "camera-collage:unpublish",
  cameraCollageViewerReady: "camera-collage:viewer:ready",
  cameraCollageViewerLeave: "camera-collage:viewer:leave",
  cameraCollagePublisherLeave: "camera-collage:publisher:leave",
  cameraCollageOffer: "camera-collage:offer",
  cameraCollageAnswer: "camera-collage:answer",
  cameraCollageIce: "camera-collage:ice",
} as const;

export type ConcertRole = "admin" | "mobile" | "screen" | "external";
export type ConcertMode = "particle" | "wave" | "hybrid";
export type ConcertStatus = "idle" | "live" | "paused";

export type SessionState = {
  activeExperiment: string;
  mode: ConcertMode;
  status: ConcertStatus;
  revision: number;
  epoch: string;
  updatedAt: number;
};

export type PresenceState = {
  admin: number;
  mobile: number;
  screen: number;
  external: number;
  total: number;
  serverTime: number;
};

export type BroadcastState = {
  active: boolean;
  broadcasterId?: string | null;
  listenerCount: number;
};

export type WaveParticleFrame = {
  version: 1;
  experimentId: "wave-particle";
  serverTime: number;
  tick: number;
  activeContributors: number;
  centroid: { x: number; y: number };
  energy: number;
  coherence: number;
  impulses: number;
};
