import type { ComponentType } from "react";

// v4 is self-contained: its song, clock, score, multi-mobile and multi-tab
// skeletons live under this directory and import nothing from sibling
// versions.
export const parametricInterfaceV4 = {
  key: "v4",
  // The phones are v4's default view: 2_mobiles, the one being worked on.
  load: (): Promise<{ default: ComponentType }> => import("./2_mobiles"),
  interfaces: [
    {
      key: "1",
      load: (): Promise<{ default: ComponentType }> => import("./1_mobiles"),
    },
    {
      // A copy of 1_mobiles, adjusted on its own from here.
      key: "2",
      load: (): Promise<{ default: ComponentType }> => import("./2_mobiles"),
    },
    {
      key: "tabs",
      load: (): Promise<{ default: ComponentType }> => import("./tabs/controller"),
    },
    {
      // The page each opened window or tab loads; reached from v4/tabs.
      key: "tab",
      load: (): Promise<{ default: ComponentType }> => import("./tabs/window"),
    },
  ],
} as const;
