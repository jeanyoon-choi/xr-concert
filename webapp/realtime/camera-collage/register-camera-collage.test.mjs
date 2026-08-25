import assert from "node:assert/strict";
import test from "node:test";
import { registerCameraCollageSignaling } from "./register-camera-collage.mjs";
import { events } from "../core/events.mjs";

function createIo() {
  const targeted = [];
  return {
    targeted,
    to(targetId) {
      return {
        emit(event, payload) {
          targeted.push({ targetId, event, payload });
        },
      };
    },
  };
}

function createSocket(id, data = {}) {
  const handlers = new Map();
  return {
    id,
    data,
    joined: [],
    join(room) {
      this.joined.push(room);
    },
    on(event, handler) {
      const existing = handlers.get(event) ?? [];
      handlers.set(event, [...existing, handler]);
    },
    trigger(event, payload) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
}

function setup() {
  const io = createIo();
  const state = { publishers: new Set(), viewers: new Set() };
  const publisher = createSocket("publisher", { concertRole: "mobile" });
  const viewer = createSocket("viewer", { concertRole: "screen" });
  const stranger = createSocket("stranger", { concertRole: "mobile" });
  for (const socket of [publisher, viewer, stranger]) {
    registerCameraCollageSignaling({ io, socket, state });
  }
  return { io, publisher, state, stranger, viewer };
}

test("a camera publisher is announced only to a ready collage screen", () => {
  const { io, publisher, state, viewer } = setup();

  viewer.trigger(events.cameraCollageViewerReady);
  publisher.trigger(events.cameraCollagePublish);

  assert.deepEqual([...state.publishers], [publisher.id]);
  assert.deepEqual([...state.viewers], [viewer.id]);
  assert.deepEqual(io.targeted.at(-1), {
    targetId: publisher.id,
    event: events.cameraCollageViewerReady,
    payload: { viewerId: viewer.id },
  });
});

test("camera offer, answer, and ICE relay only across an active publisher-viewer pair", () => {
  const { io, publisher, stranger, viewer } = setup();
  viewer.trigger(events.cameraCollageViewerReady);
  publisher.trigger(events.cameraCollagePublish);

  stranger.trigger(events.cameraCollageOffer, {
    targetId: viewer.id,
    description: { type: "offer", sdp: "blocked" },
  });
  publisher.trigger(events.cameraCollageOffer, {
    targetId: viewer.id,
    description: { type: "offer", sdp: "allowed" },
  });
  viewer.trigger(events.cameraCollageAnswer, {
    targetId: publisher.id,
    description: { type: "answer", sdp: "allowed" },
  });
  viewer.trigger(events.cameraCollageIce, {
    targetId: publisher.id,
    candidate: { candidate: "allowed" },
  });

  assert.deepEqual(
    io.targeted.slice(-3).map(({ targetId, event }) => ({ targetId, event })),
    [
      { targetId: viewer.id, event: events.cameraCollageOffer },
      { targetId: publisher.id, event: events.cameraCollageAnswer },
      { targetId: publisher.id, event: events.cameraCollageIce },
    ],
  );
});

test("publisher disconnect removes its tile from every ready collage screen", () => {
  const { io, publisher, state, viewer } = setup();
  viewer.trigger(events.cameraCollageViewerReady);
  publisher.trigger(events.cameraCollagePublish);
  publisher.trigger("disconnect");

  assert.equal(state.publishers.size, 0);
  assert.ok(
    io.targeted.some(
      ({ event, payload, targetId }) =>
        targetId === viewer.id &&
        event === events.cameraCollagePublisherLeave &&
        payload.publisherId === publisher.id,
    ),
  );
});
