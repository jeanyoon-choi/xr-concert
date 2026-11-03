import type { ComponentType } from "react";

// v4 is self-contained: its song, clock, score, composition, multi-mobile and
// multi-tab skeletons live under this directory and import nothing from
// sibling versions.
export const parametricInterfaceV4 = {
  key: "v4",
  // The compositional state: the main screen's windows and the phones together.
  load: (): Promise<{ default: ComponentType }> => import("./composition"),
  interfaces: [
    {
      key: "mobiles",
      load: (): Promise<{ default: ComponentType }> => import("./mobiles"),
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
