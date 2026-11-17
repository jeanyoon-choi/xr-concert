// The phone states: the places a phone holds text — chats, social posts and
// comments, mail, search, translation, community boards, transfers, notes,
// the camera roll, the lock screen. Each takes the
// sung line in its own slot (see each folder's header). Add a state by giving
// it a folder under apps/, a PhoneState name in ../states.ts, and an entry
// here.

import type { ComponentType } from "react";
import type { PhoneState } from "../states";
import InstagramState from "./instagram";
import Instagram2State from "./instagram-2";
import InstagramStory1State from "./instagram-story-1";
import InstagramStory2State from "./instagram-story-2";
import InstagramStory3State from "./instagram-story-3";
import InstagramStory4State from "./instagram-story-4";
import InstagramDMState from "./instagram-dm";
import KakaoTalkState from "./kakaotalk";
import LineState from "./line";
import LockState from "./lock";
import MessagesState from "./messages";
import MessengerState from "./messenger";
import NotesState from "./notes";
import ThreadsState from "./threads";
import TikTokState from "./tiktok";
import TikTok2State from "./tiktok-2";
import TikTok3State from "./tiktok-3";
import TikTok4State from "./tiktok-4";
import TikTok5State from "./tiktok-5";
import TikTok6State from "./tiktok-6";
import VoicemailState from "./voicemail";
import NaverState from "./naver";
import EverytimeState from "./everytime";
import BlindState from "./blind";
import RedditState from "./reddit";
import SnapchatState from "./snapchat";
import PhotosState from "./photos";
import Photos2State from "./photos-2";
import Photos3State from "./photos-3";
import type { PhoneStateProps } from "./types";
import WhatsAppState from "./whatsapp";
import XState from "./x";
import YouTubeShortsState from "./youtube-shorts";
import YouTubeShorts2State from "./youtube-shorts-2";
import YouTubeShorts3State from "./youtube-shorts-3";

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
  tiktok: state("tiktok", "TikTok 1", TikTokState, "light", 1),
  "tiktok-2": state("tiktok-2", "TikTok 2", TikTok2State, "light", 1),
  "tiktok-3": state("tiktok-3", "TikTok 3", TikTok3State, "light", 1),
  "tiktok-4": state("tiktok-4", "TikTok 4", TikTok4State, "light", 1),
  "tiktok-5": state("tiktok-5", "TikTok 5", TikTok5State, "light", 1),
  "tiktok-6": state("tiktok-6", "TikTok 6", TikTok6State, "light", 1),
  instagram: state("instagram", "Instagram 1", InstagramState, "dark", 12),
  "instagram-2": state("instagram-2", "Instagram 2", Instagram2State, "dark", 12),
  "instagram-story-1": state("instagram-story-1", "IG Story 1", InstagramStory1State, "light", 1),
  "instagram-story-2": state("instagram-story-2", "IG Story 2", InstagramStory2State, "light", 1),
  "instagram-story-3": state("instagram-story-3", "IG Story 3", InstagramStory3State, "light", 1),
  "instagram-story-4": state("instagram-story-4", "IG Story 4", InstagramStory4State, "light", 1),
  "youtube-shorts": state("youtube-shorts", "Shorts 1", YouTubeShortsState, "light", 1),
  "youtube-shorts-2": state("youtube-shorts-2", "Shorts 2", YouTubeShorts2State, "light", 1),
  "youtube-shorts-3": state("youtube-shorts-3", "Shorts 3", YouTubeShorts3State, "light", 1),
  line: state("line", "LINE", LineState, "dark", 24),
  threads: state("threads", "Threads", ThreadsState, "dark", 8),
  messenger: state("messenger", "Messenger", MessengerState, "dark", 24),
  notes: state("notes", "Notes", NotesState, "dark", 24),
  "voicemail": state("voicemail", "Voicemail", VoicemailState, "dark", 8),
  "naver": state("naver", "NAVER 지식iN", NaverState, "light", 8),
  "everytime": state("everytime", "에브리타임", EverytimeState, "dark", 40),
  "blind": state("blind", "Blind", BlindState, "dark", 40),
  "reddit": state("reddit", "Reddit", RedditState, "dark", 12),
  "snapchat": state("snapchat", "Snapchat", SnapchatState, "dark", 24),
  photos: state("photos", "Photos 1", PhotosState, "light", 24),
  "photos-2": state("photos-2", "Photos 2", Photos2State, "light", 24),
  "photos-3": state("photos-3", "Photos 3", Photos3State, "light", 24),
  lock: state("lock", "Lock screen", LockState, "light", 6),
};
