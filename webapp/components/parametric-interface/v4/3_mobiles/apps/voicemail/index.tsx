"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { dateLabel, formatSongClock } from "../../clock-face";
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
// The lyric is a voicemail the seat's contact left tonight, opened at the
// top of the list: Visual Voicemail's transcription spells it out as it is
// sung, each line a sentence of the same transcript. The duration grows with
// it. Earlier voicemails sit under it collapsed; tapping one opens it, as in
// the app, and the play button toggles locally.

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

type Voicemail = { key: string; name: string; label: string; when: string; seconds: number; unread: boolean; transcript: string };

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth", "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-ninth", "thirtieth", "thirty-first"];
/** Days in the list, from today: 2 and 4 days back by weekday, 6 back as a date; today's appointment as the dentist says it. */
const weekday = (offsetDays: number) => dateLabel("en-GB", { weekday: "long" }, offsetDays);
const WHEN = { b: weekday(-2), c: weekday(-4), d: dateLabel("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }, -6) };
const APPOINTMENT = `${weekday(0)} the ${ORDINALS[Number(dateLabel("en-GB", { day: "numeric" })) - 1]}`;

/** The voicemails already in the box: ordinary calls, one earlier from the same person. */
function earlierFor(name: string): Voicemail[] {
  return [
    { key: "a", name, label: "mobile", when: "Yesterday", seconds: 38, unread: true, transcript: `Hey, it's me. I know it's late. I just… call me back when you get this, okay? It's nothing bad. I just want to talk.` },
    { key: "b", name: "Mum", label: "home", when: WHEN.b, seconds: 51, unread: false, transcript: "Hi love, it's Mum. Just checking you got home all right. Your dad says hello. Ring us when you're free, no rush." },
    { key: "c", name: "Bright Smile Dental", label: "work", when: WHEN.c, seconds: 27, unread: false, transcript: `Hello, this is a reminder of your appointment on ${APPOINTMENT} at 9:40. Please call us if you need to reschedule. Thank you.` },
    { key: "d", name, label: "mobile", when: WHEN.d, seconds: 14, unread: false, transcript: "Hey. Did you leave your charger at mine? I'll drop it round." },
  ];
}

const duration = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** A sung line as a sentence of the transcript: Visual Voicemail closes finished sentences with a full stop. */
const sentence = (text: string, done: boolean) => {
  const head = text.charAt(0).toUpperCase() + text.slice(1);
  return done && !/[.!?…,]$/.test(head) ? `${head}.` : head;
};

function Row({ mail, open, playing, onToggle, onPlay, transcript, typing }: {
  mail: Voicemail;
  open: boolean;
  playing: boolean;
  onToggle: () => void;
  onPlay: () => void;
  transcript: string;
  typing: boolean;
}) {
  return (
    <li className={styles.row} data-open={open || undefined}>
      <button type="button" className={styles.head} onClick={onToggle} aria-expanded={open}>
        <span className={styles.dot} data-unread={(mail.unread && !open) || undefined} />
        <span className={styles.name} data-unread={(mail.unread && !open) || undefined}>{mail.name}</span>
        <span className={styles.when}>{mail.when}</span>
        <span className={styles.info}><Icon name="info" /></span>
        <span className={styles.label}>{mail.label}</span>
        {open ? null : <span className={styles.length}>{duration(mail.seconds)}</span>}
      </button>
      {open ? (
        <div className={styles.detail}>
          <p className={styles.beta}>Transcription Beta</p>
          <p className={styles.transcript} data-typing={typing || undefined}>{transcript}</p>
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
  const earlier = earlierFor(contact.name);
  const listRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const words = lines.reduce((sum, line) => sum + line.sung, 0);
  const tonight: Voicemail | null = lines.length
    ? {
        key: "tonight",
        name: contact.name,
        label: "mobile",
        when: formatSongClock(lines[0]!.startMs),
        seconds: 3 + Math.round(words * 0.42),
        unread: true,
        transcript: lines.map((line) => sentence(line.text, !line.current)).join(" "),
      }
    : null;
  const all = tonight ? [tonight, ...earlier] : earlier;
  // Tonight's voicemail opens itself as it arrives; before the song, the newest one is open.
  const open = opened ?? all[0]!.key;
  const unread = all.filter((mail) => mail.unread && mail.key !== open).length;
  const typing = Boolean(tonight && lines.at(-1)?.current && open === "tonight");

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
          {all.map((mail) => (
            <Row
              key={mail.key}
              mail={mail}
              open={open === mail.key}
              playing={playing === mail.key}
              onToggle={() => setOpened(open === mail.key ? "none" : mail.key)}
              onPlay={() => setPlaying(playing === mail.key ? null : mail.key)}
              transcript={mail.transcript}
              typing={mail.key === "tonight" && typing}
            />
          ))}
        </ul>
      </div>

      <nav className={styles.tabs} aria-hidden="true">
        <span><Icon name="star" />Favourites</span>
        <span><Icon name="clock" />Recents</span>
        <span><Icon name="person" />Contacts</span>
        <span><Icon name="keypad" />Keypad</span>
        <span data-selected>
          <i className={styles.tapeIcon}><Icon name="tape" />{unread ? <b className={styles.badge}>{unread}</b> : null}</i>
          Voicemail
        </span>
      </nav>
    </section>
  );
}

export default memo(VoicemailState);
