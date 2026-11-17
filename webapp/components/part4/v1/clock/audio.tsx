"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { activeSong } from "../song";
import type { ParametricSong } from "../song/song";
import { SongClockContext, useReducedMotion } from ".";

// The page's audio. One <audio>, its clock read every frame while playing.
// The page places its own PlayOverlay (play-overlay.tsx).

type SongTransport = {
  readonly start: () => Promise<void>;
  /** Play or pause; starts the song if it has not started. */
  readonly toggle: () => void;
  /** Jumps to a song position, playing or paused as it was; starts the song first if it has not started. */
  readonly seek: (timeMs: number) => Promise<void>;
};

const SongTransportContext = createContext<SongTransport | null>(null);

export function useSongTransport() {
  const transport = useContext(SongTransportContext);
  if (!transport) throw new Error("useSongTransport must be used within AudioSongClock");
  return transport;
}

export function AudioSongClock({ children, song = activeSong }: { children: ReactNode; song?: ParametricSong }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    const update = () => {
      setCurrentTimeMs(Math.round((audioRef.current?.currentTime ?? 0) * 1_000));
      frame = window.requestAnimationFrame(update);
    };
    update();

    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTimeMs(0);

    try {
      await audio.play();
      startedRef.current = true;
      setHasStarted(true);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!startedRef.current) return void start();
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [start]);

  const seek = useCallback(
    async (timeMs: number) => {
      if (!startedRef.current) await start();
      const audio = audioRef.current;
      if (!audio) return;
      const clamped = Math.min(Math.max(0, timeMs), song.durationMs - 50);
      audio.currentTime = clamped / 1_000;
      setCurrentTimeMs(Math.round(clamped));
    },
    [song.durationMs, start],
  );

  const clock = useMemo(
    () => ({ song, currentTimeMs, hasStarted, isPlaying, reducedMotion }),
    [currentTimeMs, hasStarted, isPlaying, reducedMotion, song],
  );
  const transport = useMemo(() => ({ start, toggle, seek }), [seek, start, toggle]);

  return (
    <SongTransportContext.Provider value={transport}>
      <SongClockContext.Provider value={clock}>
        <audio
          aria-hidden="true"
          onEnded={() => {
            setCurrentTimeMs(song.durationMs);
            setIsPlaying(false);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onTimeUpdate={(event) => setCurrentTimeMs(Math.round(event.currentTarget.currentTime * 1_000))}
          preload="auto"
          ref={audioRef}
          src={song.audioSrc}
        />
        {children}
      </SongClockContext.Provider>
    </SongTransportContext.Provider>
  );
}
