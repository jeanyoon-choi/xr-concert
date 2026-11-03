"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activityAt, PARTS, type PartKey } from "./model/score";
import { buildTopology, DEFAULT_CONFIG, LIMITS, normalizeConfig, type TopologyConfig } from "./model/topology";
import styles from "./schematic.module.css";
import { Schematic } from "./view/schematic";

// Study 1: the concert drawn as one circuit. Scripted activity only; the
// topology and score are pure so a live adapter can replace the score later.

const PHONE_PRESETS = [5, 24, 60, 100] as const;

function readQueryConfig(): Partial<TopologyConfig> {
  const params = new URLSearchParams(window.location.search);
  const read = (key: string) => {
    const value = params.get(key);
    return value === null ? undefined : Number(value);
  };
  const latencies = params
    .get("latency")
    ?.split(",")
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return {
    local: read("local"),
    remote: read("remote"),
    phones: read("phones"),
    latenciesMs: latencies && latencies.length > 0 ? latencies : undefined,
  };
}

function isPartKey(value: string): value is PartKey {
  return PARTS.some((part) => part.key === value);
}

export default function SchematicStudy() {
  const [config, setConfig] = useState<TopologyConfig>(DEFAULT_CONFIG);
  const [scene, setScene] = useState<{ part: PartKey; start: number }>({ part: "0", start: 0 });
  const [clock, setClock] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const origin = useRef<number | null>(null);

  useEffect(() => {
    // URL parameters are read after mount so server and client markup agree.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConfig(normalizeConfig(readQueryConfig()));
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      if (origin.current === null) origin.current = now;
      setClock((now - origin.current) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const selectPart = useCallback(
    (next: PartKey) => setScene({ part: next, start: clock }),
    [clock],
  );

  const adjust = useCallback((key: "local" | "remote", delta: number) => {
    setConfig((current) => normalizeConfig({ ...current, [key]: current[key] + delta }));
  }, []);

  const cyclePhones = useCallback(() => {
    setConfig((current) => {
      const index = PHONE_PRESETS.findIndex((preset) => preset > current.phones);
      return normalizeConfig({ ...current, phones: PHONE_PRESETS[index === -1 ? 0 : index] });
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isPartKey(event.key)) selectPart(event.key);
      else if (event.key === "h") setControlsVisible((visible) => !visible);
      else if (event.key === "[") adjust("local", -1);
      else if (event.key === "]") adjust("local", 1);
      else if (event.key === ";") adjust("remote", -1);
      else if (event.key === "'") adjust("remote", 1);
      else if (event.key === "p") cyclePhones();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adjust, cyclePhones, selectPart]);

  const topology = useMemo(() => buildTopology(config), [config]);
  const { part } = scene;
  const t = Math.max(0, clock - scene.start);
  const activity = activityAt(topology, part, t);

  return (
    <main className={styles.root}>
      <Schematic
        topology={topology}
        activity={activity}
        part={part}
        t={t}
        clock={clock}
        reducedMotion={reducedMotion}
      />
      <button
        type="button"
        className={`${styles.button} ${styles.toggle}`}
        aria-expanded={controlsVisible}
        aria-controls="schematic-options"
        onClick={() => setControlsVisible((visible) => !visible)}
      >
        {controlsVisible ? "Close" : "Options"}
      </button>
      {controlsVisible ? (
        <nav id="schematic-options" className={styles.controls} aria-label="Schematic options">
          <div className={styles.group} role="group" aria-label="Part">
            {PARTS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={styles.button}
                aria-pressed={part === entry.key}
                onClick={() => selectPart(entry.key)}
              >
                {entry.key}
              </button>
            ))}
          </div>
          <Stepper
            label="Local"
            value={config.local}
            min={LIMITS.local.min}
            max={LIMITS.local.max}
            onChange={(delta) => adjust("local", delta)}
          />
          <Stepper
            label="Remote"
            value={config.remote}
            min={LIMITS.remote.min}
            max={LIMITS.remote.max}
            onChange={(delta) => adjust("remote", delta)}
          />
          <button type="button" className={styles.button} onClick={cyclePhones}>
            {config.phones} phones
          </button>
        </nav>
      ) : null}
    </main>
  );
}

function Stepper({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (delta: number) => void;
}) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        disabled={value <= min}
        aria-label={`Fewer ${label.toLowerCase()} performers`}
        onClick={() => onChange(-1)}
      >
        −
      </button>
      <span className={styles.value}>
        {label} {value}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={value >= max}
        aria-label={`More ${label.toLowerCase()} performers`}
        onClick={() => onChange(1)}
      >
        +
      </button>
    </div>
  );
}
