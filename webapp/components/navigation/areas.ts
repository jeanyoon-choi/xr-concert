export const navigationAreas = [
  { key: "parametric-interface", href: "/parametric-interface" },
  { key: "face-voronoi", href: "/face-voronoi" },
] as const;

export type NavigationArea = (typeof navigationAreas)[number]["key"];
