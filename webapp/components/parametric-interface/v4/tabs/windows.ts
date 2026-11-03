// Real browser windows and tabs for the lyric, after experiments-jyc SCC
// desktop-collage foundations/browser: a plan of rectangles in screen
// coordinates, opened as same-origin pop-ups from the controller's click.
// A browser lets one pop-up through per click until pop-ups are allowed for
// the site; the controller reports how many were blocked. Only the browser
// fallback is ported — no Mac helper, no Chrome --app instance.

export type TabLayout = "grid" | "cascade" | "tabs";

export const TAB_LAYOUTS: readonly { id: TabLayout; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "cascade", label: "Cascade" },
  { id: "tabs", label: "Tabs" },
];

export type ScreenRect = { x: number; y: number; width: number; height: number };

export const WINDOW_PATH = "/parametric-interface/v4/tab";

type Screenish = Screen & { availLeft?: number; availTop?: number };

/** This screen's usable frame in window coordinates; read without a permission prompt. */
export function measureScreen(): ScreenRect {
  const screen = window.screen as Screenish;
  return { x: screen.availLeft ?? 0, y: screen.availTop ?? 0, width: screen.availWidth, height: screen.availHeight };
}

/** Columns for `count` windows on a frame: rows of a sentence, read left to right. */
function gridColumns(count: number, frame: ScreenRect) {
  const aspect = frame.width / Math.max(1, frame.height);
  return Math.min(count, Math.max(1, Math.round(Math.sqrt(count * aspect * 1.25))));
}

/** Window rectangles in seat order. "tabs" has none: each opens as a tab of this window. */
export function planWindows(layout: TabLayout, count: number, frame: ScreenRect): (ScreenRect | null)[] {
  if (layout === "tabs") return Array.from({ length: count }, () => null);

  if (layout === "cascade") {
    const width = Math.round(frame.width * 0.46);
    const height = Math.round(frame.height * 0.5);
    const stepX = count > 1 ? Math.min(64, (frame.width - width) / (count - 1)) : 0;
    const stepY = count > 1 ? Math.min(44, (frame.height - height) / (count - 1)) : 0;
    return Array.from({ length: count }, (_, index) => ({
      x: frame.x + Math.round(index * stepX),
      y: frame.y + Math.round(index * stepY),
      width,
      height,
    }));
  }

  const columns = gridColumns(count, frame);
  const rows = Math.ceil(count / columns);
  const width = Math.floor(frame.width / columns);
  const height = Math.floor(frame.height / rows);
  return Array.from({ length: count }, (_, index) => ({
    x: frame.x + (index % columns) * width,
    y: frame.y + Math.floor(index / columns) * height,
    width,
    height,
  }));
}

const opened: Window[] = [];

export function openWindowCount() {
  for (let index = opened.length - 1; index >= 0; index -= 1) if (opened[index]!.closed) opened.splice(index, 1);
  return opened.length;
}

export function closeWindows() {
  opened.splice(0).forEach((target) => {
    try {
      target.close();
    } catch {
      /* Already gone. */
    }
  });
}

/**
 * Opens one window per seat. Must run synchronously inside the click that
 * asked for it. Returns how many the browser blocked.
 */
export function openWindows(layout: TabLayout, count: number) {
  closeWindows();
  const run = Date.now().toString(36);
  const plan = planWindows(layout, count, measureScreen());
  let blocked = 0;

  plan.forEach((rect, slot) => {
    const url = `${WINDOW_PATH}?slot=${slot}`;
    const features = rect
      ? `popup,left=${rect.x},top=${rect.y},width=${rect.width},height=${rect.height}`
      : undefined;
    const target = window.open(url, `nrf-xr-v4-${run}-${slot}`, features);
    if (!target) {
      blocked += 1;
      return;
    }
    if (rect) {
      try {
        target.moveTo(rect.x, rect.y);
        target.resizeTo(rect.width, rect.height);
      } catch {
        /* The browser refused to move it. */
      }
    }
    opened.push(target);
  });

  // Opening a tab moves focus to it; the controller keeps the audio either way.
  return blocked;
}
