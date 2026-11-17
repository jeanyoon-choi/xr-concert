import type { ParametricSong } from "./song";

/** The song as lines of words. */
export function getLyricCues(song: ParametricSong) {
  return song.lyrics.map((line) => line.words.map((word) => word.text));
}

/** Every word in order, with its line (`cueIndex`), its place in the line and how long it is held. */
export function getLyricWordTimings(song: ParametricSong) {
  const flatWords = song.lyrics.flatMap((line, cueIndex) =>
    line.words.map((word, wordIndex) => ({ ...word, cueIndex, wordIndex })),
  );

  return flatWords.map((word, index) => ({
    word: word.text,
    startMs: word.startMs,
    durationMs: (flatWords[index + 1]?.startMs ?? song.durationMs) - word.startMs,
    cueIndex: word.cueIndex,
    wordIndex: word.wordIndex,
  }));
}
