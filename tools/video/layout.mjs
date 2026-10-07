// Where things sit in the 1920×1080 video. The phone recording (390×844 at 2×,
// 780×1688 pixels) is scaled to 860 px tall and centred near the top; the
// subtitles sit in the band below it, and captions to the right of it.

const PHONE_H = 860;
const PHONE_W = 398; // 780 × 860 / 1688, rounded to an even number

export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
  phone: { x: (1920 - PHONE_W) / 2, y: 28, w: PHONE_W, h: PHONE_H, radius: 48 },
  /** Recorded frames: 390×844 CSS pixels at 2×. */
  capture: { width: 390, height: 844, scale: 2 },
  /** Captions: left edge 56 px right of the phone, centred on the phone's middle. */
  caption: { x: (1920 + PHONE_W) / 2 + 56, centerY: 28 + PHONE_H / 2 },
};
