import {
  Black_Han_Sans,
  Do_Hyeon,
  Gasoek_One,
  Gothic_A1,
  Hahmlet,
  IBM_Plex_Sans_KR,
  Jua,
  Nanum_Gothic,
  Nanum_Myeongjo,
  Noto_Sans_KR,
  Noto_Serif_KR,
  Sunflower,
} from "next/font/google";

// Sign lettering. A Daechi-dong street is a crowd of sign makers' choices:
// heavy and condensed gothics for academies, rounded faces for primary-school
// classes, myeongjo serifs for Korean and essay academies, a black display face
// for banners. All self-hosted by next/font, so the venue needs no network.
// Korean glyphs arrive in unicode-range slices, hence no preload.
const blackHanSans = Black_Han_Sans({ weight: "400", preload: false, display: "block" });
const doHyeon = Do_Hyeon({ weight: "400", preload: false, display: "block" });
const jua = Jua({ weight: "400", preload: false, display: "block" });
const gasoekOne = Gasoek_One({ weight: "400", preload: false, display: "block" });
const gothicA1 = Gothic_A1({ weight: "900", preload: false, display: "block" });
const notoSans = Noto_Sans_KR({ weight: ["700", "900"], preload: false, display: "block" });
const nanumGothic = Nanum_Gothic({ weight: "800", preload: false, display: "block" });
const nanumMyeongjo = Nanum_Myeongjo({ weight: "800", preload: false, display: "block" });
const notoSerif = Noto_Serif_KR({ weight: "900", preload: false, display: "block" });
const hahmlet = Hahmlet({ weight: "800", preload: false, display: "block" });
// Sunflower ships no subsets, so it takes no preload option.
const sunflower = Sunflower({ weight: "700", display: "block" });
const plexSans = IBM_Plex_Sans_KR({ weight: "700", preload: false, display: "block" });

const FALLBACK = '"Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

export type SignFace = { family: string; weight: number };

const face = (font: { style: { fontFamily: string } }, weight: number): SignFace => ({
  family: `${font.style.fontFamily}, ${FALLBACK}`,
  weight,
});

// Ordered so that neighbouring indices differ in kind (gothic, serif, rounded, display).
export const SIGN_FACES: readonly SignFace[] = [
  face(blackHanSans, 400),
  face(nanumMyeongjo, 800),
  face(jua, 400),
  face(doHyeon, 400),
  face(notoSerif, 900),
  face(gothicA1, 900),
  face(sunflower, 700),
  face(gasoekOne, 400),
  face(hahmlet, 800),
  face(nanumGothic, 800),
  face(plexSans, 700),
  face(notoSans, 900),
];

export const DISPLAY_FONT = SIGN_FACES[0]!.family;
export const TEXT_FONT = `${notoSans.style.fontFamily}, ${FALLBACK}`;

// Canvas text does not wait for web fonts: load every slice the signs will use first.
export async function loadSignFonts(sample: string) {
  const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'’,.-·:★◆▶♥";
  const glyphs = [...new Set(sample + latin)].join("");
  await Promise.all([
    ...SIGN_FACES.map((sign) => document.fonts.load(`${sign.weight} 64px ${sign.family}`, glyphs)),
    document.fonts.load(`700 64px ${TEXT_FONT}`, glyphs),
  ]);
}
