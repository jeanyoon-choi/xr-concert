import type { ComponentType } from "react";

type Page = () => Promise<{ default: ComponentType }>;

// part4/v0 is self-contained: its song, clock, surfaces and phones
// live under this directory and import nothing from other experiments.
export const part4V0 = {
  key: "v0",
  // The phones are the default view.
  load: (() => import("./phones")) as Page,
  interfaces: [
    { key: "phones", load: (() => import("./phones")) as Page },
  ],
} as const;
