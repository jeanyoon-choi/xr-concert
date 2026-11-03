// The homepage's own stories, in headline-slot order (0 = lead). The copy is
// invented, neutral news so no headline puns on the song. A slot's summary,
// read time and image never change; only its headline takes the lyric.

export type HomepageStory = {
  readonly id: string;
  readonly headline: string;
  readonly summary?: string;
  readonly readMinutes: number;
  /** Unsplash photo cropped to the slot, under public/images/parametric-v2-9. */
  readonly image?: string;
};

const IMAGE_ROOT = "/images/parametric-v2-9";

export const homepageStories: readonly HomepageStory[] = [
  {
    id: "lead",
    headline: "City Council Passes Budget That Restores Overnight Subway Service",
    summary: "The $112 billion plan keeps four lines running through the night and adds station agents, ending a standoff that stretched past two deadlines.",
    readMinutes: 6,
  },
  {
    id: "picture",
    image: `${IMAGE_ROOT}/picture.jpg`,
    headline: "After a Decade of Delays, the Harbor Freight Tunnel Opens to Trucks",
    summary: "Port officials say the crossing could take as many as 1,800 trucks a day off local streets in Brooklyn and Staten Island.",
    readMinutes: 4,
  },
  {
    id: "second",
    headline: "Schools Weigh Later Start Times as the Research Piles Up",
    readMinutes: 3,
  },
  {
    id: "third",
    headline: "Western Farmers Brace for a Second Dry Winter in a Row",
    readMinutes: 5,
  },
  {
    id: "feature",
    image: `${IMAGE_ROOT}/feature.jpg`,
    headline: "In Queens, a Small Ceramics Museum Fills Its Galleries",
    summary: "A new wing devoted to household pottery from the 19th century has tripled attendance since it opened in September.",
    readMinutes: 5,
  },
  {
    id: "tile-left",
    image: `${IMAGE_ROOT}/tile-left.jpg`,
    headline: "The Umbrellas That Survived a Week of Storms",
    readMinutes: 4,
  },
  {
    id: "tile-right",
    image: `${IMAGE_ROOT}/tile-right.jpg`,
    headline: "Six Weeknight Soups for the First Cold Week",
    readMinutes: 3,
  },
  {
    id: "row-left",
    image: `${IMAGE_ROOT}/row-left.jpg`,
    headline: "Library Branches Will Stay Open Until Midnight in a Pilot",
    readMinutes: 3,
  },
  {
    id: "row-right",
    image: `${IMAGE_ROOT}/row-right.jpg`,
    headline: "Ferry Ridership Hits a Record as Fares Hold Steady",
    readMinutes: 4,
  },
];

export const EDITIONS = ["U.S.", "International", "Canada", "Español", "中文"] as const;

export const SECTIONS = [
  "U.S.", "World", "Business", "Arts", "Lifestyle", "Opinion",
  "Video", "Shows", "Games", "Cooking", "Wirecutter", "The Athletic",
] as const;

export const TODAY = "Tuesday, November 3, 2026";

// Headline case as the homepage sets it: minor words lowercase unless first.
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "if", "in", "nor",
  "of", "off", "on", "or", "the", "to", "vs.",
]);

export function headlineCase(word: string, isFirst: boolean) {
  const bare = word.toLowerCase().replace(/[^a-z.']/g, "");
  if (!isFirst && MINOR_WORDS.has(bare)) return word.toLowerCase();

  // Capitalise the first letter, skipping leading quotes or apostrophes.
  return word.replace(/[A-Za-z]/, (letter) => letter.toUpperCase());
}
