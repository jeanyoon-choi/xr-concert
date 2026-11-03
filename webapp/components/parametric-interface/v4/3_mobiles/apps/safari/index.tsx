"use client";

import { memo, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { plain } from "../../../model/lines";
import type { PhoneStateProps } from "../types";
import { SafariBar } from "./chrome";
import styles from "./safari.module.css";

// iOS 18 Safari on google.com, the address bar at the bottom (Safari's
// default). She is typing into Google: the sung line is the query, typed into
// the focused search box character by character, and Google's autocomplete
// list opens under it — the line completed (the untyped rest in bold, as
// Google sets it) and its usual tails (“lyrics”, “meaning”, “what to do”,
// “reddit”). The lines already sung are her recent searches, with the clock.
// Before the song the page is google.com at rest. The search box is real:
// what the participant types and searches becomes a recent search.
//
// Sources: google.com served to iOS Safari (Nov 2026) — the focused search
// overlay (.Sl6fgd) CSS: 48 pt row, #1a73e8 back arrow (24 pt, 6 pt padding),
// 16/24 query in #202124, #70757a clear, suggestion rows (.sbct: 24 pt icon
// with 12/8 pt margins, 16/22 text, bold completion, ↖ fill arrow 12 pt
// padding), the list's #dadce0 top rule and 0 6 0 10 pt margins; the icons
// are Google's own served Material paths and searchbox_sprites355_hr.webp
// (magnifier, clock, ↖); the logo is googlelogo_color_272x92dp. The purple of
// her own past searches is Google's visited-history colour (#681da8), set by
// eye from the app, not from served CSS.

const SPRITE = "/parametric-interface/v4/apps/safari/searchbox-sprites.webp";
const TAILS = ["lyrics", "meaning", "what to do", "reddit"] as const;
const RECENT_LIMIT = 7;
const SEND_LIMIT = 120;

function Icon({ name }: { name: "menu" | "apps" | "back" | "search" | "clear" | "mic" | "lens" }) {
  switch (name) {
    case "menu":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" /></svg>;
    case "apps":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M6,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM16,6c0,1.1 0.9,2 2,2s2,-0.9 2,-2 -0.9,-2 -2,-2 -2,0.9 -2,2zM12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2z" fill="currentColor" /></svg>;
    case "back":
      return <svg aria-hidden="true" viewBox="0 -960 960 960" width="24" height="24"><path d="M313-440L537-216l-57,56L160-480L480-800l57,56L313-520H800v80H313Z" fill="currentColor" /></svg>;
    case "search":
      return <svg aria-hidden="true" viewBox="0 -960 960 960" width="24" height="24"><path d="M784-120L532-372q-30,24-69,38t-83,14q-109,0-184.5-75.5T120-580t75.5-184.5T380-840t184.5,75.5T640-580q0,44-14,83t-38,69L840-176l-56,56ZM380-400q75,0 127.5-52.5T560-580T507.5-707.5T380-760T252.5-707.5T200-580t52.5,127.5T380-400Z" fill="currentColor" /></svg>;
    case "clear":
      return <svg aria-hidden="true" viewBox="0 -960 960 960" width="24" height="24"><path d="M256-200l-56-56L424-480L200-704l56-56L480-536L704-760l56,56L536-480L760-256l-56,56L480-424L256-200Z" fill="currentColor" /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 -960 960 960" width="24" height="24"><path d="M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm-40 280v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Z" fill="currentColor" /></svg>;
    case "lens":
      return <svg aria-hidden="true" viewBox="0 -960 960 960" width="24" height="24"><path d="M480-320q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm240 160q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160Zm-440 40q-66 0-113-47t-47-113v-80h80v80q0 33 23.5 56.5T280-200h200v80H280Zm480-320v-160q0-33-23.5-56.5T680-680H280q-33 0-56.5 23.5T200-600v120h-80v-120q0-66 47-113t113-47h80l40-80h160l40 80h80q66 0 113 47t47 113v160h-80Z" fill="currentColor" /></svg>;
  }
}

/** One of Google's 24 pt searchbox sprites: 0 magnifier, 1 clock, 3 the ↖ fill arrow. */
function Sprite({ index }: { index: 0 | 1 | 3 }) {
  return <span aria-hidden="true" className={styles.sprite} style={{ backgroundImage: `url(${SPRITE})`, backgroundPosition: `0 ${-25 * index}px` }} />;
}

type Suggestion = { key: string; typed: string; rest: string };
type Recent = { key: string; text: string };

/** How Google writes a query back in its predictions: lower case, no punctuation. */
function normal(text: string) {
  return plain(text).toLowerCase().replace(/[“”"]/g, "").replace(/[,.!?:;]/g, "").replace(/\s+/g, " ").trim();
}

/** Google's predictions for what is typed: the query, the line completed, then its common tails. */
function predictions(typed: string, full: string): Suggestion[] {
  const query = normal(typed);
  if (!query) return [];
  const whole = normal(full);
  const base = whole.startsWith(query) ? whole : query;
  const rows = [query, base, ...TAILS.map((tail) => `${base} ${tail}`)].filter((row, index, all) => all.indexOf(row) === index);
  return rows.slice(0, 5).map((row) => {
    const shared = row.startsWith(query) ? query.length : 0;
    return { key: row, typed: row.slice(0, shared), rest: row.slice(shared) };
  });
}

function SafariState({ lines, replies, shown, act }: PhoneStateProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const last = lines.at(-1);
  const query = draft ?? last?.text ?? "";
  const focused = Boolean(last) || draft !== null;

  const suggestions = useMemo(() => predictions(query, draft === null && last ? last.full : query), [query, draft, last]);

  // Her earlier searches, newest first: the lines sung before this one, and what she searched herself.
  const recent = useMemo(() => {
    const entries: { at: number; row: Recent }[] = [];
    for (const line of lines) {
      if (line === last && draft === null) continue;
      entries.push({ at: line.cueIndex, row: { key: `l${line.cueIndex}`, text: normal(line.full) } });
    }
    for (const reply of replies) entries.push({ at: reply.afterCue + 0.5, row: { key: `r${reply.id}`, text: normal(reply.text) || reply.text } });
    // Google keeps one row per distinct search.
    return entries
      .sort((a, b) => b.at - a.at)
      .map((entry) => entry.row)
      .filter((row, index, all) => all.findIndex((other) => other.text === row.text) === index)
      .slice(0, RECENT_LIMIT);
  }, [lines, replies, last, draft]);

  const search = (event?: FormEvent) => {
    event?.preventDefault();
    const text = (draft ?? "").trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    search();
  };

  return (
    <section className={styles.app} aria-label="Safari — Google" inert={!shown}>
      {focused ? (
        <div className={styles.overlay}>
          <form className={styles.row} role="search" onSubmit={search}>
            <button type="button" className={styles.back} aria-label="Back" onClick={() => setDraft(null)}>
              <Icon name="back" />
            </button>
            <label className={styles.query}>
              <span className={styles.visuallyHidden}>Google Search</span>
              <textarea
                value={query}
                rows={1}
                maxLength={2048}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                enterKeyHint="search"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
              />
              {/* The textarea sizes itself to the query, as Google's mirror div does. */}
              <span className={styles.mirror} aria-hidden="true" data-typing={(draft === null && last?.current) || undefined}>
                {query}
              </span>
            </label>
            <span className={styles.tools}>
              {query ? (
                <button type="button" className={styles.clear} aria-label="Clear Search" onClick={() => setDraft("")}>
                  <Icon name="clear" />
                </button>
              ) : null}
              <span className={styles.tool}><Icon name="mic" /></span>
              <span className={styles.tool}><Icon name="lens" /></span>
            </span>
          </form>

          <ul className={styles.list} role="listbox" aria-label="Suggestions">
            {suggestions.map((row) => (
              <li key={`s-${row.key}`} className={styles.suggestion} role="option" aria-selected="false">
                <span className={styles.icon}><Sprite index={0} /></span>
                <span className={styles.text}>
                  {row.typed}
                  {row.rest ? <b>{row.rest}</b> : null}
                </span>
                <span className={styles.fill}><Sprite index={3} /></span>
              </li>
            ))}
            {recent.map((row) => (
              <li key={`h-${row.key}`} className={styles.suggestion} role="option" aria-selected="false">
                <span className={styles.icon}><Sprite index={1} /></span>
                <span className={`${styles.text} ${styles.history}`}>{row.text}</span>
                <span className={styles.fill}><Sprite index={3} /></span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.home}>
          <header className={styles.top}>
            <span className={styles.menu}><Icon name="menu" /></span>
            <span className={styles.account}>
              <span className={styles.menu}><Icon name="apps" /></span>
              <span className={styles.avatar}>J</span>
            </span>
          </header>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/parametric-interface/v4/apps/safari/google-logo.svg" alt="Google" width={160} height={54} />
          <button type="button" className={styles.box} onClick={() => setDraft("")}>
            <span className={styles.boxSearch}><Icon name="search" /></span>
            <span className={styles.boxSpacer} />
            <span className={styles.tool}><Icon name="mic" /></span>
            <span className={styles.tool}><Icon name="lens" /></span>
          </button>
          <footer className={styles.country}>United States</footer>
        </div>
      )}
      <SafariBar domain="google.com" />
    </section>
  );
}

export default memo(SafariState);
