"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { realtimeEvents } from "@/lib/realtime/events";
import { getIceServers } from "@/lib/realtime/origin";

export type CameraFacingMode = "user" | "environment";

function requestCamera(facingMode: CameraFacingMode) {
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 640, max: 960 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 15, max: 24 },
    },
  });
}

export function useCameraCollagePublisher(socket: Socket | null) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const [active, setActive] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
  const [error, setError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const closePeers = useCallback(() => {
    for (const peer of peersRef.current.values()) peer.close();
    peersRef.current.clear();
    candidatesRef.current.clear();
  }, []);

  const closeCapture = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setPreviewStream(null);
    setActive(false);
  }, []);

  const createOfferForViewer = useCallback(
    async (viewerId: string) => {
      const stream = streamRef.current;
      if (!stream || !socket?.connected) return;

      const existing = peersRef.current.get(viewerId);
      existing?.close();
      candidatesRef.current.delete(viewerId);

      try {
        const peer = new RTCPeerConnection({ iceServers: getIceServers() });
        peersRef.current.set(viewerId, peer);
        stream.getTracks().forEach((track) => peer.addTrack(track, stream));
        peer.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit(realtimeEvents.cameraCollageIce, {
              targetId: viewerId,
              candidate: event.candidate,
            });
          }
        };
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit(realtimeEvents.cameraCollageOffer, {
          targetId: viewerId,
          description: peer.localDescription,
        });
      } catch (cause) {
        peersRef.current.get(viewerId)?.close();
        peersRef.current.delete(viewerId);
        setError(cause instanceof Error ? cause.message : "Could not share the camera");
      }
    },
    [socket],
  );

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    preview.srcObject = previewStream;
    preview.muted = true;
    if (previewStream) void preview.play().catch(() => undefined);
  }, [previewStream]);

  useEffect(() => {
    if (!socket) return;
    const activeSocket = socket;

    async function handleAnswer({
      fromId,
      description,
    }: {
      fromId: string;
      description: RTCSessionDescriptionInit;
    }) {
      const peer = peersRef.current.get(fromId);
      if (!peer) return;
      try {
        await peer.setRemoteDescription(description);
        for (const candidate of candidatesRef.current.get(fromId) || []) {
          await peer.addIceCandidate(candidate);
        }
        candidatesRef.current.delete(fromId);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not connect the camera");
      }
    }

    async function handleIce({
      fromId,
      candidate,
    }: {
      fromId: string;
      candidate: RTCIceCandidateInit;
    }) {
      const peer = peersRef.current.get(fromId);
      if (!peer || !candidate) return;
      try {
        if (peer.remoteDescription) await peer.addIceCandidate(candidate);
        else candidatesRef.current.set(fromId, [...(candidatesRef.current.get(fromId) || []), candidate]);
      } catch {
        // A peer that has already closed does not need a recovery path in this trial.
      }
    }

    function announceCamera() {
      if (streamRef.current) activeSocket.emit(realtimeEvents.cameraCollagePublish);
    }

    function handleViewerReady({ viewerId }: { viewerId: string }) {
      void createOfferForViewer(viewerId);
    }

    function handleViewerLeave({ viewerId }: { viewerId: string }) {
      peersRef.current.get(viewerId)?.close();
      peersRef.current.delete(viewerId);
      candidatesRef.current.delete(viewerId);
    }

    activeSocket.on(realtimeEvents.cameraCollageViewerReady, handleViewerReady);
    activeSocket.on(realtimeEvents.cameraCollageViewerLeave, handleViewerLeave);
    activeSocket.on(realtimeEvents.cameraCollageAnswer, handleAnswer);
    activeSocket.on(realtimeEvents.cameraCollageIce, handleIce);
    activeSocket.on("connect", announceCamera);
    activeSocket.on("disconnect", closePeers);

    return () => {
      activeSocket.emit(realtimeEvents.cameraCollageUnpublish);
      activeSocket.off(realtimeEvents.cameraCollageViewerReady, handleViewerReady);
      activeSocket.off(realtimeEvents.cameraCollageViewerLeave, handleViewerLeave);
      activeSocket.off(realtimeEvents.cameraCollageAnswer, handleAnswer);
      activeSocket.off(realtimeEvents.cameraCollageIce, handleIce);
      activeSocket.off("connect", announceCamera);
      activeSocket.off("disconnect", closePeers);
      closePeers();
    };
  }, [closePeers, createOfferForViewer, socket]);

  useEffect(
    () => () => {
      closePeers();
      closeCapture();
    },
    [closeCapture, closePeers],
  );

  const start = useCallback(async () => {
    if (streamRef.current) return;
    if (!socket?.connected) {
      setError("Connect to the relay before starting the camera");
      return;
    }
    try {
      const stream = await requestCamera(facingMode);
      streamRef.current = stream;
      setPreviewStream(stream);
      setActive(true);
      setError(null);
      socket.emit(realtimeEvents.cameraCollagePublish);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Camera access failed");
    }
  }, [facingMode, socket]);

  const selectFacingMode = useCallback(
    async (nextFacingMode: CameraFacingMode) => {
      if (nextFacingMode === facingMode) return;
      const currentStream = streamRef.current;
      if (!currentStream) {
        setFacingMode(nextFacingMode);
        return;
      }

      try {
        const nextStream = await requestCamera(nextFacingMode);
        const nextTrack = nextStream.getVideoTracks()[0];
        if (!nextTrack) throw new Error("Camera track unavailable");
        for (const peer of peersRef.current.values()) {
          const sender = peer.getSenders().find((item) => item.track?.kind === "video");
          if (sender) await sender.replaceTrack(nextTrack);
        }
        streamRef.current = nextStream;
        setPreviewStream(nextStream);
        setFacingMode(nextFacingMode);
        setError(null);
        currentStream.getTracks().forEach((track) => track.stop());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not switch cameras");
      }
    },
    [facingMode],
  );

  const stop = useCallback(() => {
    socket?.emit(realtimeEvents.cameraCollageUnpublish);
    closePeers();
    closeCapture();
  }, [closeCapture, closePeers, socket]);

  return { active, error, facingMode, previewRef, selectFacingMode, start, stop };
}
