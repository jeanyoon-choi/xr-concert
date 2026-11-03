// 3_mobiles' own list of phone states: 2's seventeen plus the apps added in
// the extension. Kept here, not in model/score.ts, so 1 and 2 are untouched.

export type PhoneState =
  | "messages"
  | "kakaotalk"
  | "instagram-dm"
  | "whatsapp"
  | "x"
  | "chatgpt"
  | "telegram"
  | "tiktok"
  | "slack"
  | "instagram"
  | "line"
  | "discord"
  | "youtube"
  | "threads"
  | "messenger"
  | "notes"
  | "lock";

/** The apps phones hold, in the order seats take them; the lock screen is not one. */
export const APPS: readonly PhoneState[] = [
  "messages", "kakaotalk", "instagram-dm", "whatsapp", "x", "chatgpt", "telegram", "tiktok",
  "slack", "instagram", "line", "discord", "youtube", "threads", "messenger", "notes",
];
