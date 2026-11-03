"use client";

import dynamic from "next/dynamic";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

// WebGL needs the browser, so the street renders on the client only.
const DaechiStreet = dynamic(() => import("./scene"), { ssr: false });

// A Daechi-dong academy street at 10 p.m. whose signs take the sung line one word per sign.
export default function ParametricInterfaceThree({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <DaechiStreet />
    </SongPlayback>
  );
}
