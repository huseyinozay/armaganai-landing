// Armağan ailesi: dört renk, her birinin kendi mizacı.
// Değerler login ekranındaki (armagan-login.html) ayarlardan alınmıştır.

export type MascotColor = "green" | "red" | "purple" | "yellow";

export const MASCOT_COLORS: MascotColor[] = ["green", "red", "purple", "yellow"];

export interface Personality {
  /** Bakışın hedefe yetişme hızı (0–1, 60 fps'teki kare başı oran). */
  lag: number;
  /** Nefes alır gibi aşağı-yukarı salınımın genliği. */
  bob: number;
  /** Bakış yönüne doğru eğilme (derece). */
  tilt: number;
  /** İki göz kırpma arasındaki süre aralığı (ms). */
  blink: [number, number];
  /** Kırpma yerine göz kırpma (wink) olasılığı. */
  wink: number;
  /** Kırpmayla birlikte zıplama olasılığı. */
  hop: number;
  /** İmleci takip etme gücü. */
  gaze: number;
  /** Bakışın kendiliğinden kaydığı yön. */
  drift: number;
  /** Bir anlığına başka yere bakma olasılığı. */
  away: number;
}

export const PERSONALITY: Record<MascotColor, Personality> = {
  green: { lag: 0.2, bob: 1.0, tilt: 3.0, blink: [2600, 4200], wink: 0.16, hop: 0.1, gaze: 1.0, drift: 0, away: 0.1 },
  red: { lag: 0.34, bob: 1.55, tilt: 4.4, blink: [1700, 2900], wink: 0.05, hop: 0.26, gaze: 0.95, drift: 0.1, away: 0.06 },
  purple: { lag: 0.09, bob: 0.55, tilt: 1.7, blink: [3900, 6600], wink: 0.3, hop: 0.04, gaze: 0.85, drift: -0.14, away: 0.22 },
  yellow: { lag: 0.26, bob: 1.2, tilt: 3.7, blink: [2100, 3500], wink: 0.12, hop: 0.18, gaze: 1.0, drift: 0.06, away: 0.14 },
};

/** Göz kapağı ve hale renkleri. */
export const MASCOT_TINT: Record<MascotColor, { lid: string; glow: string }> = {
  green: { lid: "#80C276", glow: "#3BE85A" },
  red: { lid: "#C27683", glow: "#F5453F" },
  purple: { lid: "#A876C2", glow: "#B558F0" },
  yellow: { lid: "#C2AB76", glow: "#F0C63A" },
};

/** Gövde görselinin en/boy oranı (kaynak çizim 1268×1336 px). */
export const BODY_ASPECT = 1336 / 1268;

/** Gözlerin gövde üzerindeki yeri; kaynak çizime oran olarak. iw: irisin göz genişliğine oranı. */
export const EYES = [
  { x: 460 / 1268, y: 490 / 1336, w: 292 / 1268, h: 248 / 1336, iw: 136 / 292 },
  { x: 930 / 1268, y: 450 / 1336, w: 250 / 1268, h: 270 / 1336, iw: 128 / 250 },
];

/**
 * İrisin göz içinde gidebileceği en uzak mesafe, irisin kendi boyuna yüzde olarak.
 * Böylece her karede ölçüm yapmadan, yalnızca CSS yüzdesiyle kaydırabiliyoruz.
 */
export const EYE_TRAVEL = EYES.map((e) => {
  const iris = e.w * e.iw;
  const eyeH = e.h * BODY_ASPECT;
  return {
    x: (((e.w - iris) / 2) * 0.84 * 100) / iris,
    y: (((eyeH - iris) / 2) * 0.84 * 100) / iris,
  };
});
