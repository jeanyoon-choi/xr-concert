export const navigationAreas = [
  { key: "parametric-interface", href: "/parametric-interface" },
  { key: "face-voronoi", href: "/face-voronoi" },
  { key: "schematic", href: "/schematic" },
] as const;

export type NavigationArea = (typeof navigationAreas)[number]["key"];
