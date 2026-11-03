// The phone states: the places a phone holds text — chats, social posts and
// comments, mail, search, translation, community boards, transfers, notes,
// the camera roll, the lock screen. Each takes the
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
import TelegramState from "./telegram";
import ThreadsState from "./threads";
import TikTokState from "./tiktok";
import VoicemailState from "./voicemail";
import MailState from "./mail";
import AiSummaryState from "./ai-summary";
import SafariState from "./safari";
import NaverState from "./naver";
import EverytimeState from "./everytime";
import BlindState from "./blind";
import KarrotState from "./karrot";
import RedditState from "./reddit";
import SnapchatState from "./snapchat";
import SignalState from "./signal";
import CharacterAiState from "./character-ai";
import GeminiState from "./gemini";
import DocsState from "./docs";
import PhotosState from "./photos";
import type { PhoneStateProps } from "./types";
import WhatsAppState from "./whatsapp";
import XState from "./x";

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
  instagram: state("instagram", "Instagram", InstagramState, "dark", 12),
  line: state("line", "LINE", LineState, "dark", 24),
  discord: state("discord", "Discord", DiscordState, "light", 24),
  threads: state("threads", "Threads", ThreadsState, "dark", 8),
  messenger: state("messenger", "Messenger", MessengerState, "dark", 24),
  notes: state("notes", "Notes", NotesState, "dark", 24),
  "voicemail": state("voicemail", "Voicemail", VoicemailState, "dark", 8),
  "mail": state("mail", "Mail", MailState, "light", 10),
  "ai-summary": state("ai-summary", "Notification summary", AiSummaryState, "light", 6),
  "safari": state("safari", "Safari", SafariState, "dark", 8),
  "naver": state("naver", "NAVER 지식iN", NaverState, "light", 8),
  "everytime": state("everytime", "에브리타임", EverytimeState, "dark", 40),
  "blind": state("blind", "Blind", BlindState, "dark", 40),
  "karrot": state("karrot", "당근", KarrotState, "dark", 24),
  "reddit": state("reddit", "Reddit", RedditState, "dark", 12),
  "snapchat": state("snapchat", "Snapchat", SnapchatState, "dark", 1),
  "signal": state("signal", "Signal", SignalState, "dark", 3),
  "character-ai": state("character-ai", "Character.AI", CharacterAiState, "light", 24),
  "gemini": state("gemini", "Gemini", GeminiState, "dark", 24),
  "docs": state("docs", "Google Docs", DocsState, "dark", 30),
  "photos": state("photos", "Photos", PhotosState, "light", 24),
  lock: state("lock", "Lock screen", LockState, "light", 6),
};

/** Every state, in the order the verses deal them to seats; the lock screen lies on top. */
export const PHONE_STATE_ORDER = Object.keys(PHONE_STATES) as readonly PhoneState[];
