import { useLyricCue } from "../../timeline/use-lyric-cue";

// The current line and the word being sung; before playback, no word has been sung.
export function useSignLyric() {
  const { activeWordPosition, hasStarted, lyric } = useLyricCue();

  return { lyric, activeWordPosition: hasStarted ? activeWordPosition : -1 };
}
