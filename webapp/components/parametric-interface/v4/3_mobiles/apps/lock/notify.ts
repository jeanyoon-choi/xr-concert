// What the lock screen shows for a seat: the notifications of the app the
// phone was in, worded as that app pushes them, under that app's own icon. Icons are each app's App Store artwork (120 px, fetched
// 2026-11-03 from the iTunes lookup API's artworkUrl512), saved under
// public/parametric-interface/v4/icons. Messages has no store listing and
// draws its own icon; Notes never notifies, so a Notes seat hears Messages.

import type { SungLine } from "../../../model/lines";
import type { PhoneState } from "../../states";
import { contactFor } from "../types";

export type Notice = {
  /** The app the notification opens. */
  readonly state: PhoneState;
  /** Icon path, or null for Messages' drawn icon. */
  readonly icon: string | null;
  readonly title: string;
  readonly body: string;
};

const icon = (id: string) => `/parametric-interface/v4/icons/${id}.png`;
const handle = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");

/** Friends in the KakaoTalk room, viewers, commenters: one per line, in turn. */
const KAKAO_FRIENDS = ["하은", "수아", "예린"] as const;
const HANDLES = ["hana__lee", "jiwoo.k", "kai_wnd", "priya_dsouza", "ellie.jpg", "oskar.lb"] as const;

export function noticeOf(state: PhoneState, seat: number, line: SungLine): Notice {
  const { name } = contactFor(seat);
  const text = line.text;
  const other = HANDLES[(line.cueIndex + seat) % HANDLES.length]!;

  switch (state) {
    case "kakaotalk":
      return { state, icon: icon(state), title: "우리끼리", body: `${KAKAO_FRIENDS[line.cueIndex % KAKAO_FRIENDS.length]}: ${text}` };
    case "instagram-dm":
      return { state, icon: icon("instagram"), title: `${handle(name)}.k`, body: text };
    case "whatsapp":
    case "telegram":
    case "line":
    case "messenger":
      return { state, icon: icon(state), title: name, body: text };
    case "x":
      return { state, icon: icon(state), title: "X", body: `${name} posted: ${text}` };
    case "chatgpt":
      return { state, icon: icon(state), title: "ChatGPT", body: text };
    case "tiktok":
      return { state, icon: icon(state), title: "TikTok", body: `${other} commented: ${text}` };
    case "instagram":
      return { state, icon: icon(state), title: "Instagram", body: `${other} commented: ${text}` };
    case "discord":
      return { state, icon: icon(state), title: `${handle(name)} (#general, friends)`, body: text };
    case "threads":
      return { state, icon: icon(state), title: "Threads", body: `${other}: ${text}` };
    case "voicemail":
      return { state, icon: null, title: "Voicemail", body: `New voicemail from ${name}: “${text}”` };
    case "mail":
      return { state, icon: icon(state), title: "Drafts", body: text };
    case "safari":
      return { state, icon: icon(state), title: "Google", body: text };
    case "naver":
      return { state, icon: icon(state), title: "지식iN", body: `내 질문에 답변이 등록되었습니다: ${text}` };
    case "everytime":
      return { state, icon: icon(state), title: "에브리타임", body: `새로운 댓글이 달렸어요: ${text}` };
    case "blind":
      return { state, icon: icon(state), title: "블라인드", body: `내 글에 새 댓글: ${text}` };
    case "karrot":
      return { state, icon: icon(state), title: "당근", body: text };
    case "reddit":
      return { state, icon: icon(state), title: "r/relationship_advice", body: `${other} replied: ${text}` };
    case "snapchat":
      return { state, icon: icon(state), title: "Snapchat", body: `from ${name}` };
    case "signal":
      return { state, icon: icon(state), title: name, body: text };
    case "character-ai":
      return { state, icon: icon(state), title: "Ezra", body: text };
    case "gemini":
      return { state, icon: icon(state), title: "Gemini", body: text };
    case "docs":
      return { state, icon: icon(state), title: "letter (don't send)", body: text };
    default:
      return { state: "messages", icon: null, title: name, body: text };
  }
}
