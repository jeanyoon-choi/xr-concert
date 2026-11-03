import type { StyleSpecification } from "maplibre-gl";

// Google Maps' 2026 light palette, sampled from google.com/maps over Midtown
// Manhattan (Google zoom 15) on 2026-11-03, applied to OpenStreetMap data from
// OpenFreeMap (OpenMapTiles schema). MapLibre draws geometry only; labels and
// pins are an overlay (see labels.ts), so they use Google's own fonts and
// every one of them can be replaced later. The invisible "probe" symbol
// layers exist only so MapLibre's collision decides which labels fit.

export const PALETTE = {
  land: "#f5f3f3",
  commercial: "#f9f0de",
  park: "#c3f1d5",
  parkPath: "#8fd6b9",
  water: "#91daee",
  road: "#d7e0e7",
  roadCasing: "#bdc8d0",
  highway: "#c9d3dc",
  highwayCasing: "#aab7c2",
  rail: "#c4cad1",
  pier: "#ebe9ec",
} as const;

const PROBE_FONT = ["Noto Sans Regular"];

export const PROBE_LAYERS = {
  street: "probe-street",
  place: "probe-place",
  poi: "probe-poi",
  water: "probe-water",
} as const;

export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    openmaptiles: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
  },
  layers: [
    { id: "land", type: "background", paint: { "background-color": PALETTE.land } },
    {
      id: "landuse-commercial",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landuse",
      filter: ["in", ["get", "class"], ["literal", ["commercial", "retail"]]],
      paint: { "fill-color": PALETTE.commercial },
    },
    {
      id: "park",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "park",
      paint: { "fill-color": PALETTE.park },
    },
    {
      id: "landcover-green",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "landcover",
      filter: ["in", ["get", "class"], ["literal", ["grass", "wood", "farmland"]]],
      paint: { "fill-color": PALETTE.park },
    },
    {
      id: "pier",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["==", ["get", "class"], "pier"],
      paint: { "fill-color": PALETTE.pier },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": PALETTE.water },
    },
    {
      id: "waterway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "waterway",
      paint: { "line-color": PALETTE.water, "line-width": 1.2 },
    },
    {
      id: "park-path",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      // Trails only: Manhattan's mapped sidewalks (footway) are not drawn.
      filter: [
        "all",
        ["in", ["get", "class"], ["literal", ["path", "track"]]],
        ["in", ["get", "subclass"], ["literal", ["path", "track", "bridleway"]]],
        ["!=", ["get", "brunnel"], "tunnel"],
      ],
      paint: { "line-color": PALETTE.parkPath, "line-width": 0.8 },
    },
    {
      id: "rail",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["get", "class"], "rail"], ["!=", ["get", "brunnel"], "tunnel"]],
      paint: { "line-color": PALETTE.rail, "line-width": 1.2 },
    },
    {
      id: "road-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "all",
        ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary", "secondary", "primary", "trunk"]]],
        ["!=", ["get", "brunnel"], "tunnel"],
      ],
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: {
        "line-color": PALETTE.roadCasing,
        "line-width": [
          "match",
          ["get", "class"],
          ["primary", "trunk"], 6.4,
          ["secondary", "tertiary"], 5.4,
          "service", 2.2,
          3.6,
        ],
      },
    },
    {
      id: "road",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: [
        "all",
        ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary", "secondary", "primary", "trunk"]]],
        ["!=", ["get", "brunnel"], "tunnel"],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": PALETTE.road,
        "line-width": [
          "match",
          ["get", "class"],
          ["primary", "trunk"], 5,
          ["secondary", "tertiary"], 4,
          "service", 1.2,
          2.4,
        ],
      },
    },
    {
      id: "highway-casing",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["get", "class"], "motorway"], ["!=", ["get", "brunnel"], "tunnel"]],
      layout: { "line-join": "round" },
      paint: { "line-color": PALETTE.highwayCasing, "line-width": ["case", ["==", ["get", "ramp"], 1], 3.4, 7.4] },
    },
    {
      id: "highway",
      type: "line",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["get", "class"], "motorway"], ["!=", ["get", "brunnel"], "tunnel"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": PALETTE.highway, "line-width": ["case", ["==", ["get", "ramp"], 1], 2.2, 6] },
    },
    {
      id: "oneway",
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation",
      filter: ["all", ["==", ["get", "oneway"], 1], ["in", ["get", "class"], ["literal", ["minor", "tertiary", "secondary", "primary"]]]],
      layout: {
        "symbol-placement": "line",
        "symbol-spacing": 150,
        "icon-image": "oneway-arrow",
        "icon-size": 1,
        "icon-allow-overlap": false,
      },
    },
    // Probes: invisible, sized like the overlay labels so collision matches.
    // Later layers are placed first: neighbourhoods, water, streets, places.
    {
      id: PROBE_LAYERS.poi,
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "poi",
      filter: ["<=", ["get", "rank"], 45],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": PROBE_FONT,
        "text-size": 13,
        "text-max-width": 9,
        "text-anchor": "left",
        "text-offset": [1.2, 0],
        "text-padding": 8,
        "symbol-sort-key": ["get", "rank"],
      },
      paint: { "text-opacity": 0 },
    },
    {
      id: PROBE_LAYERS.street,
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "transportation_name",
      filter: ["in", ["get", "class"], ["literal", ["minor", "tertiary", "secondary", "primary", "trunk", "motorway"]]],
      layout: {
        "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
        "text-font": PROBE_FONT,
        "text-size": 11,
        "symbol-placement": "line",
        "symbol-spacing": 260,
        "text-padding": 4,
        // Avenues are placed before cross streets, as on Google Maps.
        "symbol-sort-key": ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], 0, 1],
      },
      paint: { "text-opacity": 0 },
    },
    {
      id: PROBE_LAYERS.water,
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "water_name",
      layout: { "text-field": ["get", "name:en"], "text-font": PROBE_FONT, "text-size": 13, "symbol-placement": "point" },
      paint: { "text-opacity": 0 },
    },
    {
      id: PROBE_LAYERS.place,
      type: "symbol",
      source: "openmaptiles",
      "source-layer": "place",
      filter: ["in", ["get", "class"], ["literal", ["neighbourhood", "quarter"]]],
      layout: {
        "text-field": ["upcase", ["coalesce", ["get", "name:en"], ["get", "name"]]],
        "text-font": PROBE_FONT,
        "text-size": 12,
        "text-letter-spacing": 0.1,
        "text-padding": 14,
      },
      paint: { "text-opacity": 0 },
    },
  ],
};
