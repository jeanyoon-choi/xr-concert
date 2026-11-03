// World units are metres. The camera stands at eye height near the origin and
// looks toward −z, across the departures hall to the glazed airside wall.

// The departures display is the copied v2/4 FIDS, laid out at the size the 2D
// study is usually seen at, so its grid and type keep their proportions.
export const DISPLAY_PIXELS = { width: 1440, height: 810 } as const;

// A freestanding 87-inch FIDS monitor at human height.
export const MONITOR = {
  width: 1.92,
  height: 1.08,
  centerY: 1.72,
  z: -2.5,
  bezel: 0.028,
  depth: 0.07,
} as const;

export const HALL = {
  width: 64,
  // From the camera to the airside glazing.
  depth: 42,
  height: 12,
} as const;

export const CAMERA = {
  fov: 38,
  eyeHeight: 1.58,
  // Share of the frame width the monitor may take on narrow screens.
  maximumMonitorShare: 0.84,
} as const;
