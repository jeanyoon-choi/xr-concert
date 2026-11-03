"use client";

import dynamic from "next/dynamic";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { AccountArea, CategoryChips, MapControls, SearchPanel, SideRail } from "./chrome/google-chrome";
import styles from "./google-maps.module.css";

// google.com/maps on Midtown Manhattan, rebuilt as a hyper-real study: the
// chrome measured from the live page, the map body drawn from OpenStreetMap
// data in Google's palette with every label as a replaceable overlay. As each
// word of a line is sung, the next place on the map takes that word as its
// name, and Google's directions route runs along the real streets through the
// places sung so far, ending at the red destination pin.

// MapLibre needs the browser (WebGL), so the map body loads client-side only.
const GoogleMap = dynamic(() => import("./map/google-map"), { ssr: false });

export default function ParametricInterfaceEight({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <main aria-label="Google Maps" className={styles.window}>
        <GoogleMap />
        <SideRail />
        <SearchPanel />
        <CategoryChips />
        <AccountArea />
        <MapControls />
      </main>
    </SongPlayback>
  );
}
