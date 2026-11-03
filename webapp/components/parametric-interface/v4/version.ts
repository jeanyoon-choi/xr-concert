import type { ComponentType } from "react";

// v4 is self-contained: its song, clock, score, multi-mobile and multi-tab
// skeletons live under this directory and import nothing from sibling
// versions.
export const parametricInterfaceV4 = {
  key: "v4",
  // The phones are v4's default view: 3_mobiles, the extended one.
  load: (): Promise<{ default: ComponentType }> => import("./3_mobiles"),
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
      // 2_mobiles extended with twenty-three more text interfaces.
      key: "3",
      load: (): Promise<{ default: ComponentType }> => import("./3_mobiles"),
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
