// The phone states the score can assign: the places a phone holds text —
// chats, social posts and comments, a note, the lock screen. Each takes the
// sung line in its own slot (see each folder's header). Add a state by giving
// it a folder under apps/, a PhoneState name in model/score.ts, and an entry
// here.

import type { ComponentType } from "react";
import type { PhoneState } from "../states";
import ChatGPTState from "./chatgpt";
import DiscordState from "./discord";
import InstagramState from "./instagram";
import InstagramDMState from "./instagram-dm";
import KakaoTalkState from "./kakaotalk";
import LineState from "./line";
import LockState from "./lock";
import MessagesState from "./messages";
import MessengerState from "./messenger";
import NotesState from "./notes";
import SlackState from "./slack";
import TelegramState from "./telegram";
import ThreadsState from "./threads";
import TikTokState from "./tiktok";
import type { PhoneStateProps } from "./types";
import WhatsAppState from "./whatsapp";
import XState from "./x";
import YouTubeState from "./youtube";

export type PhoneStateDefinition = {
  readonly id: PhoneState;
  readonly label: string;
  readonly Screen: ComponentType<PhoneStateProps>;
  /** Status-bar glyphs over this state: "light" on dark screens. */
  readonly statusTone: "light" | "dark";
  /** Sung lines the state keeps (the thread's scrollback, the feed, the notification stack). */
  readonly history: number;
};

const state = (id: PhoneState, label: string, Screen: ComponentType<PhoneStateProps>, statusTone: "light" | "dark", history: number): PhoneStateDefinition => ({
  id,
  label,
  Screen,
  statusTone,
  history,
});

export const PHONE_STATES: Readonly<Record<PhoneState, PhoneStateDefinition>> = {
  messages: state("messages", "Messages", MessagesState, "dark", 24),
  kakaotalk: state("kakaotalk", "KakaoTalk", KakaoTalkState, "dark", 24),
  "instagram-dm": state("instagram-dm", "Instagram DM", InstagramDMState, "dark", 24),
  whatsapp: state("whatsapp", "WhatsApp", WhatsAppState, "dark", 24),
  x: state("x", "X", XState, "light", 12),
  chatgpt: state("chatgpt", "ChatGPT", ChatGPTState, "dark", 24),
  telegram: state("telegram", "Telegram", TelegramState, "dark", 24),
  tiktok: state("tiktok", "TikTok", TikTokState, "light", 1),
  slack: state("slack", "Slack", SlackState, "dark", 24),
  instagram: state("instagram", "Instagram", InstagramState, "dark", 12),
  line: state("line", "LINE", LineState, "dark", 24),
  discord: state("discord", "Discord", DiscordState, "light", 24),
  youtube: state("youtube", "YouTube", YouTubeState, "dark", 30),
  threads: state("threads", "Threads", ThreadsState, "dark", 8),
  messenger: state("messenger", "Messenger", MessengerState, "dark", 24),
  notes: state("notes", "Notes", NotesState, "dark", 24),
  lock: state("lock", "Lock screen", LockState, "light", 6),
};

/** Every state, in the order the verses deal them to seats; the lock screen lies on top. */
export const PHONE_STATE_ORDER = Object.keys(PHONE_STATES) as readonly PhoneState[];
