// What the lock screen shows for a seat: one notification under the icon of
// the app the phone was in: the app's name, and on the next line the sung
// line and nothing else — no sender, no "replied:" or "commented:" wording. Icons
// are each app's App Store artwork (120 px, fetched 2026-11-03 from the
// iTunes lookup API's artworkUrl512), saved under public/part4/v0/icons.
// Messages has no store listing and draws its own icon; an app without
// artwork here (Voicemail, Photos) shows Messages'.

import type { SungLine } from "../../../song/lines";
import type { PhoneState } from "../../states";

export type Notice = {
  /** The app the notification opens. */
  readonly state: PhoneState;
  /** Icon path, or null for Messages' drawn icon. */
  readonly icon: string | null;
  /** The app's name. */
  readonly title: string;
  /** The sung line. */
  readonly body: string;
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

/** The app's name as iOS writes it on a notification; a variant carries its platform's. */
function nameOf(state: PhoneState) {
  if (state.startsWith("tiktok")) return "TikTok";
  if (state.startsWith("instagram")) return "Instagram";
  if (state.startsWith("youtube")) return "YouTube";
  const names: Partial<Record<PhoneState, string>> = {
    kakaotalk: "KakaoTalk",
    whatsapp: "WhatsApp",
    line: "LINE",
    messenger: "Messenger",
    snapchat: "Snapchat",
    x: "X",
    threads: "Threads",
    reddit: "Reddit",
    everytime: "에브리타임",
    blind: "Blind",
    naver: "NAVER",
    notes: "Notes",
  };
  return names[state] ?? "Messages";
}

export function noticeOf(state: PhoneState, line: SungLine): Notice {
  const artwork = artworkOf(state);
  // Without artwork of its own the notification is Messages', and opens Messages.
  return { state: artwork ? state : "messages", icon: artwork, title: artwork ? nameOf(state) : "Messages", body: line.text };
}
