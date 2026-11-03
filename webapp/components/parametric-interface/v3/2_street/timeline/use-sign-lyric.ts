import { useLyricCue } from "../../timeline/use-lyric-cue";

// The word being sung, or null before playback starts.
export function useSignLyric() {
  const { currentWord, hasStarted } = useLyricCue();

  return { word: hasStarted ? currentWord : null };
}
