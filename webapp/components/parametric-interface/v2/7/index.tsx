"use client";

import type { ParametricSong, TimedLyricLine } from "../model/song";
import { SongPlayback } from "../playback";
import { LYRIC_LEAD_MS, useLyricCue } from "../timeline/use-lyric-cue";
import { SLACK_ICONS, type SlackIconName } from "./model/icons";
import {
  channels,
  CURRENT_CHANNEL,
  directMessages,
  ME,
  MEMBER_COUNT,
  people,
  POSTER,
  WORKSPACE_INITIALS,
  WORKSPACE_NAME,
  type Person,
} from "./model/workspace";
import styles from "./slack.module.css";

// The Slack desktop client (aubergine theme, dark), rebuilt from computed
// styles and served SVG glyphs measured on app.slack.com, drawn at the
// client's own 1:1 CSS size and reflowing with the window as Slack does.
// The workspace is invented. The open channel's message list is the song:
// each sung line is posted by one member at its onset, its words appearing
// as they are sung; earlier lines stay above as the channel history; in the
// gap before the next line the composer shows Slack's own typing indicator;
// the member's DM carries Slack's unread badge, counting the lines posted.
// Everything derives from the audio clock, so a seek rebuilds the screen.

// The song clock starts at 9:30 PM; message times read from that baseline.
const CLOCK_BASE_MINUTES = 21 * 60 + 30;
// Slack shows "is typing" only while the next message is being written.
const TYPING_WINDOW_MS = 2_500;
// Enough history to fill the list at any height; older lines are scrolled off.
const MAX_HISTORY = 40;

function formatTime(songMs: number) {
  const minutes = CLOCK_BASE_MINUTES + Math.floor(songMs / 60_000);
  const hours = Math.floor(minutes / 60) % 24;
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes % 60).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

type Posted = { readonly line: TimedLyricLine; readonly index: number; readonly text: string };

function useChannelSong() {
  const { cueIndex, currentTimeMs, hasStarted, isPlaying, song } = useLyricCue();
  const clockMs = currentTimeMs + LYRIC_LEAD_MS;
  const firstStart = song.lyrics[0]?.startMs ?? 0;
  const begun = hasStarted && clockMs >= firstStart;
  const postedCount = begun ? cueIndex + 1 : 0;

  const posted: Posted[] = [];
  for (let index = Math.max(0, postedCount - MAX_HISTORY); index < postedCount; index += 1) {
    const line = song.lyrics[index]!;
    const words = index === cueIndex ? line.words.filter((word) => word.startMs <= clockMs) : line.words;
    posted.push({ line, index, text: words.map((word) => word.text).join(" ") });
  }

  // Typing shows in the gap before the next line: once the current line's
  // last word is out, or before the first line.
  const current = begun ? song.lyrics[cueIndex] : undefined;
  const next = begun ? song.lyrics[cueIndex + 1] : song.lyrics[0];
  const currentDone = !current || clockMs >= current.words.at(-1)!.startMs + 400;
  const typing =
    hasStarted && isPlaying && next !== undefined && currentDone && next.startMs - clockMs <= TYPING_WINDOW_MS;

  return { posted, postedCount, typing };
}

function Icon({ name, size = 20, className }: { name: SlackIconName; size?: number; className?: string }) {
  const icon = SLACK_ICONS[name];
  return (
    <svg aria-hidden="true" className={className} height={size} viewBox={icon.viewBox} width={size}>
      {icon.paths.map((path, index) =>
        "stroke" in path && path.stroke ? (
          <path d={path.d} fill="none" key={index} stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} />
        ) : (
          <path
            clipRule={path.evenOdd ? "evenodd" : undefined}
            d={path.d}
            fill="currentColor"
            fillRule={path.evenOdd ? "evenodd" : undefined}
            key={index}
          />
        ),
      )}
    </svg>
  );
}

function Avatar({ person, size }: { person: Person; size: number }) {
  return (
    <span
      aria-hidden="true"
      className={styles.avatar}
      style={{ width: size, height: size, background: person.color, fontSize: Math.round(size * 0.38) }}
    >
      {person.initials}
    </span>
  );
}

export default function ParametricInterfaceSeven({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <SlackClient />
    </SongPlayback>
  );
}

function SlackClient() {
  const { posted, postedCount, typing } = useChannelSong();

  return (
    <main className={styles.page}>
      <div className={styles.app}>
        <TopNav />
        <Rail />
        <div className={styles.workspace}>
          <Sidebar unread={postedCount} />
          <section aria-label={`Channel ${CURRENT_CHANNEL}`} className={styles.primary}>
            <ChannelHeader />
            <MessageList posted={posted} />
            <Composer typing={typing} />
          </section>
        </div>
      </div>
    </main>
  );
}

function TopNav() {
  return (
    <header className={styles.topNav}>
      <div className={styles.history}>
        <Icon name="back" />
        <Icon className={styles.dim} name="forward" />
        <Icon name="history" />
      </div>
      <div className={styles.searchBar}>
        <Icon name="search" size={15} />
        <span>Search {WORKSPACE_NAME}</span>
      </div>
      <Icon className={styles.help} name="help" />
    </header>
  );
}

function RailButton({ icon, label, active }: { icon: SlackIconName; label: string; active?: boolean }) {
  return (
    <div className={styles.railButton} data-active={active || undefined}>
      <span className={styles.railIcon}><Icon name={icon} /></span>
      <span className={styles.railLabel}>{label}</span>
    </div>
  );
}

function Rail() {
  return (
    <nav aria-label="Workspace" className={styles.rail}>
      <span className={styles.workspaceIcon}>{WORKSPACE_INITIALS}</span>
      <RailButton active icon="home" label="Home" />
      <RailButton icon="dms" label="DMs" />
      <RailButton icon="activity" label="Activity" />
      <RailButton icon="files" label="Files" />
      <div className={styles.railMore}>
        <span className={styles.railIcon}>
          <svg aria-hidden="true" height={20} viewBox="0 0 20 20" width={20}>
            <circle cx={4} cy={10} fill="currentColor" r={1.6} />
            <circle cx={10} cy={10} fill="currentColor" r={1.6} />
            <circle cx={16} cy={10} fill="currentColor" r={1.6} />
          </svg>
        </span>
        <span className={styles.railLabel}>More</span>
      </div>
      <div className={styles.railBottom}>
        <span className={styles.railAdd}>
          <svg aria-hidden="true" height={16} viewBox="0 0 20 20" width={16}>
            <path d={SLACK_ICONS.plus.paths[0]!.d} fill="currentColor" />
          </svg>
        </span>
        <span className={styles.railAvatar}>
          <Avatar person={ME} size={36} />
          <i className={styles.presence} />
        </span>
      </div>
    </nav>
  );
}

function Sidebar({ unread }: { unread: number }) {
  return (
    <aside aria-label="Channels and direct messages" className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <span className={styles.teamName}>{WORKSPACE_NAME}</span>
        <Icon className={styles.teamCaret} name="caretDown" size={18} />
        <span className={styles.headerSpacer} />
        <Icon name="settings" />
        <Icon name="compose" />
      </div>

      <div className={styles.sidebarScroll}>
        <div className={styles.findBox}>
          <Icon name="find" size={16} />
          <span>Find a conversation…</span>
        </div>

        <div className={styles.item}><Icon name="huddles" size={16} /><span>Huddles</span></div>
        <div className={styles.item}><Icon name="send" size={16} /><span>Drafts &amp; sent</span></div>
        <div className={styles.item}><Icon name="directories" size={16} /><span>Directories</span></div>
        <div className={styles.rule} />

        <div className={styles.sectionHeading}><Icon name="caretDown" size={16} /><span>Channels</span></div>
        {channels.map((channel) => (
          <div
            className={styles.channel}
            data-selected={channel.selected || undefined}
            data-unread={channel.unread || undefined}
            key={channel.id}
          >
            <Icon name="hash" size={16} />
            <span>{channel.name}</span>
          </div>
        ))}

        <div className={styles.sectionHeading}><Icon name="caretDown" size={16} /><span>Direct messages</span></div>
        {directMessages.map((person) => {
          const count = person.id === POSTER.id ? unread : 0;
          return (
            <div className={styles.channel} data-unread={count ? true : undefined} key={person.id}>
              <Avatar person={person} size={20} />
              <span>{person.name}</span>
              {count ? <span className={styles.badge}>{count}</span> : null}
            </div>
          );
        })}

        <div className={styles.sectionHeading}><Icon name="caretDown" size={16} /><span>Apps</span></div>
        <div className={styles.channel}><Icon name="apps" size={16} /><span>Workflow Builder</span></div>
      </div>
    </aside>
  );
}

function ChannelHeader() {
  const stack = [people.mira, people.jonas, people.theo];

  return (
    <>
      <header className={styles.channelHeader}>
        <Icon className={styles.headerStar} name="star" />
        <span className={styles.channelTitle}>
          <Icon name="hash" size={18} />
          {CURRENT_CHANNEL}
          <Icon name="caretDown" size={14} />
        </span>
        <span className={styles.headerSpacer} />
        <span className={styles.memberStack}>
          {stack.map((person) => <Avatar key={person.id} person={person} size={20} />)}
          <span>{MEMBER_COUNT}</span>
        </span>
        <span className={styles.headerTool}>
          <Icon name="headphones" />
          <Icon name="caretSmall" />
        </span>
        <span className={styles.headerTool}><Icon name="bell" /></span>
        <span className={styles.headerTool}><Icon name="search" /></span>
        <span className={styles.headerTool}><Icon name="more" size={16} /></span>
      </header>
      <nav aria-label="Channel views" className={styles.tabs}>
        <span className={styles.tab} data-active>
          <svg aria-hidden="true" height={16} viewBox="0 0 20 20" width={16}>
            <path d={SLACK_ICONS.dms.paths[0]!.d} fill="currentColor" fillRule="evenodd" />
          </svg>
          Messages
        </span>
        <span className={styles.tab}><Icon name="files" size={16} />Files</span>
        <span className={styles.tab}><Icon name="plus" size={16} /></span>
      </nav>
    </>
  );
}

function MessageRow({ entry }: { entry: Posted }) {
  // Slack groups one member's consecutive messages under a single header.
  const continuation = entry.index > 0;

  return (
    <article className={styles.message} data-continuation={continuation || undefined}>
      <div className={styles.gutter}>
        {continuation ? null : <Avatar person={POSTER} size={36} />}
      </div>
      <div className={styles.messageBody}>
        {continuation ? null : (
          <p className={styles.messageMeta}>
            <span className={styles.sender}>{POSTER.name}</span>
            <span className={styles.timestamp}>{formatTime(entry.line.startMs)}</span>
          </p>
        )}
        <p className={styles.text}>{entry.text}</p>
      </div>
    </article>
  );
}

function MessageList({ posted }: { posted: readonly Posted[] }) {
  return (
    <div className={styles.messageList}>
      <div className={styles.messageStack}>
        <div className={styles.dayDivider}>
          <span className={styles.dayPill}>
            Today
            <Icon name="caretDown" size={13} />
          </span>
        </div>
        {posted.map((entry) => <MessageRow entry={entry} key={entry.line.id} />)}
      </div>
    </div>
  );
}

const TOOLBAR: readonly (SlackIconName | "|")[] = [
  "bold", "italic", "underline", "strike", "|", "link", "orderedList", "bulletList", "|", "blockquote", "code", "codeBlock", "divider",
];

function Composer({ typing }: { typing: boolean }) {
  return (
    <div className={styles.composerWrap}>
      <div className={styles.composer}>
        <div className={styles.toolbar}>
          {TOOLBAR.map((item, index) =>
            item === "|" ? <i className={styles.toolbarRule} key={index} /> : <span className={styles.toolbarButton} key={index}><Icon name={item} size={18} /></span>,
          )}
        </div>
        <p className={styles.placeholder}>Message #{CURRENT_CHANNEL}</p>
        <div className={styles.composerFooter}>
          <span className={styles.composerCircle}><Icon name="plus" size={16} /></span>
          <span className={styles.composerAa}>Aa</span>
          <span className={styles.toolbarButton}>
            <svg aria-hidden="true" height={18} viewBox="0 0 20 20" width={18}>
              <circle cx={10} cy={10} fill="none" r={7.75} stroke="currentColor" strokeWidth={1.5} />
              <circle cx={7.5} cy={8.5} fill="currentColor" r={1} />
              <circle cx={12.5} cy={8.5} fill="currentColor" r={1} />
              <path d="M6.9 12c.7 1 1.8 1.6 3.1 1.6s2.4-.6 3.1-1.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          </span>
          <span className={styles.toolbarButton}>
            <svg aria-hidden="true" height={18} viewBox="0 0 20 20" width={18}>
              <circle cx={10} cy={10} fill="none" r={3} stroke="currentColor" strokeWidth={1.5} />
              <path d="M13 7v4.25a1.75 1.75 0 0 0 3.5 0V10a6.5 6.5 0 1 0-2.6 5.2" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          </span>
          <i className={styles.toolbarRule} />
          <span className={styles.toolbarButton}>
            <svg aria-hidden="true" height={18} viewBox="0 0 20 20" width={18}>
              <rect fill="none" height={10} rx={2} stroke="currentColor" strokeWidth={1.5} width={11} x={2} y={5} />
              <path d="m13 9 4.5-2.5v7L13 11" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
          </span>
          <span className={styles.toolbarButton}>
            <svg aria-hidden="true" height={18} viewBox="0 0 20 20" width={18}>
              <rect fill="none" height={9} rx={3} stroke="currentColor" strokeWidth={1.5} width={6} x={7} y={2.5} />
              <path d="M4.5 9.5a5.5 5.5 0 0 0 11 0M10 15v2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          </span>
          <i className={styles.toolbarRule} />
          <span className={styles.toolbarButton}>
            <svg aria-hidden="true" height={18} viewBox="0 0 20 20" width={18}>
              <rect fill="none" height={14} rx={2.5} stroke="currentColor" strokeWidth={1.5} width={14} x={3} y={3} />
              <path d="m11.5 6.5-3 7" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          </span>
          <span className={styles.headerSpacer} />
          <span className={styles.send}>
            <svg aria-hidden="true" height={16} viewBox="0 0 20 20" width={16}>
              <path d={SLACK_ICONS.send.paths[0]!.d} fill="currentColor" />
            </svg>
            <i />
            <Icon name="caretDown" size={16} />
          </span>
        </div>
      </div>
      <div className={styles.composerStatus}>
        <p className={styles.typing}>{typing ? <><b>{POSTER.name}</b> is typing…</> : null}</p>
        <p className={styles.hint}><b>Shift + Return</b> to add a new line</p>
      </div>
    </div>
  );
}
