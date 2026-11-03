// The sheet's geometry in design px: 1920 wide, as tall as the viewport's
// aspect requires, so the whole plan is always on screen. Lanes of program
// elements are packed as densely as the 1989 poster; the layout is seeded,
// so it is the same on every load for a given aspect.

export const SHEET_WIDTH = 1920;
export const HEADER_HEIGHT = 150;
export const LANE_LEFT = 52;
export const LANE_RIGHT = 1630;
export const LANE_COUNT = 15;
export const BOX_WIDTH = 92;
export const RIGHT_YEARS_X = 1676;
export const DEFINITIONS_X = 1690;
export const FIRST_YEAR = 2026;
export const LAST_YEAR = 2100;

const BOX_HEIGHTS = [16, 18, 20, 22, 26, 30, 38] as const;

export type Point = readonly [number, number];
export type EdgeStyle = "solid" | "dashed" | "double" | "heavy";

export type Box = {
  readonly id: string;
  /** Reading order: lane by lane, top to bottom; picks the lyric word. */
  readonly order: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

export type Edge = {
  readonly id: string;
  readonly points: readonly Point[];
  readonly style: EdgeStyle;
};

export type Circle = { readonly cx: number; readonly cy: number; readonly r: number };

export type Sheet = {
  readonly height: number;
  readonly boxes: readonly Box[];
  readonly edges: readonly Edge[];
  readonly years: readonly { year: number; y: number }[];
  readonly circles: readonly Circle[];
};

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pickStyle(random: () => number): EdgeStyle {
  const roll = random();
  if (roll < 0.68) return "solid";
  if (roll < 0.84) return "dashed";
  if (roll < 0.95) return "double";
  return "heavy";
}

export function buildSheet(height: number): Sheet {
  const random = mulberry32(1989);
  const gutter = (LANE_RIGHT - LANE_LEFT - LANE_COUNT * BOX_WIDTH) / (LANE_COUNT - 1);
  const chartBottom = height - 14;
  const lanes: Box[][] = [];
  let order = 0;

  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    const x = LANE_LEFT + lane * (BOX_WIDTH + gutter);
    const column: Box[] = [];
    let y = HEADER_HEIGHT + 6 + random() * 18;

    for (;;) {
      const h = BOX_HEIGHTS[Math.floor(random() * BOX_HEIGHTS.length)]!;
      if (y + h > chartBottom) break;
      column.push({ id: `box-${lane}-${column.length}`, order, x, y, w: BOX_WIDTH, h });
      order += 1;
      y += h + 5 + random() * 9;
    }

    lanes.push(column);
  }

  const edges: Edge[] = [];
  lanes.forEach((column, lane) => {
    column.forEach((box, index) => {
      const centreX = box.x + box.w / 2;
      const bottom = box.y + box.h;
      const next = column[index + 1];

      if (next && random() < 0.86) {
        edges.push({
          id: `${box.id}-down`,
          points: [[centreX, bottom], [centreX, next.y]],
          style: pickStyle(random),
        });
      }

      // Cross dependencies run through the gutter into a neighbour lane.
      if (random() < 0.42) {
        const direction = random() < 0.5 ? -1 : 1;
        const neighbour = lanes[lane + direction];
        const target = neighbour?.find((candidate) => candidate.y > bottom + 8);
        if (target) {
          const targetX = target.x + target.w / 2;
          const turnY = bottom + Math.max(4, (target.y - bottom) * (0.25 + random() * 0.5));
          edges.push({
            id: `${box.id}-cross`,
            points: [[centreX, bottom], [centreX, turnY], [targetX, turnY], [targetX, target.y]],
            style: pickStyle(random),
          });
        }
      }

      // Occasional long feeder from the side, two lanes over.
      if (random() < 0.08) {
        const far = lanes[lane + 2];
        const target = far?.find((candidate) => candidate.y + candidate.h / 2 > box.y + box.h / 2 + 4);
        if (target) {
          const sideY = box.y + box.h / 2;
          const targetY = target.y + target.h / 2;
          const midX = box.x + box.w + gutter / 2;
          edges.push({
            id: `${box.id}-feed`,
            points: [[box.x + box.w, sideY], [midX, sideY], [midX, targetY], [target.x, targetY]],
            style: pickStyle(random),
          });
        }
      }
    });
  });

  const span = chartBottom - HEADER_HEIGHT;
  const years = [];
  for (let year = 2030; year <= LAST_YEAR; year += 5) {
    years.push({ year, y: HEADER_HEIGHT + ((year - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * span });
  }

  // Era circles at fixed fractions of the sheet, as on the poster.
  const circles = [
    { cx: 300, cy: HEADER_HEIGHT + span * 0.22, r: Math.min(230, span * 0.2) },
    { cx: 1380, cy: HEADER_HEIGHT + span * 0.3, r: Math.min(220, span * 0.19) },
    { cx: 760, cy: HEADER_HEIGHT + span * 0.62, r: Math.min(210, span * 0.18) },
    { cx: 260, cy: HEADER_HEIGHT + span * 0.8, r: Math.min(220, span * 0.19) },
    { cx: 1420, cy: HEADER_HEIGHT + span * 0.78, r: Math.min(230, span * 0.2) },
  ];

  return { height, boxes: lanes.flat(), edges, years, circles };
}

export function wrap(text: string, maxChars: number) {
  const lines: string[] = [];
  let current = "";

  for (const word of text.split(" ")) {
    if (current && current.length + 1 + word.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }

  if (current) lines.push(current);
  return lines;
}
