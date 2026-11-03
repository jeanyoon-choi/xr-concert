// Deterministic so the hall, its surfaces and its crowd are identical on every load.
export function seededRandom(seed: number) {
  let state = seed | 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export type Random = ReturnType<typeof seededRandom>;

export function pick<T>(random: Random, values: readonly T[]) {
  return values[Math.floor(random() * values.length)]!;
}

export function range(random: Random, min: number, max: number) {
  return min + (max - min) * random();
}

// Approximately normal, for clustering people under the display.
export function gaussian(random: Random) {
  return (random() + random() + random() + random() - 2) / 0.577;
}
