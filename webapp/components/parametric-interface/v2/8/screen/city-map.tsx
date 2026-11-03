"use client";

import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  buildings,
  cityBounds,
  PLANE_SIZE,
  parks,
  roads,
  shorelinePath,
  type Point,
} from "../model/city";
import type { CuePlace, MapCamera, PlaceCategory } from "../model/route";
import { trackedPerson } from "../model/people";
import styles from "./find-my.module.css";

const TILT_3D = 54;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 1.25;
const ANCHOR_Y = 0.6;

type Viewport = { width: number; height: number };

type Projection = {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
};

/**
 * Mirrors the plane's CSS transform
 * `translate(anchor) rotateX(tilt) scale3d(zoom) rotateZ(heading) translate(-camera)`
 * under the viewport's perspective, so 2D labels sit on their 3D ground point.
 */
function project(point: Point, camera: MapCamera, tilt: number, zoom: number, viewport: Viewport): Projection {
  const heading = (camera.rotation * Math.PI) / 180;
  const pitch = (tilt * Math.PI) / 180;
  const dx = point.x - camera.x;
  const dy = point.y - camera.y;
  const x = (dx * Math.cos(heading) - dy * Math.sin(heading)) * zoom;
  const y = (dx * Math.sin(heading) + dy * Math.cos(heading)) * zoom;
  const tiltedY = y * Math.cos(pitch);
  const depth = y * Math.sin(pitch);
  const distance = perspectiveFor(viewport);
  const scale = distance / (distance - depth);
  const screenX = viewport.width / 2 + x * scale;
  const screenY = viewport.height * ANCHOR_Y + tiltedY * scale;

  return {
    x: screenX,
    y: screenY,
    visible:
      distance - depth > 80 &&
      screenX > -80 &&
      screenX < viewport.width + 80 &&
      screenY > -40 &&
      screenY < viewport.height + 80,
  };
}

function perspectiveFor(viewport: Viewport) {
  return Math.max(viewport.width, viewport.height) * 1.05;
}

const GroundPlane = memo(function GroundPlane() {
  return (
    <svg
      aria-hidden="true"
      className={styles.ground}
      height={PLANE_SIZE}
      viewBox={`0 0 ${PLANE_SIZE} ${PLANE_SIZE}`}
      width={PLANE_SIZE}
    >
      <rect fill="#f3f1ec" height={PLANE_SIZE} width={PLANE_SIZE} />
      {parks.map((park) => (
        <rect
          fill="#cde8bf"
          height={park.height}
          key={park.id}
          rx={7}
          width={park.width}
          x={park.x}
          y={park.y}
        />
      ))}
      {[false, true].map((major) =>
        roads
          .filter((road) => road.major === major)
          .map((road) => {
            const vertical = road.axis === "y";
            const length = cityBounds.end - cityBounds.start + 220;
            const start = cityBounds.start - 110;
            return (
              <g key={road.id}>
                <rect
                  fill={major ? "#ecd99b" : "#e3e0d8"}
                  height={vertical ? length : road.width + 3}
                  width={vertical ? road.width + 3 : length}
                  x={vertical ? road.offset - (road.width + 3) / 2 : start}
                  y={vertical ? start : road.offset - (road.width + 3) / 2}
                />
                <rect
                  fill={major ? "#fcf0c6" : "#ffffff"}
                  height={vertical ? length : road.width}
                  width={vertical ? road.width : length}
                  x={vertical ? road.offset - road.width / 2 : start}
                  y={vertical ? start : road.offset - road.width / 2}
                />
              </g>
            );
          }),
      )}
      <path d={shorelinePath()} fill="#a8d2f4" stroke="#96c4ea" strokeWidth={3} />
      {roads
        .filter((road) => road.name)
        .flatMap((road) =>
          [0.32, 0.68].map((at) => {
            const along = cityBounds.start + (cityBounds.end - cityBounds.start) * at;
            const vertical = road.axis === "y";
            return (
              <text
                className={styles.roadName}
                key={`${road.id}-${at}`}
                textAnchor="middle"
                transform={
                  vertical
                    ? `translate(${road.offset} ${along}) rotate(90)`
                    : `translate(${along} ${road.offset})`
                }
                y={4.5}
              >
                {road.name}
              </text>
            );
          }),
        )}
    </svg>
  );
});

const CityBuildings = memo(function CityBuildings() {
  return (
    <div aria-hidden="true" className={styles.buildings}>
      {buildings.map((building) => (
        <div
          className={styles.building}
          key={building.id}
          style={
            {
              left: building.x,
              top: building.y,
              width: building.width,
              height: building.depth,
              "--height": `${building.height}px`,
            } as CSSProperties
          }
        >
          <i className={styles.faceSouth} />
          <i className={styles.faceEast} />
          <i className={styles.faceWest} />
          <i className={styles.roof} />
        </div>
      ))}
    </div>
  );
});

function PlaceGlyph({ category }: { category: PlaceCategory }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.1,
  };

  return (
    <svg aria-hidden="true" className={styles.placeGlyph} viewBox="0 0 24 24">
      {category === "cafe" ? (
        <path {...common} d="M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.4a2.4 2.4 0 0 1 0 4.8H16" />
      ) : category === "restaurant" ? (
        <path {...common} d="M8 3v18M5.5 3v5a2.5 2.5 0 0 0 5 0V3M17 21V3c-2.2 1.4-3 4-3 8h3" />
      ) : category === "shopping" ? (
        <path {...common} d="M5.5 8.5h13l-1 11.5h-11zM9 8.5a3 3 0 0 1 6 0" />
      ) : category === "park" ? (
        <path {...common} d="M12 3.5 17 11h-3l4 6H6l4-6H7zM12 17v3.5" />
      ) : category === "transit" ? (
        <path {...common} d="M7.5 4h9A2.5 2.5 0 0 1 19 6.5v8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 14.5v-8A2.5 2.5 0 0 1 7.5 4zM5 11h14M9 20.5l1.5-3.5M15 20.5 13.5 17" />
      ) : (
        <path
          {...common}
          d="m12 3.8 2.4 5 5.4.6-4 3.7 1.1 5.4L12 15.8l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"
        />
      )}
    </svg>
  );
}

function AppleMark() {
  return (
    <svg aria-hidden="true" className={styles.attributionMark} viewBox="3 2.4 20.2 24.8">
      <path d="M19.67 15.44c.03-3.03 2.48-4.49 2.59-4.56-1.41-2.07-3.61-2.35-4.39-2.38-1.87-.19-3.65 1.1-4.6 1.1-.95 0-2.42-1.07-3.98-1.04-2.05.03-3.94 1.19-5 3.02-2.13 3.69-.55 9.16 1.53 12.16 1.01 1.46 2.22 3.11 3.8 3.05 1.53-.06 2.11-.99 3.96-.99 1.85 0 2.37.99 3.98.96 1.64-.03 2.68-1.49 3.69-2.96 1.16-1.7 1.64-3.34 1.67-3.43-.04-.02-3.21-1.23-3.25-4.93ZM16.64 6.53c.84-1.02 1.41-2.44 1.25-3.86-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.35-1.28 3.74 1.35.1 2.73-.69 3.58-1.71Z" />
    </svg>
  );
}

export default function CityMap({
  activeWordPosition,
  camera,
  person,
  places,
  trail,
}: {
  activeWordPosition: number;
  camera: MapCamera;
  person: Point;
  places: readonly CuePlace[];
  trail: readonly Point[];
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [zoom, setZoom] = useState(0.92);
  const [northUp, setNorthUp] = useState(false);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const tilt = is3D ? TILT_3D : 0;
  const view = northUp ? { ...camera, rotation: 0 } : camera;
  const trailPoints = trail.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section aria-label="Map" className={styles.map} ref={viewportRef}>
      {viewport ? (
        <>
          <div
            className={styles.perspective}
            style={{
              perspective: `${perspectiveFor(viewport)}px`,
              perspectiveOrigin: `${viewport.width / 2}px ${viewport.height * ANCHOR_Y}px`,
            }}
          >
            <div
              className={styles.plane}
              style={{
                width: PLANE_SIZE,
                height: PLANE_SIZE,
                transform: `translate3d(${viewport.width / 2}px, ${viewport.height * ANCHOR_Y}px, 0) rotateX(${tilt}deg) scale3d(${zoom}, ${zoom}, ${zoom}) rotateZ(${view.rotation}deg) translate3d(${-view.x}px, ${-view.y}px, 0)`,
              }}
            >
              <GroundPlane />
              <svg
                aria-hidden="true"
                className={styles.trail}
                height={PLANE_SIZE}
                viewBox={`0 0 ${PLANE_SIZE} ${PLANE_SIZE}`}
                width={PLANE_SIZE}
              >
                <polyline className={styles.trailCasing} points={trailPoints} />
                <polyline className={styles.trailLine} points={trailPoints} />
                {trail.slice(0, -1).map((point, index) => (
                  <circle className={styles.trailStop} cx={point.x} cy={point.y} key={index} r={7} />
                ))}
              </svg>
              <CityBuildings />
            </div>
          </div>

          <div className={styles.labels}>
            {places.map((place, index) => {
              const position = project(place.point, view, tilt, zoom, viewport);
              if (!position.visible) return null;
              return (
                <div
                  className={styles.place}
                  data-category={place.category}
                  data-reached={index <= activeWordPosition ? "true" : undefined}
                  data-current={index === activeWordPosition ? "true" : undefined}
                  key={place.id}
                  style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
                >
                  <span className={styles.placeBadge}>
                    <PlaceGlyph category={place.category} />
                  </span>
                  <span className={styles.placeName}>{place.name}</span>
                </div>
              );
            })}
            {(() => {
              const position = project(person, view, tilt, zoom, viewport);
              return position.visible ? (
                <div
                  aria-label={`${trackedPerson.name}’s location`}
                  className={styles.personPin}
                  role="img"
                  style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
                >
                  <span className={styles.personAvatar}>{trackedPerson.initials}</span>
                </div>
              ) : null;
            })()}
          </div>
        </>
      ) : null}

      <div className={styles.topControls}>
        <button
          aria-pressed={is3D}
          className={styles.mapButton}
          onClick={() => setIs3D((current) => !current)}
          type="button"
        >
          3D
        </button>
      </div>

      <div className={styles.bottomControls}>
        {Math.abs(view.rotation) > 0.5 ? (
          <button
            aria-label="Show north"
            className={styles.compass}
            onClick={() => setNorthUp(true)}
            type="button"
          >
            <span className={styles.compassDial} style={{ transform: `rotate(${view.rotation}deg)` }}>
              <i className={styles.compassNeedle} />
              <b>N</b>
            </span>
          </button>
        ) : null}
        <div className={styles.zoomControls} role="group" aria-label="Zoom">
          <button
            aria-label="Zoom in"
            className={styles.zoomButton}
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current * ZOOM_STEP))}
            type="button"
          >
            +
          </button>
          <button
            aria-label="Zoom out"
            className={styles.zoomButton}
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current / ZOOM_STEP))}
            type="button"
          >
            −
          </button>
        </div>
      </div>

      <p className={styles.attribution}>
        <AppleMark />
        <span>Maps</span>
        <span className={styles.legal}>Legal</span>
      </p>
    </section>
  );
}
