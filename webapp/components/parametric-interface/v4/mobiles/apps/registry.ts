// The phone states the score can assign. Add a state by giving it a folder
// under apps/, a PhoneState name in model/score.ts, and an entry here.

import type { ComponentType } from "react";
import type { PhoneState } from "../../model/score";
import AssistantState from "./assistant";
import LockState from "./lock";
import MessagesState from "./messages";
import type { PhoneStateProps } from "./types";

export type PhoneStateDefinition = {
  readonly id: PhoneState;
  readonly label: string;
  readonly Screen: ComponentType<PhoneStateProps>;
  /** Status-bar glyphs over this state: "light" on dark screens. */
  readonly statusTone: "light" | "dark";
  /** Sung lines the state keeps (the thread's scrollback, the notification stack). */
  readonly history: number;
};

export const PHONE_STATES: Readonly<Record<PhoneState, PhoneStateDefinition>> = {
  messages: { id: "messages", label: "Messages", Screen: MessagesState, statusTone: "dark", history: 24 },
  assistant: { id: "assistant", label: "Assistant", Screen: AssistantState, statusTone: "dark", history: 12 },
  lock: { id: "lock", label: "Lock screen", Screen: LockState, statusTone: "light", history: 6 },
};

/** Order states stack in a phone: earlier entries lie beneath later ones. */
export const PHONE_STATE_ORDER: readonly PhoneState[] = ["messages", "assistant", "lock"];
