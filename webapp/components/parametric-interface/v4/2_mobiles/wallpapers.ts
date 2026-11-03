// Each phone's wallpaper: photographs a person would set — couples, rain at
// night, dying roses — one per phone. CC0 / CC BY photographs from Flickr via
// Openverse, cropped to 1170 × 2532; credits in
// public/parametric-interface/v4/wallpapers/attribution.json (CC BY ones
// must be credited). As iOS does, a light shade at the top and bottom keeps
// the white clock and the notifications legible.

const PHOTOS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] as const;

const LEGIBILITY = "linear-gradient(180deg, rgb(0 0 0 / 24%) 0%, rgb(0 0 0 / 0%) 34%, rgb(0 0 0 / 0%) 62%, rgb(0 0 0 / 26%) 100%)";

export function wallpaperOf(seat: number) {
  const photo = PHOTOS[(seat * 5) % PHOTOS.length]!;
  return { image: `${LEGIBILITY}, url(/parametric-interface/v4/wallpapers/${photo}.jpg)` };
}
