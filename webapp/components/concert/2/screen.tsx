"use client";

import { useCallback, useEffect, useRef } from "react";
import { useConcertSocket } from "@/hooks/use-concert-socket";
import {
  type CameraCollageStream,
  useCameraCollageViewer,
} from "./transport/use-camera-collage-viewer";
import styles from "./screen.module.css";

const CAMERA_COLLAGE_COLUMNS = 8;
const CAMERA_COLLAGE_ROWS = 5;
const CAMERA_COLLAGE_CAPACITY = CAMERA_COLLAGE_COLUMNS * CAMERA_COLLAGE_ROWS;
const OUTPUT_FRAMES_PER_SECOND = 30;
const MAX_OUTPUT_EDGE = 1920;

function CameraSource({
  publisherId,
  register,
  stream,
}: CameraCollageStream & {
  register: (publisherId: string, video: HTMLVideoElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.muted = true;
    void video.play().catch(() => undefined);

    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    register(publisherId, video);
    return () => register(publisherId, null);
  }, [publisherId, register]);

  return <video autoPlay className={styles.source} muted playsInline ref={videoRef} />;
}

function drawCover(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (sourceWidth === 0 || sourceHeight === 0) return;

  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  context.drawImage(
    video,
    (sourceWidth - cropWidth) / 2,
    (sourceHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    x,
    y,
    width,
    height,
  );
}

export default function CameraCollageScreen() {
  const { socket } = useConcertSocket("screen");
  const streams = useCameraCollageViewer(socket);
  const visibleStreams = streams.slice(0, CAMERA_COLLAGE_CAPACITY);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const streamsRef = useRef<CameraCollageStream[]>(visibleStreams);

  useEffect(() => {
    streamsRef.current = visibleStreams;
  }, [visibleStreams]);

  const registerSource = useCallback((publisherId: string, video: HTMLVideoElement | null) => {
    if (video) sourceVideosRef.current.set(publisherId, video);
    else sourceVideosRef.current.delete(publisherId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let frameId = 0;
    let lastPaintAt = 0;

    const resize = () => {
      const { height, width } = canvas.getBoundingClientRect();
      const outputScale = Math.min(
        window.devicePixelRatio || 1,
        MAX_OUTPUT_EDGE / Math.max(width, height, 1),
      );
      canvas.width = Math.max(1, Math.round(width * outputScale));
      canvas.height = Math.max(1, Math.round(height * outputScale));
    };

    const paint = (now: number) => {
      frameId = requestAnimationFrame(paint);
      if (now - lastPaintAt < 1000 / OUTPUT_FRAMES_PER_SECOND) return;
      lastPaintAt = now;

      const width = canvas.width;
      const height = canvas.height;
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);

      const currentStreams = streamsRef.current;
      if (currentStreams.length === 0) return;

      const gap = 0;
      const padding = 0;
      const tileWidth = (width - padding * 2 - gap * (CAMERA_COLLAGE_COLUMNS - 1)) / CAMERA_COLLAGE_COLUMNS;
      const tileHeight = (height - padding * 2 - gap * (CAMERA_COLLAGE_ROWS - 1)) / CAMERA_COLLAGE_ROWS;

      for (let index = 0; index < CAMERA_COLLAGE_CAPACITY; index += 1) {
        const stream = currentStreams[index % currentStreams.length];
        const video = sourceVideosRef.current.get(stream.publisherId);
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) continue;
        const column = index % CAMERA_COLLAGE_COLUMNS;
        const row = Math.floor(index / CAMERA_COLLAGE_COLUMNS);
        drawCover(
          context,
          video,
          padding + column * (tileWidth + gap),
          padding + row * (tileHeight + gap),
          tileWidth,
          tileHeight,
        );
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frameId = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.grid}>
        <canvas aria-label="Camera collage" className={styles.canvas} ref={canvasRef} />
        {visibleStreams.map((item) => (
          <CameraSource {...item} key={item.publisherId} register={registerSource} />
        ))}
      </div>
    </main>
  );
}
