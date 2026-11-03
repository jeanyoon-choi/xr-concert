"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { activeParametricSong } from "../model/songs";
import type { ParametricSong } from "../model/song";
import { SongClockContext, useReducedMotion, type ClockAnchor } from ".";
import styles from "./play-overlay.module.css";

// The surface that owns the audio. One <audio>, its clock read every frame
// while playing (as in v2), and an anchor reported on every transport change
// plus once a second so followers in other tabs stay on it.

type SongTransport = {
  readonly start: () => Promise<void>;
  readonly toggle: () => void;
  readonly anchor: () => ClockAnchor;
};

const SongTransportContext = createContext<SongTransport | null>(null);

export function useSongTransport() {
  const transport = useContext(SongTransportContext);
  if (!transport) throw new Error("useSongTransport must be used within AudioSongClock");
  return transport;
}

const HEARTBEAT_MS = 1_000;

export function AudioSongClock({
  children,
  song = activeParametricSong,
  overlay = true,
  onAnchor,
}: {
  children: ReactNode;
  song?: ParametricSong;
  /** The round play button over the page until the first start. */
  overlay?: boolean;
  onAnchor?: (anchor: ClockAnchor) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const reducedMotion = useReducedMotion();
  const startedRef = useRef(false);
  const onAnchorRef = useRef(onAnchor);

  useEffect(() => {
    onAnchorRef.current = onAnchor;
  });

  const anchor = useCallback((): ClockAnchor => {
    const audio = audioRef.current;
    return {
      songId: song.id,
      positionMs: Math.round((audio?.currentTime ?? 0) * 1_000),
      playing: Boolean(audio && !audio.paused && !audio.ended),
      started: startedRef.current,
      at: Date.now(),
    };
  }, [song.id]);

  const report = useCallback(() => onAnchorRef.current?.(anchor()), [anchor]);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    const update = () => {
      setCurrentTimeMs(Math.round((audioRef.current?.currentTime ?? 0) * 1_000));
      frame = window.requestAnimationFrame(update);
    };
    update();
    const heartbeat = window.setInterval(report, HEARTBEAT_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(heartbeat);
    };
  }, [isPlaying, report]);

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
    report();
  }, [report]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !startedRef.current) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  const clock = useMemo(
    () => ({ song, currentTimeMs, hasStarted, isPlaying, reducedMotion }),
    [currentTimeMs, hasStarted, isPlaying, reducedMotion, song],
  );
  const transport = useMemo(() => ({ start, toggle, anchor }), [anchor, start, toggle]);

  return (
    <SongTransportContext.Provider value={transport}>
      <SongClockContext.Provider value={clock}>
        <audio
          aria-hidden="true"
          onEnded={() => {
            setCurrentTimeMs(song.durationMs);
            setIsPlaying(false);
            report();
          }}
          onPause={() => {
            setIsPlaying(false);
            report();
          }}
          onPlay={() => {
            setIsPlaying(true);
            report();
          }}
          onSeeked={report}
          onTimeUpdate={(event) => setCurrentTimeMs(Math.round(event.currentTarget.currentTime * 1_000))}
          preload="auto"
          ref={audioRef}
          src={song.audioSrc}
        />
        {children}
        {overlay && !hasStarted ? (
          <div className={styles.overlay}>
            <button
              aria-label={`Play ${song.title}`}
              className={styles.playButton}
              data-parametric-play-control
              onClick={(event) => {
                event.stopPropagation();
                void start();
              }}
              type="button"
            >
              <span aria-hidden="true" className={styles.playIcon} />
            </button>
          </div>
        ) : null}
      </SongClockContext.Provider>
    </SongTransportContext.Provider>
  );
}
