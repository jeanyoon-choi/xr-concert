// The interfaces a v4 window can be given: v2's eight, copied here
// unchanged (each v2 interface is already a hyper-real, lyric-responsive
// whole screen). Only their playback is v4's clock (playback/index.tsx).
// A window is an ordinary browser window, so each interface fills it as it
// filled the screen in v2.

import type { ComponentType } from "react";
import YesNoGrid from "./1";
import LyricSheet from "./2";
import MacMenuBar from "./3";
import Departures from "./4";
import Gmail from "./5";
import Terminal from "./6";
import Messages from "./7";
import FindMy from "./8";

export type InterfaceKey = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";

export const INTERFACES: Readonly<Record<InterfaceKey, { readonly name: string; readonly Screen: ComponentType }>> = {
  "1": { name: "Yes / No grid", Screen: YesNoGrid },
  "2": { name: "Lyric sheet", Screen: LyricSheet },
  "3": { name: "macOS menu bar", Screen: MacMenuBar },
  "4": { name: "Departures", Screen: Departures },
  "5": { name: "Gmail", Screen: Gmail },
  "6": { name: "Terminal", Screen: Terminal },
  "7": { name: "Messages", Screen: Messages },
  "8": { name: "Find My", Screen: FindMy },
};
