// The phone states, grouped by the kind of interface. Only text interfaces
// that belong to this situation (a relationship, a break-up) are here. The
// groups are the one source of order: seats take the apps in this order,
// and the options control lists them this way.

export const STATE_GROUPS = [
  {
    id: "chat",
    // One-to-one channels a couple would use.
    label: "1 Chat",
    states: ["messages", "kakaotalk", "instagram-dm", "whatsapp", "line", "messenger", "snapchat"],
  },
  { id: "posts", label: "2 Posts and comments", states: ["x", "threads", "reddit", "everytime", "blind", "naver"] },
  { id: "media", label: "3 Media", states: ["tiktok", "tiktok-2", "tiktok-3", "tiktok-4", "tiktok-5", "tiktok-6", "instagram", "instagram-2", "instagram-story-1", "instagram-story-2", "instagram-story-3", "instagram-story-4", "youtube-shorts", "youtube-shorts-2", "youtube-shorts-3", "photos", "photos-2", "photos-3"] },
  { id: "own", label: "4 Notes and system", states: ["notes", "voicemail", "lock"] },
] as const;

export type PhoneState = (typeof STATE_GROUPS)[number]["states"][number];

/** Every state that is an app, in group order; the lock screen is not one — it lies on top of an app. */
export const ALL_APPS: readonly PhoneState[] = STATE_GROUPS.flatMap((group): readonly PhoneState[] => group.states).filter((state) => state !== "lock");

/** The apps the score deals unless told otherwise: all of them. */
export const APPS = ALL_APPS;
