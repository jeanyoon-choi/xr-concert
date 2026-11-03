import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { IconName } from "../chrome/icons";
import { PROBE_LAYERS } from "./style";

// Turns the probe layers MapLibre has placed (collision already resolved)
// into overlay labels in screen px, written the way Google Maps writes them.

export type StreetLabel = { id: string; text: string; x: number; y: number; angle: number; major: boolean };
export type PlaceLabel = { id: string; text: string; x: number; y: number };
export type PoiCategory = "food" | "lodging" | "shopping" | "attraction" | "park" | "health" | "education" | "civic" | "worship" | "transit";
export type PoiLabel = { id: string; text: string; x: number; y: number; lng: number; lat: number; category: PoiCategory };
export type MapLabels = {
  streets: StreetLabel[];
  places: PlaceLabel[];
  pois: PoiLabel[];
  waters: PlaceLabel[];
};

export const POI_STYLE: Record<PoiCategory, { pin: string; text: string; icon: IconName }> = {
  food: { pin: "#f28b1e", text: "#b55d00", icon: "filled_restaurant" },
  lodging: { pin: "#f848c7", text: "#c2185b", icon: "filled_hotel" },
  shopping: { pin: "#1a73e8", text: "#1967d2", icon: "filled_shopping_bag" },
  attraction: { pin: "#9334e6", text: "#8430ce", icon: "filled_museum" },
  park: { pin: "#178038", text: "#1d6d33", icon: "filled_park" },
  health: { pin: "#ea4335", text: "#c5221f", icon: "filled_local_hospital" },
  education: { pin: "#7e6f66", text: "#6b5d55", icon: "filled_school" },
  civic: { pin: "#7b8086", text: "#5f6368", icon: "filled_account_balance" },
  worship: { pin: "#7b8086", text: "#5f6368", icon: "filled_church" },
  transit: { pin: "#0039a6", text: "#1f1f1f", icon: "filled_train" },
};

const FOOD = ["restaurant", "fast_food", "cafe", "bar", "beer", "ice_cream", "bakery", "food_court", "pub"];
const SHOPPING = ["shop", "grocery", "clothing_store", "mall", "department_store", "jewelry", "books", "electronics", "supermarket", "alcohol_shop", "florist"];
const ATTRACTION = ["museum", "art_gallery", "attraction", "theatre", "cinema", "music", "monument", "castle", "stadium", "zoo", "aquarium", "entertainment"];
const HEALTH = ["hospital", "doctors", "pharmacy", "dentist", "veterinary"];
const EDUCATION = ["school", "college", "university", "library", "kindergarten"];
const CIVIC = ["town_hall", "post", "police", "fire_station", "bank", "embassy", "office"];

function categoryOf(poiClass: string, subclass: string): PoiCategory | null {
  if (poiClass === "railway" && /subway|station/.test(subclass)) return "transit";
  if (FOOD.includes(poiClass)) return "food";
  if (poiClass === "lodging") return "lodging";
  if (SHOPPING.includes(poiClass)) return "shopping";
  if (ATTRACTION.includes(poiClass)) return "attraction";
  if (poiClass === "park" || poiClass === "garden") return "park";
  if (HEALTH.includes(poiClass)) return "health";
  if (EDUCATION.includes(poiClass)) return "education";
  if (CIVIC.includes(poiClass)) return "civic";
  if (poiClass === "place_of_worship") return "worship";
  return null;
}

const ABBREVIATIONS: [RegExp, string][] = [
  [/^West /, "W "],
  [/^East /, "E "],
  [/^North /, "N "],
  [/^South /, "S "],
  [/ Street$/, " St"],
  [/ Avenue$/, " Ave"],
  [/ Boulevard$/, " Blvd"],
  [/ Place$/, " Pl"],
  [/ Drive$/, " Dr"],
  [/ Road$/, " Rd"],
  [/ Highway$/, " Hwy"],
  [/ Parkway$/, " Pkwy"],
  [/ Expressway$/, " Expy"],
  [/ Square$/, " Sq"],
];

export function abbreviateStreet(name: string) {
  return ABBREVIATIONS.reduce((text, [pattern, short]) => text.replace(pattern, short), name);
}

function nameOf(feature: MapGeoJSONFeature) {
  const properties = feature.properties as Record<string, string | undefined>;
  return properties["name:en"] ?? properties.name ?? "";
}

function linePoints(feature: MapGeoJSONFeature): [number, number][] {
  const geometry = feature.geometry;
  if (geometry.type === "LineString") return geometry.coordinates as [number, number][];
  if (geometry.type === "MultiLineString") {
    return (geometry.coordinates as [number, number][][]).reduce((longest, line) => (line.length > longest.length ? line : longest), []);
  }
  return [];
}

function pointOf(feature: MapGeoJSONFeature): [number, number] | null {
  return feature.geometry.type === "Point" ? (feature.geometry.coordinates as [number, number]) : null;
}

function farFromAll(list: { x: number; y: number; text: string }[], x: number, y: number, text: string, distance: number) {
  return list.every((other) => other.text !== text || Math.hypot(other.x - x, other.y - y) > distance);
}

export function readLabels(map: MapLibreMap): MapLabels {
  const canvas = map.getCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const inView = (x: number, y: number) => x > 0 && y > 0 && x < width && y < height;

  const streets: StreetLabel[] = [];
  for (const feature of map.queryRenderedFeatures({ layers: [PROBE_LAYERS.street] })) {
    const name = nameOf(feature);
    const projected = linePoints(feature).map((coordinate) => map.project(coordinate));
    if (!name || projected.length < 2) continue;

    // Middle of the visible run of the line.
    const visible = projected.filter((point) => inView(point.x, point.y));
    const run = visible.length >= 2 ? visible : projected;
    const middle = Math.floor((run.length - 1) / 2);
    const a = run[middle]!;
    const b = run[middle + 1] ?? run[middle - 1]!;
    const x = (a.x + b.x) / 2;
    const y = (a.y + b.y) / 2;
    if (!inView(x, y)) continue;

    let angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;
    const text = abbreviateStreet(name);
    const roadClass = String(feature.properties.class);
    if (farFromAll(streets, x, y, text, 140)) {
      streets.push({ id: `street-${streets.length}`, text, x, y, angle, major: ["primary", "trunk", "motorway"].includes(roadClass) });
    }
  }

  const places: PlaceLabel[] = [];
  for (const feature of map.queryRenderedFeatures({ layers: [PROBE_LAYERS.place] })) {
    const point = pointOf(feature);
    const name = nameOf(feature);
    if (!point || !name) continue;
    const { x, y } = map.project(point);
    if (inView(x, y) && farFromAll(places, x, y, name.toUpperCase(), 200)) {
      places.push({ id: `place-${places.length}`, text: name.toUpperCase(), x, y });
    }
  }

  const pois: PoiLabel[] = [];
  for (const feature of map.queryRenderedFeatures({ layers: [PROBE_LAYERS.poi] })) {
    const point = pointOf(feature);
    const name = nameOf(feature);
    const category = categoryOf(String(feature.properties.class ?? ""), String(feature.properties.subclass ?? ""));
    if (!point || !name || !category) continue;
    const { x, y } = map.project(point);
    if (inView(x, y) && farFromAll(pois, x, y, name, 60)) {
      pois.push({ id: `poi-${pois.length}`, text: name, x, y, lng: point[0], lat: point[1], category });
    }
  }

  const waters: PlaceLabel[] = [];
  for (const feature of map.queryRenderedFeatures({ layers: [PROBE_LAYERS.water] })) {
    const point = pointOf(feature);
    const name = nameOf(feature);
    if (!point || !name) continue;
    const { x, y } = map.project(point);
    if (inView(x, y) && farFromAll(waters, x, y, name, 300)) waters.push({ id: `water-${waters.length}`, text: name, x, y });
  }

  return { streets, places, pois, waters };
}
