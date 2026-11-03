// The article's own copy: invented, neutral news written for this study, set
// in the structure of a nytimes.com politics article. No text or photo is
// taken from a real article.

export const SECTION = "Politics";

export const SECTION_LINKS = [
  { label: "Polls", dropdown: true },
  { label: "Understand Our Election Results" },
  { label: "The Race for Congress" },
  { label: "Early Vote Tracker" },
  { label: "What Time Do Polls Close?" },
  { label: "Primary Results", dropdown: true },
] as const;

export const ARTICLE = {
  headline: "Counties Lease Freight Trucks to Move Voting Machines Before Tuesday",
  summary:
    "With polling places added in a dozen states, election offices turned to commercial haulers to get equipment where it needs to be by the morning of the vote.",
  listen: "Listen · 4:00 min",
  // Unsplash photo-1700716465891-9e5e9f501d7d (free license, no people),
  // cropped to 3:2 in public/images/parametric-v2-9/picture.jpg.
  image: "/images/parametric-v2-9/picture.jpg",
  imageAlt: "Shipping containers and a truck trailer at a freight yard under a blue sky.",
  caption: "Equipment waiting to be loaded at a distribution yard in Newark on Monday.",
  credit: "Via Unsplash",
  byline: ["Hana Lee", "Marcus Webb"],
  dateline: "Reporting from Newark, N.J.",
  date: "Nov. 2, 2026",
  paragraphs: [
    "The trucks began arriving at the county yard before sunrise on Monday, backing up one after another to a loading dock stacked with sealed cases of ballot scanners.",
    "Election officials in at least a dozen states have added polling places this year, and many found that their own vans could not carry the extra equipment in time. Several counties signed short leases with commercial freight companies instead.",
    "“We needed to move everything in one day, and we needed to know where every case was the whole time,” said Teresa Alvarado, the county’s director of elections. Each case carries a numbered seal, and two staff members ride with every load.",
    "The arrangement is not new, but it has grown. Officials said the leases cost less than buying additional vehicles that would sit unused for most of the year.",
  ],
} as const;
