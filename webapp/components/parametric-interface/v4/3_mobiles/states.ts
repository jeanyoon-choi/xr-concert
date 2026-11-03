// 3_mobiles' own list of phone states: 2's sixteen apps and the lock screen,
// plus the text interfaces of the extension — only those that belong to
// this situation (a relationship, a break-up). Kept here, not in
// model/score.ts, so 1 and 2 are untouched.

export type PhoneState =
  | "messages"
  | "kakaotalk"
  | "instagram-dm"
  | "whatsapp"
  | "x"
  | "chatgpt"
  | "telegram"
  | "tiktok"
  | "instagram"
  | "line"
  | "discord"
  | "threads"
  | "messenger"
  | "notes"
  | "voicemail"
  | "mail"
  | "ai-summary"
  | "safari"
  | "naver"
  | "everytime"
  | "blind"
  | "karrot"
  | "reddit"
  | "snapchat"
  | "signal"
  | "character-ai"
  | "gemini"
  | "docs"
  | "photos"
  | "lock";

/**
 * The apps phones hold, in the order seats take them (the first twelve fill
 * the default grid); the lock screen is not one.
 */
export const APPS: readonly PhoneState[] = [
  "messages", "kakaotalk", "safari", "whatsapp", "everytime", "chatgpt",
  "voicemail", "tiktok", "karrot", "instagram", "photos", "x",
  "telegram", "reddit", "notes", 
  "naver", "snapchat", "mail", "line", "discord",
  "instagram-dm", "blind", "character-ai",
  "threads", "signal", "gemini", "messenger", "docs",
  "ai-summary",
];
