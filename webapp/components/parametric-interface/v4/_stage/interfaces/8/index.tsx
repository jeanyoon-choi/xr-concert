"use client";

import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import FindMyWindow from "./screen";

export default function ParametricInterfaceEight({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <FindMyWindow />
    </SongPlayback>
  );
}
