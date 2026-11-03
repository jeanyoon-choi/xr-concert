// Ported from experiments-jyc SCC components/mobile/clone/14/screen/icons.tsx, whose
// outline set was redrawn against the YouTube App Store iPhone frames (watch page,
// action pills, comments card). Only the glyphs the live watch page uses are kept;
// "emoji" follows the same 1.7 pt outline grammar for the live-chat composer.

import type { ReactNode } from "react";

const line = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const thumb =
  "M8.4 20H5.2A1.7 1.7 0 0 1 3.5 18.3v-6.6A1.7 1.7 0 0 1 5.2 10h3.2m0 10V10l3.6-6.3c.4-.7 1.2-1 1.9-.8 1 .3 1.6 1.3 1.4 2.3L14.6 9h4.2a2.2 2.2 0 0 1 2.1 2.8l-1.7 6.1A2.9 2.9 0 0 1 16.4 20h-8Z";

const paths = {
  like: <path {...line} d={thumb} />,
  "like-fill": <path fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" d={thumb} />,
  dislike: (
    <g transform="rotate(180 12 12)">
      <path {...line} d={thumb} />
    </g>
  ),
  share: <path {...line} d="M14.2 4.6 21 11.3l-6.8 6.6v-3.8c-5 0-8.3 1.5-11 5.3 1-5.3 4.1-9.6 11-10.5z" />,
  clip: (
    <>
      <circle {...line} cx="6.5" cy="6.5" r="2.7" />
      <circle {...line} cx="6.5" cy="17.5" r="2.7" />
      <path {...line} d="M8.6 8.2 20 18M8.6 15.8 20 6" />
    </>
  ),
  save: <path {...line} d="M6.2 3.8h11.6v16.6L12 16.4l-5.8 4z" />,
  "save-fill": <path fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" d="M6.2 3.8h11.6v16.6L12 16.4l-5.8 4z" />,
  "chevron-down": <path {...line} strokeWidth="2" d="m5.5 9 6.5 6.5L18.5 9" />,
  kebab: (
    <>
      <circle fill="currentColor" cx="12" cy="5.5" r="1.6" />
      <circle fill="currentColor" cx="12" cy="12" r="1.6" />
      <circle fill="currentColor" cx="12" cy="18.5" r="1.6" />
    </>
  ),
  close: <path {...line} strokeWidth="1.9" d="m5.5 5.5 13 13m0-13-13 13" />,
  send: <path {...line} d="m4 12 16-7.5-5.5 16-3-6.5zm7.5 2 3-3" />,
  emoji: (
    <>
      <circle {...line} cx="12" cy="12" r="8.8" />
      <path {...line} d="M8.3 14.2c.9 1.4 2.2 2.1 3.7 2.1s2.8-.7 3.7-2.1" />
      <circle fill="currentColor" cx="9" cy="10" r="1.1" />
      <circle fill="currentColor" cx="15" cy="10" r="1.1" />
    </>
  ),
  "chevron-left": <path {...line} strokeWidth="2" d="M15 5.5 8.5 12l6.5 6.5" />,
  cast: (
    <>
      <path {...line} d="M3.5 9V6.5c0-1 .8-1.8 1.8-1.8h13.4c1 0 1.8.8 1.8 1.8v11c0 1-.8 1.8-1.8 1.8h-5.2" />
      <path {...line} d="M3.5 12.4a7 7 0 0 1 6.9 6.9M3.5 15.8a3.5 3.5 0 0 1 3.4 3.5" />
      <circle fill="currentColor" cx="3.9" cy="19.1" r=".9" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}
