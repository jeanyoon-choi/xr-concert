// Keeping a thread's newest message in view without stutter. A lyric slot
// grows by a character about every 55 ms; restarting a smooth scroll on each
// one made every thread judder. Small moves (a character, a wrapped line)
// are made at once; a big one (a new message) glides, and is left to finish
// rather than restarted by the characters typed during it.

const GLIDE_MS = 420;
const SMALL = 64;
const gliding = new WeakMap<Element, number>();

export function follow(element: HTMLElement, top: number, reducedMotion: boolean) {
  const distance = Math.abs(top - element.scrollTop);
  if (distance < 1) return;
  const now = performance.now();
  if (reducedMotion || distance < SMALL) {
    // Let a glide in flight land first; it is heading here already.
    if (now - (gliding.get(element) ?? -Infinity) < GLIDE_MS) return;
    element.scrollTop = top;
    return;
  }
  if (now - (gliding.get(element) ?? -Infinity) < GLIDE_MS) return;
  gliding.set(element, now);
  element.scrollTo({ top, behavior: "smooth" });
}
