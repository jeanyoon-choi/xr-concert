import type { ClockAnchor } from "../clock";

// Tabs of one browser on one machine share the song through a same-origin
// BroadcastChannel; no server is involved. The controller tab owns the audio
// and the roster; every lyric tab says hello, keeps a heartbeat, and takes
// its seat from its place in the roster.

export const TAB_CHANNEL = "nrf-xr:parametric-interface:v4:tabs";

export const TAB_HEARTBEAT_MS = 1_000;
/** A tab not heard from for this long leaves the roster. */
export const TAB_TIMEOUT_MS = 3_200;

export type TabMessage =
  | { readonly kind: "hello"; readonly id: string; readonly slot: number | null }
  | { readonly kind: "bye"; readonly id: string }
  | { readonly kind: "clock"; readonly anchor: ClockAnchor }
  /** Tab ids in seat order. */
  | { readonly kind: "roster"; readonly ids: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAnchor(value: unknown): value is ClockAnchor {
  return (
    isRecord(value) &&
    typeof value.songId === "string" &&
    Number.isFinite(value.positionMs) &&
    Number.isFinite(value.at) &&
    typeof value.playing === "boolean" &&
    typeof value.started === "boolean"
  );
}

/** Messages from other tabs are untrusted input: anything malformed is dropped. */
export function readTabMessage(data: unknown): TabMessage | null {
  if (!isRecord(data)) return null;
  switch (data.kind) {
    case "hello":
      return typeof data.id === "string" && (data.slot === null || Number.isInteger(data.slot))
        ? { kind: "hello", id: data.id, slot: data.slot as number | null }
        : null;
    case "bye":
      return typeof data.id === "string" ? { kind: "bye", id: data.id } : null;
    case "clock":
      return isAnchor(data.anchor) ? { kind: "clock", anchor: data.anchor } : null;
    case "roster":
      return Array.isArray(data.ids) && data.ids.every((id) => typeof id === "string")
        ? { kind: "roster", ids: data.ids as string[] }
        : null;
    default:
      return null;
  }
}

/** The composition's own channel: its embedded windows follow it, never the controller. */
export const COMPOSITION_CHANNEL = `${TAB_CHANNEL}:composition`;

export function openTabChannel(onMessage: (message: TabMessage) => void, name: string = TAB_CHANNEL) {
  const channel = new BroadcastChannel(name);
  channel.onmessage = (event) => {
    const message = readTabMessage(event.data);
    if (message) onMessage(message);
  };
  return {
    post: (message: TabMessage) => channel.postMessage(message),
    close: () => channel.close(),
  };
}

type RosterEntry = { slot: number | null; joinedAt: number; seenAt: number };

/** The controller's roster: windows it opened sit at their slot; tabs opened by hand follow in join order. */
export function createRoster() {
  const entries = new Map<string, RosterEntry>();

  return {
    seen(id: string, slot: number | null, now: number) {
      const entry = entries.get(id);
      const changed = !entry || entry.slot !== slot;
      entries.set(id, { slot, joinedAt: entry?.joinedAt ?? now, seenAt: now });
      return changed;
    },
    remove(id: string) {
      return entries.delete(id);
    },
    prune(now: number) {
      let changed = false;
      for (const [id, entry] of entries) {
        if (now - entry.seenAt > TAB_TIMEOUT_MS) {
          entries.delete(id);
          changed = true;
        }
      }
      return changed;
    },
    ids(): string[] {
      return [...entries]
        .sort(([, a], [, b]) => {
          if (a.slot !== null && b.slot !== null) return a.slot - b.slot || a.joinedAt - b.joinedAt;
          if (a.slot !== null) return -1;
          if (b.slot !== null) return 1;
          return a.joinedAt - b.joinedAt;
        })
        .map(([id]) => id);
    },
  };
}
