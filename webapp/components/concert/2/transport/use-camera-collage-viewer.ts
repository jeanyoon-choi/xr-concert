"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { realtimeEvents } from "@/lib/realtime/events";
import { getIceServers } from "@/lib/realtime/origin";

export type CameraCollageStream = {
  publisherId: string;
  stream: MediaStream;
};

export function useCameraCollageViewer(socket: Socket | null) {
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const candidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const [streams, setStreams] = useState<CameraCollageStream[]>([]);

  const removePublisher = useCallback((publisherId: string) => {
    peersRef.current.get(publisherId)?.close();
    peersRef.current.delete(publisherId);
    candidatesRef.current.delete(publisherId);
    setStreams((current) => current.filter((item) => item.publisherId !== publisherId));
  }, []);

  const closeAll = useCallback(() => {
    for (const peer of peersRef.current.values()) peer.close();
    peersRef.current.clear();
    candidatesRef.current.clear();
    setStreams([]);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const activeSocket = socket;

    async function handleOffer({
      fromId,
      description,
    }: {
      fromId: string;
      description: RTCSessionDescriptionInit;
    }) {
      removePublisher(fromId);
      try {
        const peer = new RTCPeerConnection({ iceServers: getIceServers() });
        peersRef.current.set(fromId, peer);
        peer.onicecandidate = (event) => {
          if (event.candidate) {
            activeSocket.emit(realtimeEvents.cameraCollageIce, {
              targetId: fromId,
              candidate: event.candidate,
            });
          }
        };
        peer.ontrack = (event) => {
          const stream = event.streams[0] ?? new MediaStream([event.track]);
          setStreams((current) => [
            ...current.filter((item) => item.publisherId !== fromId),
            { publisherId: fromId, stream },
          ]);
        };
        await peer.setRemoteDescription(description);
        for (const candidate of candidatesRef.current.get(fromId) || []) {
          await peer.addIceCandidate(candidate);
        }
        candidatesRef.current.delete(fromId);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        activeSocket.emit(realtimeEvents.cameraCollageAnswer, {
          targetId: fromId,
          description: peer.localDescription,
        });
      } catch {
        removePublisher(fromId);
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
        // The publisher may have left while this candidate was in flight.
      }
    }

    function announceViewer() {
      activeSocket.emit(realtimeEvents.cameraCollageViewerReady);
    }

    function handlePublisherLeave({ publisherId }: { publisherId: string }) {
      removePublisher(publisherId);
    }

    activeSocket.on(realtimeEvents.cameraCollageOffer, handleOffer);
    activeSocket.on(realtimeEvents.cameraCollageIce, handleIce);
    activeSocket.on(realtimeEvents.cameraCollagePublisherLeave, handlePublisherLeave);
    activeSocket.on("connect", announceViewer);
    activeSocket.on("disconnect", closeAll);
    announceViewer();

    return () => {
      activeSocket.emit(realtimeEvents.cameraCollageViewerLeave);
      activeSocket.off(realtimeEvents.cameraCollageOffer, handleOffer);
      activeSocket.off(realtimeEvents.cameraCollageIce, handleIce);
      activeSocket.off(realtimeEvents.cameraCollagePublisherLeave, handlePublisherLeave);
      activeSocket.off("connect", announceViewer);
      activeSocket.off("disconnect", closeAll);
      closeAll();
    };
  }, [closeAll, removePublisher, socket]);

  return streams;
}
