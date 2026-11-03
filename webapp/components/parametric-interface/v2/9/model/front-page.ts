// The ordinary front page the lyric lands on. Each story owns one headline
// slot; slot 0 is the banner. Copy is invented, neutral city news so the
// headlines carry no pun on the song.

export type FrontPageStory = {
  readonly headline: string;
  readonly byline: string;
  readonly dateline: string;
  readonly paragraphs: readonly string[];
  readonly jump: string;
};

export const EDITION = {
  volume: "VOL. CLXXVI . . . No. 61,214",
  copyright: "© 2026 The New York Times Company",
  date: "NEW YORK, TUESDAY, NOVEMBER 3, 2026",
  price: "$4.00",
  weather: [
    "Today, clouds, a shower late, high 54. Tonight, rain, low 46. Tomorrow, clearing, breezy, high 52.",
    "Weather map, Page A22.",
  ],
} as const;

export const frontPageStories: readonly FrontPageStory[] = [
  {
    headline: "Council Passes Budget That Keeps Subways Running Through the Night",
    byline: "By HANA LEE and MARCUS WEBB",
    dateline: "",
    paragraphs: [
      "The City Council approved a $112 billion budget late Monday that restores overnight service on four subway lines and adds two hundred station agents, ending a standoff that had stretched past two deadlines and drawn protests from shift workers across the outer boroughs.",
      "The vote, 41 to 9, came after the mayor agreed to delay a planned cut to library hours and to fund a pilot that would keep three branches open until midnight. Council members said the overnight trains had become the issue their constituents raised most often.",
      "“People who clean the offices, who cook, who work the hospital floors, they go home at two in the morning,” said Councilwoman Teresa Alvarado, who represents parts of the Bronx. “For them this is not a line item.”",
      "Transit officials had warned that running the trains overnight would cost about $340 million a year in labor and maintenance. Under the agreement, the state will cover a third of that for the first two years, after which the arrangement will be reviewed.",
      "Budget analysts noted that the deal relies on revenue projections that assume steady tourism through next summer. Several members who voted against it said the city was postponing harder choices about pensions and debt service.",
      "The budget also sets aside money for sidewalk repairs in neighborhoods that flooded last fall, and for a modest expansion of the program that pays for air-conditioning units in apartments of older residents.",
    ],
    jump: "Continued on Page A16",
  },
  {
    headline: "After a Decade of Delays, Harbor Freight Tunnel Opens to Trucks",
    byline: "By ELENA RUIZ",
    dateline: "BAYONNE, N.J. —",
    paragraphs: [
      "The first trucks rolled through the new harbor freight tunnel shortly after dawn on Monday, ten years after construction began and nearly four years later than planners had promised.",
      "Port officials said the tunnel would take as many as 1,800 trucks a day off local streets in Brooklyn and Staten Island, where residents have long complained about diesel exhaust and cracked pavement.",
      "The project ran $2.3 billion over its original budget, in part because engineers found unstable soil beneath the riverbed and had to redesign two ventilation shafts.",
      "Drivers who made the first trips said the crossing saved them close to forty minutes. “It is the first time in years I have been early for anything,” said Luis Ortega, who hauls produce from the port to markets in the Bronx.",
      "Tolls will be waived for the first month while the authority studies traffic patterns.",
    ],
    jump: "Continued on Page A18",
  },
  {
    headline: "Schools Weigh Later Start Times as Research Piles Up",
    byline: "By SORA KIM",
    dateline: "",
    paragraphs: [
      "Education officials will hold public hearings this month on a proposal to move the start of the high school day to 8:45 a.m., a change that supporters say would improve attendance and grades.",
      "Studies in several states have found that teenagers who start school later sleep more and are less likely to miss first-period classes. Opponents worry about bus schedules, after-school jobs and sports.",
      "A decision is expected in January.",
    ],
    jump: "Continued on Page A20",
  },
  {
    headline: "A Quiet Museum in Queens Fills Its Galleries",
    byline: "By JONAH PRICE",
    dateline: "",
    paragraphs: [
      "On a weekday afternoon the line outside a small ceramics museum in Flushing stretched to the corner, drawn by a new wing devoted to household pottery from the 19th century.",
      "The museum’s director said attendance had tripled since the wing opened in September, much of it from families who had never visited before.",
    ],
    jump: "Arts, Page C1",
  },
  {
    headline: "Rain Is Expected to Linger Through the Weekend",
    byline: "By NADIA FORD",
    dateline: "",
    paragraphs: [
      "Forecasters said a slow-moving system would bring steady rain to the region through Sunday, with the heaviest totals along the coast.",
      "The city’s emergency office advised drivers to avoid low-lying roads near the waterfront.",
    ],
    jump: "Page A22",
  },
  {
    headline: "Western Farmers Brace for a Second Dry Winter",
    byline: "By CALEB MORENO",
    dateline: "FRESNO, Calif. —",
    paragraphs: [
      "Reservoirs across California’s Central Valley stood at less than half their usual levels this week, and growers said they were already deciding which fields to leave unplanted in the spring.",
      "State water managers said they would announce allocations next month.",
    ],
    jump: "Business, Page B3",
  },
];

// The newspaper's headline case: minor words stay lowercase unless first.
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
