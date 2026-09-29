// Gerçek app karelerinin (npm run screens) sunucu tarafı yardımcıları.
import { getImage } from "astro:assets";
import manifest from "./manifest.json";

export type Theme = "light" | "dark";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface FrameSources {
  avif: string;
  webp: string;
  width: number;
  height: number;
}

export const screenFiles = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/landing/app/*/*.webp",
  { eager: true },
);

/** Karelerdeki demo tebligatın tebliğ ve son gün tarihleri. */
export const facts = {
  served: new Date(manifest.facts.served),
  deadline: new Date(manifest.facts.deadline),
};

const frames = manifest.frames as Record<string, { targets: Record<string, Rect | null> }>;

export function target(frame: string, name: string): Rect | null {
  return frames[frame]?.targets?.[name] ?? null;
}

export function screenImage(name: string, theme: Theme): ImageMetadata {
  const file = screenFiles[`/src/assets/landing/app/${theme}/${name}.webp`];
  if (!file) throw new Error(`Ekran karesi bulunamadı: ${theme}/${name} (npm run screens)`);
  return file.default;
}

const cache = new Map<string, Promise<FrameSources>>();

/** Bir kare için AVIF ve WebP srcset'leri (kamera yakınlaşmasına yetecek genişlikte). */
export function frameSources(id: string, theme: Theme): Promise<FrameSources> {
  const key = `${theme}/${id}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      (async () => {
        const meta = screenImage(id, theme);
        const srcset = async (format: "avif" | "webp") => {
          const variants = await Promise.all(
            [1100, 2200].map((width) =>
              getImage({ src: meta, width, format, quality: format === "avif" ? 52 : 72 }).then(
                (img) => `${img.src} ${width}w`,
              ),
            ),
          );
          return variants.join(", ");
        };
        const [avif, webp] = await Promise.all([srcset("avif"), srcset("webp")]);
        return { avif, webp, width: meta.width, height: meta.height };
      })(),
    );
  }
  return cache.get(key)!;
}
