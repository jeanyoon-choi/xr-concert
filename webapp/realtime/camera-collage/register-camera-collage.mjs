import { events } from "../core/events.mjs";

function isPublisherToViewer(state, publisherId, viewerId) {
  return state.publishers.has(publisherId) && state.viewers.has(viewerId);
}

export function registerCameraCollageSignaling({ io, socket, state }) {
  function removePublisher(publisherId) {
    if (!state.publishers.delete(publisherId)) return;
    for (const viewerId of state.viewers) {
      io.to(viewerId).emit(events.cameraCollagePublisherLeave, { publisherId });
    }
  }

  function removeViewer(viewerId) {
    if (!state.viewers.delete(viewerId)) return;
    for (const publisherId of state.publishers) {
      io.to(publisherId).emit(events.cameraCollageViewerLeave, { viewerId });
    }
  }

  socket.on(events.cameraCollagePublish, () => {
    if (socket.data.concertRole !== "mobile") return;
    state.publishers.add(socket.id);
    socket.join("experiment:camera-collage");
    for (const viewerId of state.viewers) {
      io.to(socket.id).emit(events.cameraCollageViewerReady, { viewerId });
    }
  });

  socket.on(events.cameraCollageUnpublish, () => removePublisher(socket.id));

  socket.on(events.cameraCollageViewerReady, () => {
    if (socket.data.concertRole !== "screen") return;
    state.viewers.add(socket.id);
    socket.join("experiment:camera-collage");
    for (const publisherId of state.publishers) {
      io.to(publisherId).emit(events.cameraCollageViewerReady, { viewerId: socket.id });
    }
  });

  socket.on(events.cameraCollageViewerLeave, () => removeViewer(socket.id));

  socket.on(events.cameraCollageOffer, ({ targetId, description } = {}) => {
    if (!isPublisherToViewer(state, socket.id, targetId) || description?.type !== "offer") return;
    io.to(targetId).emit(events.cameraCollageOffer, { fromId: socket.id, description });
  });

  socket.on(events.cameraCollageAnswer, ({ targetId, description } = {}) => {
    if (!isPublisherToViewer(state, targetId, socket.id) || description?.type !== "answer") return;
    io.to(targetId).emit(events.cameraCollageAnswer, { fromId: socket.id, description });
  });

  socket.on(events.cameraCollageIce, ({ targetId, candidate } = {}) => {
    const valid =
      isPublisherToViewer(state, socket.id, targetId) ||
      isPublisherToViewer(state, targetId, socket.id);
    if (!valid || !candidate) return;
    io.to(targetId).emit(events.cameraCollageIce, { fromId: socket.id, candidate });
  });

  socket.on("disconnect", () => {
    removePublisher(socket.id);
    removeViewer(socket.id);
  });
}
