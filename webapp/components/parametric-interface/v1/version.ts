import type { ComponentType } from "react";

// v1 is self-contained: its song, playback, timeline, interfaces and whole cycle
// live under this directory and import nothing from sibling versions.
export const parametricInterfaceV1 = {
  key: "v1",
  load: (): Promise<{ default: ComponentType }> => import("./whole"),
  interfaces: [
    {
      key: "1",
      load: (): Promise<{ default: ComponentType }> => import("./1"),
    },
    {
      key: "2",
      load: (): Promise<{ default: ComponentType }> => import("./2"),
    },
    {
      key: "3",
      load: (): Promise<{ default: ComponentType }> => import("./3"),
    },
    {
      key: "4",
      load: (): Promise<{ default: ComponentType }> => import("./4"),
    },
    {
      key: "5",
      load: (): Promise<{ default: ComponentType }> => import("./5"),
    },
    {
      key: "6",
      load: (): Promise<{ default: ComponentType }> => import("./6"),
    },
  ],
} as const;
