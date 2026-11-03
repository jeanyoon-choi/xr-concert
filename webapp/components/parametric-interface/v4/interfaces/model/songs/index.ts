import type { ParametricSong } from "../song";
import { roseToxicTillTheEnd } from "./rose-toxic-till-the-end";

export const parametricSongs = [roseToxicTillTheEnd] as const satisfies readonly ParametricSong[];

export const activeParametricSong = roseToxicTillTheEnd;

export function getParametricSong(id: string) {
  return parametricSongs.find((song) => song.id === id);
}
