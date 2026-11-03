"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { ICON_VIEWBOX, ICONS } from "../chrome/icons";
import styles from "../google-maps.module.css";
import { POI_STYLE, readLabels, type MapLabels } from "./labels";
import { LYRIC_LEAD_MS, useLyricCue } from "../../timeline/use-lyric-cue";
import { journeyFor, placeName } from "./journey";
import { LINE_FADE_MS, tripFrame, type TripFrame } from "./motion";
import { readStreetGraph, type Rect, type StreetGraph } from "./streets";
import { mapStyle } from "./style";

// Midtown Manhattan as google.com/maps/@40.758,-73.9855,15z frames it. Google
// counts zoom in 256 px tiles, MapLibre in 512 px tiles, hence 15 → 14.
const CENTER: [number, number] = [-73.9855, 40.758];
const ZOOM = 14;

const WORKER_URL = new URL(
  "../../../../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs",
  import.meta.url,
).href;

const EMPTY: MapLabels = { streets: [], places: [], pois: [], waters: [] };

// Google's small grey one-way arrow, drawn once into the style.
function onewayArrow() {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = 14 * scale;
  canvas.height = 8 * scale;
  const context = canvas.getContext("2d")!;
  context.scale(scale, scale);
  context.strokeStyle = "#8d99a3";
  context.fillStyle = "#8d99a3";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(1, 4);
  context.lineTo(9, 4);
  context.stroke();
  context.beginPath();
  context.moveTo(13, 4);
  context.lineTo(8.5, 1.2);
  context.lineTo(8.5, 6.8);
  context.closePath();
  context.fill();
  return { image: context.getImageData(0, 0, canvas.width, canvas.height), pixelRatio: scale };
}

// The open map: the largest rectangle not covered by the rail, the search
// panel, chips, account, controls, Layers, wordmark or bottom bar, measured
// from the chrome as rendered at the current viewport.
const EDGE = 14;

function clearMapRect(): Rect {
  const box = (name: string) => document.querySelector(`[data-map-chrome="${name}"]`)?.getBoundingClientRect();
  const width = window.innerWidth;
  const height = window.innerHeight;
  const rail = box("rail");
  const search = box("search");
  const chips = box("chips");
  const account = box("account");
  const controls = box("controls");
  const lows = ["bottom", "layers", "imagery", "wordmark"].map(box).filter((rect) => rect !== undefined);

  const topOfChips = Math.max(chips?.bottom ?? 0, account?.bottom ?? 0) + EDGE;
  const bottom = Math.min(height, ...lows.map((rect) => rect.top)) - EDGE;
  const right = Math.min(width, controls?.left ?? width) - EDGE;
  const railRight = (rail?.right ?? 0) + EDGE;

  // Either beside the search panel, or below it: keep the larger.
  const beside = { left: (search?.right ?? 0) + EDGE, top: topOfChips, right, bottom };
  const below = { left: railRight, top: Math.max(topOfChips, (search?.bottom ?? 0) + EDGE), right, bottom };
  const area = (rect: Rect) => Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top);
  return area(beside) >= area(below) ? beside : below;
}

// Dense Midtown (Times Square to Rockefeller Center) is centred once in the
// clear map area, at Google's zoom 15.
const MIDTOWN_CENTER: [number, number] = [-73.9835, 40.7585];

export default function GoogleMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [labels, setLabels] = useState<MapLabels>(EMPTY);
  const [graph, setGraph] = useState<StreetGraph | null>(null);
  const { activeWordPosition, cueIndex, currentTimeMs, hasStarted, lyric, reducedMotion, song } = useLyricCue();
  const [clear, setClear] = useState<Rect | null>(null);

  // Every frame comes from the audio clock (the playback context updates it
  // each animation frame while playing and on every seek), so a seek lands on
  // exactly the frame playback would have shown. Routes are memoised per line.
  const clockMs = currentTimeMs + LYRIC_LEAD_MS;
  const hasBegun = hasStarted && clockMs >= (song.lyrics[0]?.startMs ?? 0);
  const line = song.lyrics[cueIndex];
  const previousLine = cueIndex > 0 ? song.lyrics[cueIndex - 1] : undefined;
  const journey = useMemo(
    () => journeyFor(labels.pois, graph, clear, cueIndex, lyric.length),
    [clear, cueIndex, graph, labels.pois, lyric.length],
  );
  const previousJourney = useMemo(
    () => (previousLine ? journeyFor(labels.pois, graph, clear, cueIndex - 1, previousLine.words.length) : null),
    [clear, cueIndex, graph, labels.pois, previousLine],
  );

  const sungCount = hasBegun ? activeWordPosition + 1 : 0;
  const current = tripFrame(journey, line, song.lyrics[cueIndex + 1]?.startMs ?? song.durationMs, clockMs, sungCount, reducedMotion);
  const lineStartMs = line?.words[0]?.startMs ?? 0;
  const fade = reducedMotion ? 1 : (clockMs - lineStartMs) / LINE_FADE_MS;
  const previous =
    hasBegun && previousJourney && previousLine && fade < 1
      ? tripFrame(previousJourney, previousLine, lineStartMs, Number.MAX_SAFE_INTEGER, previousLine.words.length, true)
      : null;
  const trips: { key: string; frame: TripFrame; words: readonly string[]; opacity: number }[] = [
    ...(previous && previousLine
      ? [{ key: `line-${cueIndex - 1}`, frame: previous, words: previousLine.words.map((word) => word.text), opacity: 1 - Math.max(0, fade) }]
      : []),
    { key: `line-${cueIndex}`, frame: current, words: lyric, opacity: 1 },
  ];
  const poiById = new Map(labels.pois.map((poi) => [poi.id, poi]));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;
    let fitOnResize = () => {};

    void import("maplibre-gl").then(({ Map, setWorkerUrl }) => {
      if (cancelled) return;
      // The bundler moves MapLibre's chunks, so its worker is referenced
      // explicitly as an asset of this module.
      setWorkerUrl(WORKER_URL);
      map = new Map({
        container,
        style: mapStyle,
        center: CENTER,
        zoom: ZOOM,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
      });
      const instance = map;
      const fit = () => {
        const area = clearMapRect();
        instance.jumpTo({
          center: MIDTOWN_CENTER,
          zoom: ZOOM,
          padding: {
            left: area.left,
            top: area.top,
            right: window.innerWidth - area.right,
            bottom: window.innerHeight - area.bottom,
          },
        });
      };
      instance.on("load", () => {
        const { image, pixelRatio } = onewayArrow();
        if (!instance.hasImage("oneway-arrow")) instance.addImage("oneway-arrow", image, { pixelRatio });
        fit();
      });
      instance.on("idle", () => {
        const area = clearMapRect();
        setClear(area);
        setLabels(readLabels(instance));
        setGraph(readStreetGraph(instance, area));
      });
      fitOnResize = fit;
    });

    const resize = () => {
      map?.resize();
      fitOnResize();
    };
    window.addEventListener("resize", resize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", resize);
      map?.remove();
    };
  }, []);

  return (
    <div className={styles.map}>
      {/* MapLibre makes its container position: relative, so it sits inside a sized frame. */}
      <div className={styles.mapCanvas}>
        <div className={styles.mapContainer} ref={containerRef} />
      </div>

      <svg aria-hidden="true" className={styles.mapLabels}>
        {labels.waters.map((label) => (
          <text className={styles.waterLabel} key={label.id} textAnchor="middle" x={label.x} y={label.y}>{label.text}</text>
        ))}
        {labels.streets.map((label) => (
          <text
            className={label.major ? styles.majorStreetLabel : styles.streetLabel}
            key={label.id}
            textAnchor="middle"
            transform={`rotate(${label.angle} ${label.x} ${label.y})`}
            x={label.x}
            y={label.y + 4}
          >
            {label.text}
          </text>
        ))}
        {labels.places.map((label) => (
          <text className={styles.placeLabel} key={label.id} textAnchor="middle" x={label.x} y={label.y}>{label.text}</text>
        ))}
      </svg>

      {/* Directions: each leg drawn along its streets, white casing under
          Google's route blue, both cut to the same length. */}
      <svg aria-hidden="true" className={styles.mapLabels}>
        {trips.map((trip) => (
          <g key={trip.key} opacity={trip.opacity}>
            {trip.frame.legs.map((leg, index) => (
              <polyline className={styles.routeCasing} key={`casing-${index}`} points={leg.map((point) => `${point.x},${point.y}`).join(" ")} />
            ))}
            {trip.frame.legs.map((leg, index) => (
              <polyline className={styles.routeLine} key={`line-${index}`} points={leg.map((point) => `${point.x},${point.y}`).join(" ")} />
            ))}
          </g>
        ))}
      </svg>

      {/* Only the places that carry sung words are on the map. */}
      <div aria-hidden="true" className={styles.pins}>
        {trips.flatMap((trip) =>
          trip.frame.places.map((place) => {
            const poi = poiById.get(place.id);
            if (!poi) return null;
            const word = placeName(trip.words[place.word] ?? "");
            const key = `${trip.key}-${place.id}`;

            if (trip.frame.destination?.id === place.id) {
              return (
                <div className={styles.destination} key={key} style={{ left: poi.x, top: poi.y, opacity: trip.opacity }}>
                  <svg className={styles.destinationPin} style={{ transform: `translateY(${trip.frame.destination.dropY}px)` }} viewBox="0 0 27 43">
                    <path d="M13.5 0C6 0 0 6 0 13.4 0 23.5 13.5 43 13.5 43S27 23.5 27 13.4C27 6 21 0 13.5 0z" />
                    <circle cx="13.5" cy="13.5" r="4.6" />
                  </svg>
                  <span className={styles.destinationName}>{word}</span>
                </div>
              );
            }

            const look = POI_STYLE[poi.category];
            return (
              <div className={styles.poi} key={key} style={{ left: poi.x, top: poi.y, opacity: place.opacity * trip.opacity }}>
                <span className={styles.pin} style={{ background: look.pin }}>
                  <svg viewBox={ICON_VIEWBOX}><path d={ICONS[look.icon]} /></svg>
                </span>
                <span className={styles.poiName} style={{ color: look.text }}>{word}</span>
              </div>
            );
          }),
        )}
      </div>

      {/* Stops sit above the places' own icons, as on Google's directions. */}
      <svg aria-hidden="true" className={styles.mapLabels}>
        {trips.map((trip) => (
          <g key={trip.key} opacity={trip.opacity}>
            {trip.frame.waypoints.map((id, index) => {
              const poi = poiById.get(id);
              return poi ? (
                <circle className={index === 0 ? styles.routeOrigin : styles.routeStop} cx={poi.x} cy={poi.y} key={id} r={index === 0 ? 7 : 6} />
              ) : null;
            })}
          </g>
        ))}
      </svg>
    </div>
  );
}
