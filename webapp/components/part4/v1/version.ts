import type { ComponentType } from "react";

type Page = () => Promise<{ default: ComponentType }>;

// part4/v1 is self-contained in code: its song, clock, surfaces, phones and
// staged view live under this directory and import nothing from other
// experiments. It shares v0's images (public/part4/v0).
export const part4V1 = {
  key: "v1",
  load: (() => import("./phones")) as Page,
  interfaces: [
    { key: "phones", load: (() => import("./phones")) as Page },
  ],
} as const;
