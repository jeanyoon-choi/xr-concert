export type FindMyTab = "people" | "devices" | "items";

export type StaticListing = {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly place: string;
  readonly time: string | null;
  readonly distance: string | null;
};

/** People shared with this Mac besides the tracked person. */
export const otherPeople: readonly StaticListing[] = [
  { id: "mom", name: "Mom", initials: "M", place: "Home", time: "2 hr ago", distance: "8.4 km" },
  { id: "ari", name: "Ari Park", initials: "AP", place: "Work", time: "14 min ago", distance: "3.1 km" },
  { id: "sienna", name: "Sienna", initials: "S", place: "Lake Park", time: "1 hr ago", distance: "5.6 km" },
  { id: "noah", name: "Noah", initials: "N", place: "No location found", time: null, distance: null },
];

export const trackedPerson = { id: "daniel", name: "Daniel", initials: "D" } as const;

export const trackedDevices = [
  { id: "daniel-iphone", name: "Daniel’s iPhone" },
  { id: "daniel-airpods", name: "Daniel’s AirPods Pro" },
] as const;

export const thisMac: StaticListing = {
  id: "this-mac",
  name: "This Mac",
  initials: "",
  place: "With You",
  time: null,
  distance: null,
};
