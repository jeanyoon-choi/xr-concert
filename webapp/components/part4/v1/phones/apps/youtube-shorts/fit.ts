import { useLayoutEffect, type RefObject } from "react";

/**
 * Keeps a lyric inside its box at every text size. The box's type is sized
 * `calc(<size> * var(--fit, 1))`; when a word is wider than the box, or
 * (axes "both") the rows run past its foot, --fit is lowered until the whole
 * line is inside — so no word is ever broken, clipped or pushed under the
 * interface. Measured once per line (`key`) and again when the box is
 * resized (the page's text-size option), never as words are sung: the line
 * is laid out whole from its first word, so its fit cannot change.
 */
export function useFit(box: RefObject<HTMLElement | null>, key: unknown, axes: "both" | "width" = "both") {
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    // The rectangle of the glyphs themselves (a range over the box's text:
    // every row, overflowing words and the ascenders that stand above a tight
    // line box included) is compared with the box's, in fractions of a pixel
    // (scrollWidth is whole pixels of the zoomed box, which let a word stand
    // 2 pt outside).
    const text = document.createRange();
    const fits = () => {
      text.selectNodeContents(element);
      const line = text.getBoundingClientRect();
      if (!line.width) return true;
      const frame = element.getBoundingClientRect();
      const slack = 0.1;
      const wide = line.left >= frame.left - slack && line.right <= frame.right + slack;
      return wide && (axes === "width" || (line.top >= frame.top - slack && line.bottom <= frame.bottom + slack));
    };
    const fit = () => {
      element.style.setProperty("--fit", "1");
      if (fits()) return;
      let low = 0.2;
      let high = 1;
      for (let step = 0; step < 7; step += 1) {
        const middle = (low + high) / 2;
        element.style.setProperty("--fit", middle.toFixed(3));
        if (fits()) low = middle;
        else high = middle;
      }
      element.style.setProperty("--fit", low.toFixed(3));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [box, key, axes]);
}
