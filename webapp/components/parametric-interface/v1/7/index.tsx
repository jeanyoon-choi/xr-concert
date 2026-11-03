"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { LYRIC_LEAD_MS, useLyricCue } from "../timeline/use-lyric-cue";
import styles from "./messages.module.css";

type IconName = "compose" | "search" | "video" | "info" | "apps" | "emoji" | "audio";

type Conversation = {
  id: string;
  name: string;
  initials: string;
  preview: string;
  time: string;
  unread?: boolean;
  group?: boolean;
};

type TranscriptItem =
  | { kind: "time"; id: string; day: string; time: string }
  | { kind: "bubble"; id: string; text: string; outgoing: boolean; tail: boolean; arriving: boolean }
  | { kind: "receipt"; id: string; text: string };

const CONTACT = "Daniel";
// The song clock starts at 21:30; every lyric minute is read from that baseline.
const CLOCK_BASE_MINUTES = 21 * 60 + 30;
// Messages shows the typing bubble only while a reply is actually being composed.
const TYPING_WINDOW_MS = 2_400;
const MAX_LYRIC_BUBBLES = 60;

const conversations: readonly Conversation[] = [
  { id: "studio", name: "Studio Group", initials: "SG", preview: "Minji: Load-in is moved to 2 pm, the van is already booked.", time: "20:58", group: true, unread: true },
  { id: "mom", name: "Mom", initials: "M", preview: "Did you eat? Call me when you are home.", time: "20:41" },
  { id: "jiwoo", name: "Jiwoo Han", initials: "JH", preview: "Sending the revised floor plan tonight.", time: "19:12" },
  { id: "hana", name: "Hana", initials: "H", preview: "haha okay see you there", time: "18:30", unread: true },
  { id: "landlord", name: "Mr. Seo", initials: "S", preview: "The plumber will come by on Thursday morning.", time: "Yesterday" },
  { id: "courier", name: "+82 10-4417-2093", initials: "", preview: "Your parcel is at the front desk. Unit 1203.", time: "Yesterday" },
  { id: "eunbi", name: "Eunbi", initials: "E", preview: "Liked “thank you so much!!”", time: "Saturday" },
  { id: "kevin", name: "Kevin Park", initials: "KP", preview: "Let me know if the invoice needs changes.", time: "Friday" },
  { id: "yuna", name: "Yuna", initials: "Y", preview: "Photos from Sunday are in the shared album.", time: "Thursday" },
];

// The ordinary exchange that already sits above the lyric.
const baselineTranscript: readonly TranscriptItem[] = [
  { kind: "time", id: "base-time-1", day: "Yesterday", time: "23:48" },
  { kind: "bubble", id: "base-1", text: "are you still up", outgoing: false, tail: false, arriving: false },
  { kind: "bubble", id: "base-2", text: "can we talk", outgoing: false, tail: true, arriving: false },
  { kind: "bubble", id: "base-3", text: "Not tonight. I'm going to sleep.", outgoing: true, tail: true, arriving: false },
  { kind: "time", id: "base-time-2", day: "Today", time: "21:12" },
  { kind: "bubble", id: "base-4", text: "I left your jacket with the doorman", outgoing: true, tail: false, arriving: false },
  { kind: "bubble", id: "base-5", text: "Please stop coming by the studio.", outgoing: true, tail: true, arriving: false },
  { kind: "receipt", id: "base-read", text: "Read 21:13" },
];

function formatClock(songMs: number) {
  const minutes = CLOCK_BASE_MINUTES + Math.floor(songMs / 60_000);
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function Icon({ name }: { name: IconName }) {
  const props = {
    "aria-hidden": true,
    fill: "none",
    focusable: false,
    viewBox: "0 0 24 24",
  } as const;

  switch (name) {
    case "compose": return <svg {...props}><path d="M18.6 12.6v5.2a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 17.8V7.6a2.2 2.2 0 0 1 2.2-2.2h5.2" /><path d="m9.4 14.6.5-2.6 8.2-8.2a1.5 1.5 0 0 1 2.1 2.1L12 14.1l-2.6.5Z" /></svg>;
    case "search": return <svg {...props}><circle cx="10.5" cy="10.5" r="5.8" /><path d="m15 15 4.6 4.6" /></svg>;
    case "video": return <svg {...props}><rect x="2.8" y="6.4" width="12.6" height="11.2" rx="2.6" /><path d="m15.4 10.6 5-3v8.8l-5-3" /></svg>;
    case "info": return <svg {...props}><circle cx="12" cy="12" r="8.6" /><path d="M12 11v5.4" /><circle cx="12" cy="7.9" r=".9" fill="currentColor" stroke="none" /></svg>;
    case "apps": return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7.8v8.4M7.8 12h8.4" /></svg>;
    case "emoji": return <svg {...props}><circle cx="12" cy="12" r="8.6" /><path d="M8.4 14.2c.9 1.3 2.1 2 3.6 2s2.7-.7 3.6-2" /><circle cx="9.2" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="14.8" cy="10" r="1" fill="currentColor" stroke="none" /></svg>;
    case "audio": return <svg {...props}><path d="M4.5 10.5v3M8.2 7.5v9M12 4.5v15M15.8 8.5v7M19.5 10.5v3" /></svg>;
  }
}

export default function ParametricInterfaceSeven({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <MessagesTranscript />
    </SongPlayback>
  );
}

function MessagesTranscript() {
  const { currentTimeMs, hasStarted, isPlaying, reducedMotion, wordIndex, wordTimings } = useLyricCue();
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Every word that has reached its onset, derived from the audio clock so seeks
  // in either direction rebuild the same transcript.
  const arrivedCount =
    hasStarted && currentTimeMs + LYRIC_LEAD_MS >= wordTimings[0]!.startMs ? wordIndex + 1 : 0;

  const lyricTranscript = useMemo(() => {
    const items: TranscriptItem[] = [];
    const firstShown = Math.max(0, arrivedCount - MAX_LYRIC_BUBBLES);

    for (let index = firstShown; index < arrivedCount; index += 1) {
      const timing = wordTimings[index]!;
      const next = wordTimings[index + 1];

      // Messages stamps a conversation only after a long silence, so the lyric
      // gets one stamp; its cues stay separated by the tail-and-gap grouping.
      if (index === 0) {
        items.push({ kind: "time", id: "lyric-time", day: "Today", time: formatClock(timing.startMs) });
      }

      items.push({
        kind: "bubble",
        id: `word-${index}`,
        text: timing.word,
        outgoing: false,
        tail: !next || next.cueIndex !== timing.cueIndex || index === arrivedCount - 1,
        arriving: index === arrivedCount - 1,
      });
    }

    return items;
  }, [arrivedCount, wordTimings]);

  const nextWord = wordTimings[arrivedCount];
  const isTyping =
    hasStarted &&
    isPlaying &&
    nextWord !== undefined &&
    nextWord.startMs - currentTimeMs <= TYPING_WINDOW_MS;

  const latestWord = arrivedCount > 0 ? wordTimings[arrivedCount - 1]! : null;
  const contactPreview = latestWord ? latestWord.word : "Read 21:13";
  const contactTime = latestWord ? formatClock(latestWord.startMs) : "21:13";

  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [arrivedCount, isTyping, reducedMotion]);

  // Once lyric bubbles push the baseline out of the bounded history, it is no longer rendered.
  const transcript = arrivedCount > MAX_LYRIC_BUBBLES ? lyricTranscript : [...baselineTranscript, ...lyricTranscript];

  return (
    <main className={`${styles.messages}${reducedMotion ? ` ${styles.reducedMotion}` : ""}`}>
      <aside aria-label="Conversations" className={styles.sidebar}>
        <div className={styles.sidebarToolbar}>
          <div aria-hidden="true" className={styles.trafficLights}><i /><i /><i /></div>
          <button aria-label="Compose" className={styles.toolbarButton} type="button"><Icon name="compose" /></button>
        </div>
        <div className={styles.search} role="search"><Icon name="search" /><span>Search</span></div>
        <div className={styles.conversationList} role="list">
          <ConversationRow
            conversation={{ id: "daniel", name: CONTACT, initials: "D", preview: contactPreview, time: contactTime }}
            selected
          />
          {conversations.map((conversation) => <ConversationRow conversation={conversation} key={conversation.id} />)}
        </div>
      </aside>

      <section aria-label={`Conversation with ${CONTACT}`} className={styles.conversation}>
        <header className={styles.conversationToolbar}>
          <p className={styles.recipient}><span>To:</span> {CONTACT}</p>
          <div className={styles.toolbarActions}>
            <button aria-label="FaceTime" className={styles.toolbarButton} type="button"><Icon name="video" /></button>
            <button aria-label="Details" className={styles.toolbarButton} type="button"><Icon name="info" /></button>
          </div>
        </header>

        <div aria-live="polite" className={styles.transcript} ref={transcriptRef}>
          <div className={styles.transcriptInner}>
            {transcript.map((item) => <TranscriptRow item={item} key={item.id} />)}
            {isTyping ? (
              <div aria-label={`${CONTACT} is typing`} className={`${styles.bubbleRow} ${styles.incomingRow}`}>
                <div className={styles.typingBubble}><i /><i /><i /></div>
              </div>
            ) : null}
          </div>
        </div>

        <footer className={styles.composer}>
          <button aria-label="Apps" className={styles.composerButton} type="button"><Icon name="apps" /></button>
          <div className={styles.field}>
            <span>iMessage</span>
            <Icon name="audio" />
          </div>
          <button aria-label="Emoji" className={styles.composerButton} type="button"><Icon name="emoji" /></button>
        </footer>
      </section>
    </main>
  );
}

function ConversationRow({ conversation, selected = false }: { conversation: Conversation; selected?: boolean }) {
  return (
    <article className={`${styles.conversationRow}${selected ? ` ${styles.selectedRow}` : ""}`} role="listitem">
      <span aria-hidden="true" className={styles.unreadDot}>{conversation.unread ? <i /> : null}</span>
      <span aria-hidden="true" className={`${styles.avatar}${conversation.group ? ` ${styles.groupAvatar}` : ""}`}>
        {conversation.initials || <svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="4" /><path d="M4.5 21c.8-4 3.6-6.2 7.5-6.2s6.7 2.2 7.5 6.2" /></svg>}
      </span>
      <div className={styles.conversationText}>
        <div className={styles.conversationHeading}>
          <strong>{conversation.name}</strong>
          <time>{conversation.time}</time>
        </div>
        <p>{conversation.preview}</p>
      </div>
    </article>
  );
}

function TranscriptRow({ item }: { item: TranscriptItem }) {
  if (item.kind === "time") {
    return <p className={styles.timestamp}><b>{item.day}</b> {item.time}</p>;
  }

  if (item.kind === "receipt") {
    return <p className={styles.receipt}>{item.text}</p>;
  }

  return (
    <div className={`${styles.bubbleRow} ${item.outgoing ? styles.outgoingRow : styles.incomingRow}`}>
      <p
        className={[
          styles.bubble,
          item.outgoing ? styles.outgoing : styles.incoming,
          item.tail ? styles.tail : "",
          item.arriving ? styles.arriving : "",
        ].filter(Boolean).join(" ")}
      >
        {item.text}
      </p>
    </div>
  );
}
