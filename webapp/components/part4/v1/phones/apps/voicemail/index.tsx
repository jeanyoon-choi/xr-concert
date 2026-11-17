"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { formatSongClock } from "../../../clock/wall-clock";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./voicemail.module.css";
import { follow } from "../follow";

// iOS 18 Phone › Voicemail, light. Layout after the system Phone app
// (UIKit large-title list, 83 pt tab bar: Favourites, Recents, Contacts,
// Keypad, Voicemail); glyphs are SF Symbols redrawn at their system point
// sizes (star.fill, clock.fill, person.crop.circle.fill,
// circle.grid.3x3.fill, recordingtape, info.circle, play.fill,
// speaker.wave.3.fill, phone.fill, trash). Colours are UIKit's light
// palette (systemBlue #007AFF, systemRed #FF3B30, secondaryLabel).
//
// Metrics (points on the 390-pt glass): 44 pt navigation bar with 16 pt
// margins, 52 pt large-title row (34/41 bold, 16 pt leading), the row's text
// 32 pt from the edge behind the unread-dot gutter, the info button 16 pt from
// the trailing edge, 0.33 pt separators, 49 pt tab bar above the 34 pt
// home-indicator inset. All glyphs listed above are drawn here.
//
// The lyric is the one voicemail in the box, left tonight by the seat's
// contact and open: Visual Voicemail's transcription spells it out as it is
// sung, each line a sentence of the same paragraph (a `bold` line is a bold
// sentence). The duration grows with it. Only the transcript text scales with
// the lyric scale; the row grows with it and pushes the player down. Tapping
// the row closes and opens it, as in the app; the play button toggles locally.

type Glyph = "star" | "clock" | "person" | "keypad" | "tape" | "info" | "play" | "pause" | "speaker" | "phone" | "trash";

function Icon({ name }: { name: Glyph }) {
  switch (name) {
    case "star":
      return <svg aria-hidden="true" viewBox="0 0 28 27" width="28" height="27"><path d="M14 1.6 17.6 9l8.1 1.2-5.9 5.7 1.4 8.1L14 20.2 6.8 24l1.4-8.1-5.9-5.7L10.4 9Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>;
    case "clock":
      return <svg aria-hidden="true" viewBox="0 0 26 26" width="26" height="26"><circle cx="13" cy="13" r="12" fill="currentColor" /><path d="M13 5.6V13.4l4.6 3" fill="none" stroke="#f9f9f9" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "person":
      return <svg aria-hidden="true" viewBox="0 0 26 26" width="26" height="26"><circle cx="13" cy="13" r="12" fill="currentColor" /><circle cx="13" cy="10.2" r="4.3" fill="#f9f9f9" /><path d="M5.2 21.2c1.6-3 4.6-4.6 7.8-4.6s6.2 1.6 7.8 4.6A12 12 0 0 1 13 25a12 12 0 0 1-7.8-3.8Z" fill="#f9f9f9" /></svg>;
    case "keypad":
      return <svg aria-hidden="true" viewBox="0 0 26 26" width="26" height="26"><circle cx="13" cy="13" r="12" fill="currentColor" />{[8, 13, 18].flatMap((y) => [8, 13, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y - 1} r="1.55" fill="#f9f9f9" />))}<circle cx="13" cy="21.4" r="1.55" fill="#f9f9f9" /></svg>;
    case "tape":
      return <svg aria-hidden="true" viewBox="0 0 34 18" width="34" height="18"><circle cx="8" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2.6" /><circle cx="26" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2.6" /><path d="M8 15h18" stroke="currentColor" strokeWidth="2.6" /></svg>;
    case "info":
      return <svg aria-hidden="true" viewBox="0 0 22 22" width="22" height="22"><circle cx="11" cy="11" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="11" cy="6.6" r="1.25" fill="currentColor" /><path d="M9.2 9.6H11.3V15.8M9 15.8h4.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "play":
      return <svg aria-hidden="true" viewBox="0 0 16 18" width="16" height="18"><path d="M2 2.2v13.6c0 .9 1 1.4 1.7 1L14.6 10a1.1 1.1 0 0 0 0-2L3.7 1.2C3 .8 2 1.3 2 2.2Z" fill="currentColor" /></svg>;
    case "pause":
      return <svg aria-hidden="true" viewBox="0 0 16 18" width="16" height="18"><rect x="2" y="1.5" width="4.2" height="15" rx="1.2" fill="currentColor" /><rect x="9.8" y="1.5" width="4.2" height="15" rx="1.2" fill="currentColor" /></svg>;
    case "speaker":
      return <svg aria-hidden="true" viewBox="0 0 28 22" width="28" height="22"><path d="M2 8.2a1.2 1.2 0 0 1 1.2-1.2h3.4L11.8 2.4c.7-.6 1.7-.1 1.7.8v15.6c0 .9-1 1.4-1.7.8L6.6 15H3.2A1.2 1.2 0 0 1 2 13.8Z" fill="currentColor" /><path d="M17 7.6a4.6 4.6 0 0 1 0 6.8M20 4.8a8.6 8.6 0 0 1 0 12.4M23 2a12.6 12.6 0 0 1 0 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "phone":
      return <svg aria-hidden="true" viewBox="0 0 22 22" width="22" height="22"><path d="M5.6 1.6c.6-.4 1.5-.3 2 .3l2.4 3.1c.5.6.4 1.5-.1 2.1L8.6 8.4c.9 2.2 2.8 4.1 5 5l1.3-1.3c.6-.5 1.5-.6 2.1-.1l3.1 2.4c.6.5.7 1.4.3 2l-1.2 1.9c-.8 1.2-2.3 1.8-3.7 1.4C9.2 18.3 3.7 12.8 2.4 6.5c-.3-1.4.2-2.9 1.4-3.7Z" fill="currentColor" /></svg>;
    case "trash":
      return <svg aria-hidden="true" viewBox="0 0 20 22" width="20" height="22"><path d="M1.5 4.6h17M7 4.4V2.6c0-.6.5-1.1 1.1-1.1h3.8c.6 0 1.1.5 1.1 1.1v1.8M3.6 4.8l1 14.1c.1 1 .9 1.6 1.8 1.6h7.2c.9 0 1.7-.7 1.8-1.6l1-14.1M8 8.6v8.2M12 8.6v8.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

type Sentence = { key: number; text: string; bold: boolean };
type Voicemail = { name: string; label: string; when: string; seconds: number; transcript: Sentence[] };

const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** A sung line as a sentence of the transcript: Visual Voicemail closes finished sentences with a full stop. */
const sentence = (text: string, done: boolean) => {
  const head = text.charAt(0).toUpperCase() + text.slice(1);
  return done && !/[.!?…,]$/.test(head) ? `${head}.` : head;
};

function Row({ mail, open, playing, onToggle, onPlay, typing }: {
  mail: Voicemail;
  open: boolean;
  playing: boolean;
  onToggle: () => void;
  onPlay: () => void;
  typing: boolean;
}) {
  return (
    <li className={styles.row} data-open={open || undefined}>
      <button type="button" className={styles.head} onClick={onToggle} aria-expanded={open}>
        <span className={styles.dot} data-unread={!open || undefined} />
        <span className={styles.name}>{mail.name}</span>
        <span className={styles.when}>{mail.when}</span>
        <span className={styles.info}><Icon name="info" /></span>
        <span className={styles.label}>{mail.label}</span>
        {open ? null : <span className={styles.length}>{duration(mail.seconds)}</span>}
      </button>
      {open ? (
        <div className={styles.detail}>
          <p className={styles.beta}>Transcription</p>
          <p data-lyric className={styles.transcript} data-typing={typing || undefined}>
            {mail.transcript.map((part, index) => (
              <span key={part.key} data-bold={part.bold || undefined}>{index ? " " : ""}{part.text}</span>
            ))}
          </p>
          <p className={styles.feedback}>
            Was this transcription <span>useful</span> or <span>not useful</span>?
          </p>
          <div className={styles.player}>
            <button type="button" className={styles.play} onClick={onPlay} aria-label={playing ? "Pause" : "Play"}>
              <Icon name={playing ? "pause" : "play"} />
            </button>
            <span className={styles.scrub}>
              <span className={styles.track}>
                <span className={styles.thumb} />
              </span>
              <span className={styles.times}>
                <span>0:00</span>
                <span>-{duration(mail.seconds)}</span>
              </span>
            </span>
          </div>
          <div className={styles.actions}>
            <span className={styles.action} aria-label="Speaker"><Icon name="speaker" /></span>
            <span className={styles.action} aria-label="Call back"><Icon name="phone" /></span>
            <span className={styles.action} data-destructive aria-label="Delete"><Icon name="trash" /></span>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function VoicemailState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const contact = contactFor(seat);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [playing, setPlaying] = useState(false);

  const words = lines.reduce((sum, line) => sum + line.sung, 0);
  // The box holds only tonight's voicemail; before the song it is empty.
  const tonight: Voicemail | null = lines.length
    ? {
        name: contact.name,
        label: "mobile",
        when: formatSongClock(lines[0]!.startMs),
        seconds: 3 + Math.round(words * 0.42),
        transcript: lines.map((line) => ({ key: line.cueIndex, text: sentence(line.text, !line.current), bold: Boolean(line.bold) })),
      }
    : null;
  const typing = Boolean(tonight && lines.at(-1)?.current && open);

  // Keep the end of the transcript (where it is being written) in view.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !shown || !lines.length) return;
    const text = list.querySelector<HTMLElement>("[data-typing]");
    if (!text) return;
    const bottom = text.offsetTop + text.offsetHeight + 170;
    follow(list, Math.max(0, bottom - list.clientHeight), reducedMotion);
  }, [lines, shown, reducedMotion]);

  return (
    <section className={styles.app} aria-label="Voicemail" inert={!shown}>
      <div ref={listRef} className={styles.scroll}>
        <header className={styles.nav}>
          <span>Greeting</span>
          <span>Edit</span>
        </header>
        <h1 className={styles.large}>Voicemail</h1>
        <ul className={styles.list}>
          {tonight ? (
            <Row mail={tonight} open={open} playing={playing} onToggle={() => setOpen(!open)} onPlay={() => setPlaying(!playing)} typing={typing} />
          ) : null}
        </ul>
      </div>

      <nav className={styles.tabs} aria-hidden="true">
        <span><Icon name="star" />Favourites</span>
        <span><Icon name="clock" />Recents</span>
        <span><Icon name="person" />Contacts</span>
        <span><Icon name="keypad" />Keypad</span>
        <span data-selected>
          <i className={styles.tapeIcon}><Icon name="tape" />{tonight && !open ? <b className={styles.badge}>1</b> : null}</i>
          Voicemail
        </span>
      </nav>
    </section>
  );
}

export default memo(VoicemailState);
