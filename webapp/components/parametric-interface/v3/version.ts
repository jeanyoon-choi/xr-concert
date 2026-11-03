import type { ComponentType } from "react";

// v3 is self-contained: its song, playback, timeline, interfaces and whole cycle
// live under this directory and import nothing from sibling versions.
// v3 places parametric interfaces inside 3D scenes.
export const parametricInterfaceV3 = {
  key: "v3",
  load: (): Promise<{ default: ComponentType }> => import("./whole"),
  interfaces: [
    {
      key: "1",
      load: (): Promise<{ default: ComponentType }> => import("./1_airport"),
    },
    {
      key: "2",
      load: (): Promise<{ default: ComponentType }> => import("./2_street"),
    },
    {
      key: "3",
      load: (): Promise<{ default: ComponentType }> => import("./3_daechi"),
    },
  ],
} as const;
