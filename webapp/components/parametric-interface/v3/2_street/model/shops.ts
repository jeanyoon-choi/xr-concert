// Euljiro back-alley trades: printers, lighting, tiles, hardware, and the
// beer halls between them. Names are invented; the grammar is the alley's.
export type Shop = {
  name: string;
  trade: string;
  phone: string;
  palette: SignPalette;
};

export type SignPalette = { background: string; ink: string; accent: string };

export const SIGN_PALETTES = {
  redOnWhite: { background: "#f4f2ec", ink: "#c8231f", accent: "#1d2a6b" },
  whiteOnBlue: { background: "#1b3a8c", ink: "#ffffff", accent: "#ffd400" },
  whiteOnRed: { background: "#d92323", ink: "#ffffff", accent: "#ffe14a" },
  blackOnYellow: { background: "#ffd21f", ink: "#141414", accent: "#c8231f" },
  whiteOnGreen: { background: "#137a45", ink: "#ffffff", accent: "#f6e05a" },
  blueOnWhite: { background: "#f6f6f2", ink: "#173c9c", accent: "#d92323" },
  yellowOnBlack: { background: "#161616", ink: "#ffd21f", accent: "#ffffff" },
  whiteOnOrange: { background: "#ee6a16", ink: "#ffffff", accent: "#20242e" },
} as const satisfies Record<string, SignPalette>;

const p = SIGN_PALETTES;

// Projecting lightboxes that face down the alley, nearest first.
export const projectingShops: readonly Shop[] = [
  { name: "대성인쇄", trade: "명함 · 전단 · 제본", phone: "2266-1374", palette: p.redOnWhite },
  { name: "삼우조명", trade: "LED · 조명기구", phone: "2273-0918", palette: p.whiteOnBlue },
  { name: "을지호프", trade: "생맥주 · 노가리", phone: "2265-4402", palette: p.blackOnYellow },
  { name: "신흥철물", trade: "공구 · 철물 · 자재", phone: "2267-5531", palette: p.whiteOnRed },
  { name: "제일카피", trade: "출력 · 복사 · 코팅", phone: "2279-8120", palette: p.blueOnWhite },
  { name: "동아타일", trade: "타일 · 위생도기", phone: "2264-2207", palette: p.whiteOnGreen },
  { name: "한일기획", trade: "스티커 · 현수막", phone: "2271-6639", palette: p.yellowOnBlack },
  { name: "보광사", trade: "도장 · 고무인", phone: "2268-3015", palette: p.whiteOnOrange },
  { name: "서울아크릴", trade: "아크릴 · 간판재료", phone: "2272-9904", palette: p.redOnWhite },
  { name: "청자다방", trade: "커피 · 쌍화차", phone: "2266-0021", palette: p.whiteOnRed },
  { name: "우리제본", trade: "무선 · 양장 · 링", phone: "2275-1148", palette: p.whiteOnBlue },
  { name: "평화전기", trade: "배선 · 차단기", phone: "2269-7350", palette: p.blackOnYellow },
  { name: "만선호프", trade: "생맥주 · 골뱅이", phone: "2277-4586", palette: p.whiteOnGreen },
  { name: "금강지업사", trade: "지류 · 박스", phone: "2263-8812", palette: p.blueOnWhite },
];

// Shopfront fascias along both walls, seen at an angle.
export const fasciaShops: readonly Shop[] = [
  { name: "대성인쇄", trade: "옵셋 · 마스터 · 디지털", phone: "2266-1374", palette: p.blueOnWhite },
  { name: "삼우조명", trade: "", phone: "2273-0918", palette: p.whiteOnBlue },
  { name: "을지 노가리", trade: "", phone: "", palette: p.yellowOnBlack },
  { name: "신흥철물", trade: "공구 · 볼트 · 너트", phone: "2267-5531", palette: p.whiteOnRed },
  { name: "제일카피", trade: "", phone: "2279-8120", palette: p.redOnWhite },
  { name: "동아타일", trade: "", phone: "2264-2207", palette: p.whiteOnGreen },
  { name: "한일기획", trade: "실사출력 전문", phone: "", palette: p.blackOnYellow },
  { name: "평화전기", trade: "", phone: "2269-7350", palette: p.whiteOnBlue },
  { name: "만선호프", trade: "", phone: "", palette: p.whiteOnOrange },
  { name: "금강지업사", trade: "", phone: "2263-8812", palette: p.blueOnWhite },
  { name: "우리제본", trade: "", phone: "2275-1148", palette: p.redOnWhite },
  { name: "보광사", trade: "", phone: "", palette: p.whiteOnGreen },
];
