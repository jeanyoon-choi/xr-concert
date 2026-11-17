import type { SungLine } from "../../song/lines";
import styles from "./lyric-words.module.css";

// A line set word by word: the shared way the media apps show the lyric.
// - The whole line is laid out from its first word — the words not yet sung
//   are there, unseen — so the line never reflows and no word moves as the
//   line fills in.
// - A word arrives softly (its opacity eases up) rather than switching on.

type Props = {
  line: SungLine;
  /** How the words not yet sung stand: "hold" (default) keeps them unseen, "dim" shows them faintly. */
  rest?: "hold" | "dim";
  /** Map a word before it is shown (e.g. lowercase). */
  format?: (word: string) => string;
};

export function LyricWords({ line, rest = "hold", format = (word) => word }: Props) {
  return (
    <>
      {line.words.map((word, index) => (
        <span key={`${line.cueIndex}-${index}`} className={styles.word} data-rest={index >= line.sung ? rest : undefined}>
          {format(word)}
          {index < line.words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
