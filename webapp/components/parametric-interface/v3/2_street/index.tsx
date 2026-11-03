"use client";

import dynamic from "next/dynamic";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

// WebGL needs the browser, so the alley renders on the client only.
const EuljiroAlley = dynamic(() => import("./scene"), { ssr: false });

// An Euljiro back alley where every projecting sign takes the sung word as its name.
export default function ParametricInterfaceTwo({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <EuljiroAlley />
    </SongPlayback>
  );
}
