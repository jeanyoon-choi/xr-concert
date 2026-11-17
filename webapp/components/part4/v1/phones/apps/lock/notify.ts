// What the lock screen shows for a seat: one notification under the icon of
// the app the phone was in, and where the app's name would stand, the word
// being sung — a notification a word, and nothing else on it. Icons
// are each app's App Store artwork (120 px, fetched 2026-11-03 from the
// iTunes lookup API's artworkUrl512), saved under public/part4/v0/icons.
// Messages has no store listing and draws its own icon; an app without
// artwork here (Voicemail, Photos) shows Messages'.

import type { PhoneState } from "../../states";

export type Notice = {
  /** The app the notification opens. */
  readonly state: PhoneState;
  /** Icon path, or null for Messages' drawn icon. */
  readonly icon: string | null;
  /** The sung word, standing where the app's name would. */
  readonly word: string;
};

const icon = (id: string) => `/part4/v0/icons/${id}.png`;

/** The artwork a state's notification carries: its own, its platform's for a variant, or none. */
function artworkOf(state: PhoneState) {
  if (state === "voicemail" || state === "messages" || state === "lock") return null;
  if (state.startsWith("tiktok")) return icon("tiktok");
  if (state.startsWith("instagram")) return icon("instagram");
  if (state.startsWith("youtube")) return icon("youtube");
  if (state.startsWith("photos")) return null;
  return icon(state);
}

export function noticeOf(state: PhoneState, word: string): Notice {
  const artwork = artworkOf(state);
  // Without artwork of its own the notification is Messages', and opens Messages.
  return { state: artwork ? state : "messages", icon: artwork, word };
}
