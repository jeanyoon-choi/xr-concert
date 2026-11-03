"use client";

import dynamic from "next/dynamic";
import FlightInformationAtlas from "./screen";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";

// WebGL and CSS3D need the browser, so the hall renders on the client only.
const AirportHall = dynamic(() => import("./scene"), { ssr: false });

// The v2/4 departures display, unchanged, hung on the wall of a 3D departures hall.
export default function ParametricInterfaceOne({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <AirportHall>
        <FlightInformationAtlas />
      </AirportHall>
    </SongPlayback>
  );
}
